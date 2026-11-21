export {
  COERCION_ACTIVATION_THRESHOLD,
  getVisibleAccounts,
  type Account,
  type AccountKind,
  type AiAssessmentSource,
  type AiDetection,
  type AlgorithmDetection,
  type CallSession,
  type DecoyReceipt,
  type DetectionSignals,
  type DetectionState,
  type HoneytrapStage,
  type Locale,
  type LocalizedText,
  type MirageMode,
  type MirageSnapshot,
  type MirageState,
  type MuleArtifact,
  type MuleArtifactKind,
  type ScenarioPreset,
  type ScriptedTranscriptChunk,
  type SuggestedMule,
  type SupportMessage,
  type SupportRole,
  type TranscriptEntry,
  type TranscriptSpeaker,
  type TransferOutcome,
} from "../../../shared/mirage-types.ts";

import type {
  AiAssessmentSource,
  DecoyReceipt,
  MirageState,
  MuleArtifact,
  TranscriptSpeaker,
  TransferOutcome,
} from "../../../shared/mirage-types.ts";

export type IngestTranscriptInput = {
  id?: string;
  speaker: TranscriptSpeaker;
  text: string;
  timestamp?: string;
  coercionScoreDelta: number;
  flaggedTactics: string[];
  aiScore?: number;
  aiReasoning?: string;
  aiSource?: AiAssessmentSource;
  enableScreenShare?: boolean;
};

export type SubmitTransferInput = {
  fromAccountId: string;
  recipientValue: string;
  recipientLabel?: string;
  amount: number;
  now?: string;
  refSuffix?: string;
};

export type TransferResult = {
  state: MirageState;
  outcome: TransferOutcome;
  errorMessage?: string;
  receipt?: DecoyReceipt;
  capturedMule?: MuleArtifact;
};
