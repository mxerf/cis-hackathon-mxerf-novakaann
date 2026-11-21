import { analyzeCallChunk, replyAsCoverSupport } from "../../infra/ai-gateway.ts";
import { sendTelegramAlert } from "../../infra/telegram-alert.ts";
import type { PublicResolverOptions } from "../../trpc.ts";
import {
  advanceScriptedChunk,
  appendSupportMessage,
  endCall,
  ingestTranscriptChunk,
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
  const initial = ctx.store.getState();
  const startSessionId = initial.sessionId;
  const { speaker, text, analyzeWithAi } = input;
  let delta = input.coercionScoreDelta;
  let tactics = input.flaggedTactics;
  let aiScore: number | undefined;
  let analysisSummary: string | undefined;
  let analysisSource: "ai" | "fallback" | "manual" = "manual";

  if (delta === undefined || tactics === undefined) {
    if (speaker === "caller" && analyzeWithAi) {
      const analysis = await analyzeCallChunk(text, {
        previousTranscript: initial.call.transcript.map(
          (entry) => `${entry.speaker}: ${entry.text}`,
        ),
        screenSharing: initial.call.detection.signals.screenSharing,
      });
      delta = delta ?? analysis.coercionScoreDelta;
      tactics = tactics ?? analysis.tactics;
      aiScore = analysis.aiProbability;
      analysisSummary = analysis.summary;
      analysisSource = analysis.source;
    } else {
      delta = delta ?? 0;
      tactics = tactics ?? [];
    }
  }

  let latest = ctx.store.getState();
  if (latest.sessionId !== startSessionId) {
    return {
      ...ctx.store.getSnapshot(),
      analysis: {
        aiProbability: aiScore,
        coercionScoreDelta: delta,
        tactics,
        summary: analysisSummary,
        source: analysisSource,
      },
    };
  }

  if (!latest.call.active) {
    latest = startCall(latest);
  }

  const next = ingestTranscriptChunk(latest, {
    speaker,
    text,
    coercionScoreDelta: delta,
    flaggedTactics: tactics,
    aiScore,
    aiReasoning: analysisSummary,
    aiSource: analysisSource === "ai" || analysisSource === "fallback" ? analysisSource : undefined,
  });

  const saved = ctx.store.setState(next);
  return {
    ...saved,
    analysis: {
      aiProbability: aiScore,
      coercionScoreDelta: delta,
      tactics,
      summary: analysisSummary,
      source: analysisSource,
    },
  };
}

export async function advanceCallScript({
  ctx,
  input,
}: PublicResolverOptions & { input: NextChunkSchemaInput }) {
  const initial = ctx.store.getState();
  const startSessionId = initial.sessionId;
  const startChunkIndex = initial.scriptedChunkIndex;
  const analyzeWithAi = input?.analyzeWithAi ?? false;
  const preset = getPresetById(initial.presetId);
  const upcomingChunk = preset.scriptedChunks[startChunkIndex];

  if (!upcomingChunk) {
    return { ...ctx.store.getSnapshot(), exhausted: true };
  }

  let analysisOverride:
    | {
        coercionScoreDelta: number;
        flaggedTactics: string[];
        aiScore?: number;
        aiReasoning?: string;
        aiSource?: "ai" | "fallback";
      }
    | undefined;

  if (analyzeWithAi && upcomingChunk.speaker === "caller") {
    const analysis = await analyzeCallChunk(upcomingChunk.text, {
      previousTranscript: initial.call.transcript.map((entry) => `${entry.speaker}: ${entry.text}`),
      screenSharing:
        upcomingChunk.autoEnableScreenShare || initial.call.detection.signals.screenSharing,
    });
    analysisOverride = {
      coercionScoreDelta: Math.max(upcomingChunk.coercionScoreDelta, analysis.coercionScoreDelta),
      flaggedTactics: analysis.tactics.length > 0 ? analysis.tactics : upcomingChunk.flaggedTactics,
      aiScore: Math.max(upcomingChunk.aiScore ?? 0, analysis.aiProbability),
      aiReasoning: analysis.summary,
      aiSource: analysis.source,
    };
  }

  const latest = ctx.store.getState();
  if (latest.sessionId !== startSessionId || latest.scriptedChunkIndex !== startChunkIndex) {
    return {
      ...ctx.store.getSnapshot(),
      exhausted: latest.scriptedChunkIndex >= preset.scriptedChunks.length,
    };
  }

  const next = advanceScriptedChunk(latest, preset, new Date().toISOString(), analysisOverride);
  const saved = ctx.store.setState(next);

  return {
    ...saved,
    exhausted: next.scriptedChunkIndex >= preset.scriptedChunks.length,
  };
}

export async function executeTransfer({
  ctx,
  input,
}: PublicResolverOptions & { input: SubmitTransferSchemaInput }) {
  const current = ctx.store.getState();
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
    telegram,
    ...saved,
  };
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
