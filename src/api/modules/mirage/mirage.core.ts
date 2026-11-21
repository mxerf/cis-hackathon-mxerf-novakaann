import { clampScore, combineDetectionScores, evaluateAlgorithmLevel } from "./mirage.detector.ts";
import { DEFAULT_PRESET, getPresetById } from "./mirage.presets.ts";
import {
  COERCION_ACTIVATION_THRESHOLD,
  type Account,
  type AiDetection,
  type CallSession,
  type DecoyReceipt,
  type DetectionSignals,
  type IngestTranscriptInput,
  type Locale,
  type MirageState,
  type MuleArtifact,
  type MuleArtifactKind,
  type ScenarioPreset,
  type SubmitTransferInput,
  type SupportRole,
  type TranscriptEntry,
  type TransferResult,
} from "./mirage.types.ts";

export { COERCION_ACTIVATION_THRESHOLD, getVisibleAccounts } from "./mirage.types.ts";

const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;

function cloneAccounts(accounts: readonly Account[]): Account[] {
  return accounts.map((account) => ({ ...account }));
}

function makeShortCode(seed: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  const normalized = (hash >>> 0).toString(36).toUpperCase().padStart(8, "0");
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}`;
}

export function detectMuleKind(rawValue: string): MuleArtifactKind {
  const cleaned = rawValue.replace(/[\s-]/g, "").toUpperCase();
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) {
    return "iban";
  }
  if (/^\+?\d{9,15}$/.test(cleaned) && (rawValue.includes("+") || cleaned.length <= 12)) {
    return "phone";
  }
  if (/^\d{13,19}$/.test(cleaned)) {
    return "card";
  }
  if (cleaned.startsWith("AE") || cleaned.length >= 18) {
    return "iban";
  }
  return "phone";
}

function recomputeCallDetection(
  call: CallSession,
  signals: DetectionSignals,
  ai: AiDetection,
): CallSession {
  const algorithm = evaluateAlgorithmLevel({
    callActive: call.active,
    signals,
    transcript: call.transcript,
  });
  const combinedScore = combineDetectionScores(algorithm.score, ai.score);

  return {
    ...call,
    coercionScore: combinedScore,
    detection: {
      signals,
      algorithm,
      ai,
      combinedScore,
    },
  };
}

function maybeEngageMirage(state: MirageState, nextCall: CallSession): MirageState {
  const shouldEnterMirage =
    state.mode === "normal" &&
    nextCall.active &&
    nextCall.coercionScore >= COERCION_ACTIVATION_THRESHOLD;

  return {
    ...state,
    call: nextCall,
    mode: shouldEnterMirage ? "mirage" : state.mode,
    mirageAccounts: shouldEnterMirage ? cloneAccounts(state.realAccounts) : state.mirageAccounts,
  };
}

function getStandbyReasoning(locale: Locale): string {
  return locale === "ru"
    ? "Ожидание голосового потока для семантической оценки…"
    : "Standby — awaiting live call speech for semantic evaluation…";
}

export function createInitialState(
  preset: ScenarioPreset = DEFAULT_PRESET,
  locale: Locale = "en",
  now: string = new Date().toISOString(),
): MirageState {
  const realAccounts = cloneAccounts(preset.initialAccounts);
  const mirageAccounts = cloneAccounts(preset.initialAccounts);

  const initialSignals: DetectionSignals = {
    screenSharing: false,
    unverifiedCaller: true,
    clipboardPasteDetected: false,
  };

  const initialAi: AiDetection = {
    score: 0,
    tactics: [],
    reasoning: getStandbyReasoning(locale),
    source: "standby",
  };

  const baseCall: CallSession = {
    active: false,
    callerNumber: preset.defaultCall.callerNumber,
    callerLabel: preset.defaultCall.callerLabel,
    simAgeDays: preset.defaultCall.simAgeDays,
    transcript: [],
    coercionScore: 0,
    detection: {
      signals: initialSignals,
      algorithm: {
        score: 0,
        activeFlags: [],
        matchedKeywords: [],
        matchedConstructions: [],
      },
      ai: initialAi,
      combinedScore: 0,
    },
  };

  return {
    sessionId: crypto.randomUUID(),
    presetId: preset.id,
    realAccounts,
    mirageAccounts,
    mode: "normal",
    call: baseCall,
    honeytrapStage: "armed",
    capturedMules: [],
    receipts: [],
    supportMessages: [
      {
        id: "support-welcome",
        role: "agent",
        text: preset.initialSupportGreeting[locale],
        createdAt: now,
      },
    ],
    trustedAlertSent: false,
    locale,
    scriptedChunkIndex: 0,
  };
}

export function startCall(
  state: MirageState,
  overrides?: Partial<Pick<CallSession, "callerNumber" | "callerLabel" | "simAgeDays">>,
): MirageState {
  const draftCall: CallSession = {
    ...state.call,
    active: true,
    callerNumber: overrides?.callerNumber ?? state.call.callerNumber,
    callerLabel: overrides?.callerLabel ?? state.call.callerLabel,
    simAgeDays: overrides?.simAgeDays ?? state.call.simAgeDays,
  };

  const nextCall = recomputeCallDetection(
    draftCall,
    state.call.detection.signals,
    state.call.detection.ai,
  );

  return maybeEngageMirage(state, nextCall);
}

export function endCall(state: MirageState): MirageState {
  const draftCall: CallSession = {
    ...state.call,
    active: false,
  };
  const nextSignals: DetectionSignals = {
    ...state.call.detection.signals,
    screenSharing: false,
  };
  const nextCall = recomputeCallDetection(draftCall, nextSignals, state.call.detection.ai);
  return {
    ...state,
    call: nextCall,
  };
}

export function updateDetectionSignals(
  state: MirageState,
  patch: Partial<DetectionSignals>,
): MirageState {
  const nextSignals: DetectionSignals = {
    ...state.call.detection.signals,
    ...patch,
  };
  const nextCall = recomputeCallDetection(state.call, nextSignals, state.call.detection.ai);
  return maybeEngageMirage(state, nextCall);
}

export function ingestTranscriptChunk(
  state: MirageState,
  input: IngestTranscriptInput,
): MirageState {
  const trimmedText = input.text.trim();
  if (!trimmedText) {
    return state;
  }

  const timestamp = input.timestamp ?? new Date().toISOString();
  const entry: TranscriptEntry = {
    id: input.id ?? `tr-${state.call.transcript.length + 1}-${Date.now()}`,
    speaker: input.speaker,
    text: trimmedText,
    timestamp,
    flaggedTactics: [...new Set(input.flaggedTactics)],
  };

  const nextSignals: DetectionSignals = {
    ...state.call.detection.signals,
    screenSharing: input.enableScreenShare ? true : state.call.detection.signals.screenSharing,
  };

  const prevAi = state.call.detection.ai;
  const mergedTactics = [...new Set([...prevAi.tactics, ...entry.flaggedTactics])];

  const nextAiScore =
    input.aiScore !== undefined
      ? clampScore(Math.max(prevAi.score, input.aiScore))
      : clampScore(prevAi.score + input.coercionScoreDelta);

  const nextAi: AiDetection =
    input.speaker === "caller" || input.aiScore !== undefined || input.coercionScoreDelta > 0
      ? {
          score: nextAiScore,
          tactics: mergedTactics,
          reasoning:
            input.aiReasoning?.trim() ||
            (mergedTactics.length > 0
              ? `Semantic pattern match: ${mergedTactics.join(", ")}.`
              : prevAi.reasoning),
          source: input.aiSource ?? (prevAi.source === "ai" ? "ai" : "scripted"),
        }
      : prevAi;

  const draftCall: CallSession = {
    ...state.call,
    transcript: [...state.call.transcript, entry],
  };

  const nextCall = recomputeCallDetection(draftCall, nextSignals, nextAi);
  return maybeEngageMirage(state, nextCall);
}

export function advanceScriptedChunk(
  state: MirageState,
  preset: ScenarioPreset = getPresetById(state.presetId),
  now: string = new Date().toISOString(),
  analysisOverride?: {
    coercionScoreDelta: number;
    flaggedTactics: string[];
    aiScore?: number;
    aiReasoning?: string;
    aiSource?: "ai" | "fallback";
  },
): MirageState {
  const chunk = preset.scriptedChunks[state.scriptedChunkIndex];
  if (!chunk) {
    return state;
  }

  const withCallActive = state.call.active ? state : startCall(state);
  const ingested = ingestTranscriptChunk(withCallActive, {
    id: `${chunk.id}-${state.call.transcript.length + 1}`,
    speaker: chunk.speaker,
    text: chunk.text,
    timestamp: now,
    coercionScoreDelta: analysisOverride?.coercionScoreDelta ?? chunk.coercionScoreDelta,
    flaggedTactics: analysisOverride?.flaggedTactics ?? chunk.flaggedTactics,
    aiScore: analysisOverride?.aiScore ?? chunk.aiScore,
    aiReasoning: analysisOverride?.aiReasoning ?? chunk.aiReasoning,
    aiSource: analysisOverride?.aiSource ?? (chunk.aiScore !== undefined ? "scripted" : undefined),
    enableScreenShare: chunk.autoEnableScreenShare,
  });

  return {
    ...ingested,
    scriptedChunkIndex: state.scriptedChunkIndex + 1,
  };
}

export function submitTransfer(
  state: MirageState,
  input: SubmitTransferInput,
  preset: ScenarioPreset = getPresetById(state.presetId),
): TransferResult {
  const recipientValue = input.recipientValue.trim();
  if (!recipientValue || !Number.isFinite(input.amount) || input.amount <= 0) {
    return {
      state,
      outcome: "invalid_input",
      errorMessage:
        state.locale === "ru"
          ? "Введите корректные реквизиты получателя и сумму больше 0."
          : "Enter a valid recipient account and an amount greater than 0.",
    };
  }

  const amount = Math.round(input.amount * 100) / 100;
  const now = input.now ?? new Date().toISOString();
  const refCode = `Ref #${preset.refPrefix}-${input.refSuffix ?? makeShortCode(`${recipientValue}:${amount}:${now}:${state.receipts.length}`)}`;

  if (state.mode === "normal") {
    const sourceAccount = state.realAccounts.find((acc) => acc.id === input.fromAccountId);
    if (!sourceAccount) {
      return {
        state,
        outcome: "invalid_input",
        errorMessage:
          state.locale === "ru"
            ? "Выбранный счёт не найден."
            : "Selected source account not found.",
      };
    }

    if (sourceAccount.balance < amount) {
      return {
        state,
        outcome: "insufficient_funds",
        errorMessage:
          state.locale === "ru"
            ? "Недостаточно средств на выбранном счёте."
            : "Insufficient balance in selected account.",
      };
    }

    const updatedReal = state.realAccounts.map((acc) =>
      acc.id === sourceAccount.id
        ? { ...acc, balance: Math.round((acc.balance - amount) * 100) / 100 }
        : acc,
    );

    const receipt: DecoyReceipt = {
      refCode,
      amount,
      currency: sourceAccount.currency,
      recipientValue,
      createdAt: now,
      statusLabel: preset.normalReceiptStatusLabel[state.locale],
    };

    return {
      state: {
        ...state,
        realAccounts: updatedReal,
        mirageAccounts: cloneAccounts(updatedReal),
        receipts: [receipt, ...state.receipts],
      },
      outcome: "completed",
      receipt,
    };
  }

  // Mirage mode invariant: realAccounts never decreases under coercion.
  const mirageSource = state.mirageAccounts.find((acc) => acc.id === input.fromAccountId);
  if (!mirageSource) {
    return {
      state,
      outcome: "invalid_input",
      errorMessage:
        state.locale === "ru" ? "Выбранный счёт не найден." : "Selected source account not found.",
    };
  }

  if (mirageSource.balance < amount) {
    return {
      state,
      outcome: "insufficient_funds",
      errorMessage:
        state.locale === "ru"
          ? "Недостаточно средств на выбранном счёте."
          : "Insufficient balance in selected account.",
    };
  }

  const attemptNumber = state.capturedMules.length + 1;
  const capturedMule: MuleArtifact = {
    id: `mule-${attemptNumber}-${makeShortCode(`${recipientValue}:${attemptNumber}`)}`,
    kind: detectMuleKind(recipientValue),
    value: recipientValue,
    label:
      input.recipientLabel?.trim() ||
      (attemptNumber === 1 ? "Primary Mule Account" : `Backup Mule Account #${attemptNumber}`),
    attemptNumber,
    capturedAt: now,
  };

  const nextCapturedMules = [...state.capturedMules, capturedMule];

  if (state.honeytrapStage === "armed") {
    return {
      state: {
        ...state,
        honeytrapStage: "first_mule_rejected",
        capturedMules: nextCapturedMules,
      },
      outcome: "rejected_honeytrap",
      errorMessage: preset.honeytrapRejectionMessage[state.locale],
      capturedMule,
    };
  }

  const updatedMirage = state.mirageAccounts.map((acc) =>
    acc.id === mirageSource.id
      ? { ...acc, balance: Math.round((acc.balance - amount) * 100) / 100 }
      : acc,
  );

  const receipt: DecoyReceipt = {
    refCode,
    amount,
    currency: mirageSource.currency,
    recipientValue,
    createdAt: now,
    statusLabel: preset.decoyReceiptStatusLabel[state.locale],
  };

  return {
    state: {
      ...state,
      mirageAccounts: updatedMirage,
      honeytrapStage: "completed",
      capturedMules: nextCapturedMules,
      receipts: [receipt, ...state.receipts],
      trustedAlertSent: true,
    },
    outcome: "mirage_completed",
    receipt,
    capturedMule,
  };
}

