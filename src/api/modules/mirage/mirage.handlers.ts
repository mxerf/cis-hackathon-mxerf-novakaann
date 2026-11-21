import { analyzeCallChunk, replyAsCoverSupport } from "../../infra/ai-gateway.ts";
import { sendTelegramAlert } from "../../infra/telegram-alert.ts";
import type { PublicResolverOptions } from "../../trpc.ts";
import {
  advanceScriptedChunk,
  appendSupportMessage,
  applyAiDetection,
  endCall,
  ingestTranscriptChunk,
  isCallContextActive,
  normalizeRecipientValue,
  resetState,
  setLocale,
  startCall,
  submitTransfer,
  updateDetectionSignals,
} from "./mirage.core.ts";
import { getPresetById } from "./mirage.presets.ts";
import type {
  IngestTranscriptSchemaInput,
  NextChunkSchemaInput,
  SendSupportSchemaInput,
  SetLocaleSchemaInput,
  StartCallSchemaInput,
  SubmitTransferSchemaInput,
  UpdateSignalsSchemaInput,
} from "./mirage.schemas.ts";

export const PRE_TRANSFER_AI_WAIT_MS = 3500;
const DOUBLE_TAP_DEDUP_WINDOW_MS = 2500;

export function snapshot({ ctx }: PublicResolverOptions) {
  return ctx.store.getSnapshot();
}

export function startCallSession({
  ctx,
  input,
}: PublicResolverOptions & { input: StartCallSchemaInput }) {
  const next = startCall(ctx.store.getState(), input);
  return ctx.store.setState(next);
}

export function endCallSession({ ctx }: PublicResolverOptions) {
  const next = endCall(ctx.store.getState());
  return ctx.store.setState(next);
}

export function patchDetectionSignals({
  ctx,
  input,
}: PublicResolverOptions & { input: UpdateSignalsSchemaInput }) {
  const next = updateDetectionSignals(ctx.store.getState(), input);
  return ctx.store.setState(next);
}

export async function ingestCallTranscript({
  ctx,
  input,
}: PublicResolverOptions & { input: IngestTranscriptSchemaInput }) {
  const { speaker, text, analyzeWithAi, waitForAi } = input;
  let current = ctx.store.getState();
  const historyBeforeChunk = current.call.transcript.map(
    (entry) => `${entry.speaker}: ${entry.text}`,
  );

  if (!current.call.active) {
    current = startCall(current);
  }

  const shouldRunAi =
    speaker === "caller" &&
    analyzeWithAi &&
    input.coercionScoreDelta === undefined &&
    input.flaggedTactics === undefined;

  // Phase 1 (<1 ms): immediately commit transcript and run deterministic Algorithm Level
  const phase1 = ingestTranscriptChunk(current, {
    speaker,
    text,
    coercionScoreDelta: input.coercionScoreDelta ?? 0,
    flaggedTactics: input.flaggedTactics ?? [],
  });

  const savedPhase1 = ctx.store.setState(phase1);
  const startSessionId = savedPhase1.state.sessionId;

  if (!shouldRunAi) {
    return {
      ...savedPhase1,
      aiPending: false,
    };
  }

  // Phase 2 (background): run AI Semantic Level without blocking Algorithm Level / Mirage engagement
  const aiTask = analyzeCallChunk(text, {
    previousTranscript: historyBeforeChunk,
    screenSharing: savedPhase1.state.call.detection.signals.screenSharing,
  }).then((analysis) => {
    const latest = ctx.store.getState();
    if (latest.sessionId !== startSessionId) {
      return;
    }
    const merged = applyAiDetection(latest, {
      aiScore: analysis.aiProbability,
      tactics: analysis.tactics,
      reasoning: analysis.summary,
      source: analysis.source,
    });
    ctx.store.setState(merged);
  });

  ctx.store.trackAiTask(startSessionId, aiTask);

  if (waitForAi) {
    await aiTask;
    return {
      ...ctx.store.getSnapshot(),
      aiPending: false,
    };
  }

  return {
    ...savedPhase1,
    aiPending: true,
  };
}

export async function advanceCallScript({
  ctx,
  input,
}: PublicResolverOptions & { input: NextChunkSchemaInput }) {
  const initial = ctx.store.getState();
  const analyzeWithAi = input?.analyzeWithAi ?? false;
  const waitForAi = input?.waitForAi ?? false;
  const preset = getPresetById(initial.presetId);
  const upcomingChunk = preset.scriptedChunks[initial.scriptedChunkIndex];

  if (!upcomingChunk) {
    return { ...ctx.store.getSnapshot(), exhausted: true, aiPending: false };
  }

  const historyBeforeChunk = initial.call.transcript.map(
    (entry) => `${entry.speaker}: ${entry.text}`,
  );
  const shouldRunAi = analyzeWithAi && upcomingChunk.speaker === "caller";

  // Phase 1 (<1 ms): immediately advance script and evaluate Algorithm Level
  const phase1 = shouldRunAi
    ? advanceScriptedChunk(initial, preset, new Date().toISOString(), {
        coercionScoreDelta: 0,
        flaggedTactics: [],
        aiScore: initial.call.detection.ai.score,
        aiReasoning: initial.call.detection.ai.reasoning,
      })
    : advanceScriptedChunk(initial, preset, new Date().toISOString());

  const savedPhase1 = ctx.store.setState(phase1);
  const startSessionId = savedPhase1.state.sessionId;
  const isExhausted = savedPhase1.state.scriptedChunkIndex >= preset.scriptedChunks.length;

  if (!shouldRunAi) {
    return {
      ...savedPhase1,
      exhausted: isExhausted,
      aiPending: false,
    };
  }

  const aiTask = analyzeCallChunk(upcomingChunk.text, {
    previousTranscript: historyBeforeChunk,
    screenSharing: savedPhase1.state.call.detection.signals.screenSharing,
  }).then((analysis) => {
    const latest = ctx.store.getState();
    if (latest.sessionId !== startSessionId) {
      return;
    }
    const merged = applyAiDetection(latest, {
      aiScore: Math.max(upcomingChunk.aiScore ?? 0, analysis.aiProbability),
      tactics: analysis.tactics.length > 0 ? analysis.tactics : upcomingChunk.flaggedTactics,
      reasoning: analysis.summary,
      source: analysis.source,
    });
    ctx.store.setState(merged);
  });

  ctx.store.trackAiTask(startSessionId, aiTask);

  if (waitForAi) {
    await aiTask;
    const latestSnapshot = ctx.store.getSnapshot();
    return {
      ...latestSnapshot,
      exhausted: latestSnapshot.state.scriptedChunkIndex >= preset.scriptedChunks.length,
      aiPending: false,
    };
  }

  return {
    ...savedPhase1,
    exhausted: isExhausted,
    aiPending: true,
  };
}

