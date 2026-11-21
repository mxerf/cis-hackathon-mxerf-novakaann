import { UAE_DU_KYC_PRESET, getPresetById } from "./presets.ts";
import type {
  Account,
  CallSession,
  DecoyReceipt,
  IngestTranscriptInput,
  Locale,
  MirageState,
  MuleArtifact,
  MuleArtifactKind,
  ScenarioPreset,
  SubmitTransferInput,
  SupportRole,
  TranscriptEntry,
  TransferResult,
} from "./types.ts";

export const COERCION_ACTIVATION_THRESHOLD = 65;

function cloneAccounts(accounts: readonly Account[]): Account[] {
  return accounts.map((account) => ({ ...account }));
}

function clampCoercionScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function makeShortCode(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
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

export function createInitialState(
  preset: ScenarioPreset = UAE_DU_KYC_PRESET,
  locale: Locale = "en",
  now: string = new Date().toISOString(),
): MirageState {
  const realAccounts = cloneAccounts(preset.initialAccounts);
  const mirageAccounts = cloneAccounts(preset.initialAccounts);

  return {
    presetId: preset.id,
    realAccounts,
    mirageAccounts,
    mode: "normal",
    call: {
      active: false,
      callerNumber: preset.defaultCall.callerNumber,
      callerLabel: preset.defaultCall.callerLabel,
      simAgeDays: preset.defaultCall.simAgeDays,
      transcript: [],
      coercionScore: 0,
    },
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

export function getVisibleAccounts(state: MirageState): Account[] {
  return state.mode === "mirage" ? state.mirageAccounts : state.realAccounts;
}

export function startCall(
  state: MirageState,
  overrides?: Partial<Pick<CallSession, "callerNumber" | "callerLabel" | "simAgeDays">>,
): MirageState {
  const nextCall: CallSession = {
    ...state.call,
    active: true,
    callerNumber: overrides?.callerNumber ?? state.call.callerNumber,
    callerLabel: overrides?.callerLabel ?? state.call.callerLabel,
    simAgeDays: overrides?.simAgeDays ?? state.call.simAgeDays,
  };

  const shouldActivateMirage =
    state.mode === "normal" && nextCall.coercionScore >= COERCION_ACTIVATION_THRESHOLD;

  return {
    ...state,
    call: nextCall,
    mode: shouldActivateMirage ? "mirage" : state.mode,
    mirageAccounts: shouldActivateMirage ? cloneAccounts(state.realAccounts) : state.mirageAccounts,
  };
}

export function endCall(state: MirageState): MirageState {
  return {
    ...state,
    call: {
      ...state.call,
      active: false,
    },
  };
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

  const nextCoercionScore = clampCoercionScore(state.call.coercionScore + input.coercionScoreDelta);
  const nextCall: CallSession = {
    ...state.call,
    transcript: [...state.call.transcript, entry],
    coercionScore: nextCoercionScore,
  };

  const shouldEnterMirage =
    state.mode === "normal" &&
    nextCall.active &&
    nextCoercionScore >= COERCION_ACTIVATION_THRESHOLD;

  return {
    ...state,
    call: nextCall,
    mode: shouldEnterMirage ? "mirage" : state.mode,
    mirageAccounts: shouldEnterMirage
      ? cloneAccounts(state.realAccounts)
      : state.mirageAccounts,
  };
}

export function advanceScriptedChunk(
  state: MirageState,
  preset: ScenarioPreset = getPresetById(state.presetId),
  now: string = new Date().toISOString(),
  analysisOverride?: { coercionScoreDelta: number; flaggedTactics: string[] },
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
          state.locale === "ru" ? "Выбранный счёт не найден." : "Selected source account not found.",
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

  // Mirage mode: realAccounts is strictly immutable and NEVER decreases.
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
  return {
    ...state,
    locale,
  };
}

export function resetState(
  preset: ScenarioPreset = UAE_DU_KYC_PRESET,
  locale: Locale = "en",
  now: string = new Date().toISOString(),
): MirageState {
  return createInitialState(preset, locale, now);
}