export function appendSupportMessage(
  state: MirageState,
  role: SupportRole,
  text: string,
  now: string = new Date().toISOString(),
): MirageState {
  const trimmed = text.trim();
  if (!trimmed) {
    return state;
  }

  return {
    ...state,
    supportMessages: [
      ...state.supportMessages,
      {
        id: `msg-${state.supportMessages.length + 1}-${makeShortCode(`${role}:${trimmed}:${now}`)}`,
        role,
        text: trimmed,
        createdAt: now,
      },
    ],
  };
}

export function setLocale(state: MirageState, locale: Locale): MirageState {
  const preset = getPresetById(state.presetId);
  const firstSupport = state.supportMessages[0];
  const shouldTranslateWelcome =
    state.supportMessages.length === 1 && firstSupport?.id === "support-welcome";

  const nextSupportMessages =
    shouldTranslateWelcome && firstSupport
      ? [{ ...firstSupport, text: preset.initialSupportGreeting[locale] }]
      : state.supportMessages;

  const nextCall =
    state.call.detection.ai.source === "standby"
      ? {
          ...state.call,
          detection: {
            ...state.call.detection,
            ai: {
              ...state.call.detection.ai,
              reasoning: getStandbyReasoning(locale),
            },
          },
        }
      : state.call;

  return {
    ...state,
    locale,
    call: nextCall,
    supportMessages: nextSupportMessages,
  };
}

export function resetState(
  preset: ScenarioPreset = DEFAULT_PRESET,
  locale: Locale = "en",
  now: string = new Date().toISOString(),
): MirageState {
  return createInitialState(preset, locale, now);
}