export async function executeTransfer({
  ctx,
  input,
}: PublicResolverOptions & { input: SubmitTransferSchemaInput }) {
  return ctx.store.runTransferExclusive(async () => {
    let current = ctx.store.getState();
    const nowIso = new Date().toISOString();

    // Pre-Transfer Gate: active call OR post-call cooldown window holds settlement briefly
    // so in-flight AI can engage Mirage before real funds leave the bank.
    const preTransferGate =
      current.mode === "normal" && isCallContextActive(current.call, nowIso)
        ? await ctx.store.waitForPendingAi(current.sessionId, PRE_TRANSFER_AI_WAIT_MS)
        : { waitedMs: 0, timedOut: false, hadPending: false };

    current = ctx.store.getState();

    // Idempotency guard against nervous double-taps during Pre-Transfer Gate wait
    const normalizedRecipient = normalizeRecipientValue(input.recipientValue);
    const roundedAmount = Math.round(input.amount * 100) / 100;
    const latestReceipt = current.receipts[0];
    if (
      latestReceipt &&
      normalizeRecipientValue(latestReceipt.recipientValue) === normalizedRecipient &&
      latestReceipt.amount === roundedAmount &&
      Date.now() - Date.parse(latestReceipt.createdAt) <= DOUBLE_TAP_DEDUP_WINDOW_MS
    ) {
      return {
        outcome: current.mode === "mirage" ? ("mirage_completed" as const) : ("completed" as const),
        errorMessage: undefined,
        receipt: latestReceipt,
        capturedMule: undefined,
        deduplicated: true,
        preTransferGate,
        telegram: undefined,
        ...ctx.store.getSnapshot(),
      };
    }

    const wasAlertSent = current.trustedAlertSent;
    const preset = getPresetById(current.presetId);

    const result = submitTransfer(current, input, preset);
    const saved = ctx.store.setState(result.state);

    let telegram: { sent: boolean; reason?: string } | undefined;
    if (!wasAlertSent && result.state.trustedAlertSent) {
      telegram = await sendTelegramAlert({
        callerNumber: result.state.call.callerNumber,
        coercionScore: result.state.call.coercionScore,
        capturedMules: result.state.capturedMules,
        receipt: result.receipt,
      });
    }

    return {
      outcome: result.outcome,
      errorMessage: result.errorMessage,
      receipt: result.receipt,
      capturedMule: result.capturedMule,
      deduplicated: false,
      preTransferGate,
      telegram,
      ...saved,
    };
  });
}

export async function sendSupport({
  ctx,
  input,
}: PublicResolverOptions & { input: SendSupportSchemaInput }) {
  const initial = ctx.store.getState();
  const startSessionId = initial.sessionId;
  const withUserMsg = appendSupportMessage(initial, "user", input.text);
  ctx.store.setState(withUserMsg);

  const replyResult = await replyAsCoverSupport(input.text, {
    mode: withUserMsg.mode,
    locale: withUserMsg.locale,
    honeytrapStage: withUserMsg.honeytrapStage,
    callActive: withUserMsg.call.active,
    coercionScore: withUserMsg.call.coercionScore,
    capturedMulesCount: withUserMsg.capturedMules.length,
    latestReceiptRef: withUserMsg.receipts[0]?.refCode,
  });

  const latest = ctx.store.getState();
  if (latest.sessionId !== startSessionId) {
    return {
      reply: replyResult.reply,
      source: replyResult.source,
      ...ctx.store.getSnapshot(),
    };
  }

  const withAgentReply = appendSupportMessage(latest, "agent", replyResult.reply);
  const saved = ctx.store.setState(withAgentReply);

  return {
    reply: replyResult.reply,
    source: replyResult.source,
    ...saved,
  };
}

export function changeLocale({
  ctx,
  input,
}: PublicResolverOptions & { input: SetLocaleSchemaInput }) {
  const next = setLocale(ctx.store.getState(), input.locale);
  return ctx.store.setState(next);
}

export function resetDemoSession({ ctx }: PublicResolverOptions) {
  const current = ctx.store.getState();
  const preset = getPresetById(current.presetId);
  const next = resetState(preset, current.locale);
  return ctx.store.setState(next);
}
