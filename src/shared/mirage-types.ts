export type AccountKind = "checking" | "vault";

export type Account = {
  id: string;
  name: string;
  balance: number;
  currency: string;
  kind: AccountKind;
};

export type TranscriptSpeaker = "caller" | "victim" | "ai_decoy";

export type TranscriptEntry = {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  timestamp: string;
  flaggedTactics: string[];
};

export type DetectionSignals = {
  screenSharing: boolean;
  unverifiedCaller: boolean;
  clipboardPasteDetected: boolean;
};

export type AlgorithmDetection = {
  score: number;
  activeFlags: string[];
  matchedKeywords: string[];
  matchedConstructions: string[];
};

export type AiAssessmentSource = "ai" | "scripted" | "fallback" | "standby";

export type AiDetection = {
  score: number;
  tactics: string[];
  reasoning: string;
  source: AiAssessmentSource;
};

export type DetectionState = {
  signals: DetectionSignals;
  algorithm: AlgorithmDetection;
  ai: AiDetection;
  combinedScore: number;
};

export type CallSession = {
  active: boolean;
  callerNumber: string;
  callerLabel: string;
  simAgeDays: number;
  transcript: TranscriptEntry[];
  coercionScore: number;
  detection: DetectionState;
};

export type MuleArtifactKind = "card" | "iban" | "phone";

export type MuleArtifact = {
  id: string;
  kind: MuleArtifactKind;
  value: string;
  label: string;
  attemptNumber: number;
  capturedAt: string;
};

export type DecoyReceipt = {
  refCode: string;
  amount: number;
  currency: string;
  recipientValue: string;
  createdAt: string;
  statusLabel: string;
};

export type SupportRole = "user" | "agent";

export type SupportMessage = {
  id: string;
  role: SupportRole;
  text: string;
  createdAt: string;
};

export type MirageMode = "normal" | "mirage";

export type HoneytrapStage = "armed" | "first_mule_rejected" | "completed";

export type Locale = "en" | "ru";

export type MirageState = {
  presetId: string;
  realAccounts: Account[];
  mirageAccounts: Account[];
  mode: MirageMode;
  call: CallSession;
  honeytrapStage: HoneytrapStage;
  capturedMules: MuleArtifact[];
  receipts: DecoyReceipt[];
  supportMessages: SupportMessage[];
  trustedAlertSent: boolean;
  locale: Locale;
  scriptedChunkIndex: number;
};

export type ScriptedTranscriptChunk = {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  coercionScoreDelta: number;
  flaggedTactics: string[];
  aiScore?: number;
  aiReasoning?: string;
  autoEnableScreenShare?: boolean;
  stageHint?: "initial" | "escalation" | "first_mule" | "backup_mule";
};

export type SuggestedMule = {
  label: string;
  value: string;
  kind: MuleArtifactKind;
  suggestedAmount: number;
};

export type LocalizedText = {
  en: string;
  ru: string;
};

export type ScenarioPreset = {
  id: string;
  brandName: string;
  walletSubtitle: LocalizedText;
  telecomCarrier: string;
  scenarioTitle: LocalizedText;
  currency: string;
  refPrefix: string;
  trustedContactLabel: LocalizedText;
  initialAccounts: Account[];
  defaultCall: {
    callerNumber: string;
    callerLabel: string;
    simAgeDays: number;
  };
  scriptedChunks: ScriptedTranscriptChunk[];
  suggestedMules: SuggestedMule[];
  honeytrapRejectionMessage: LocalizedText;
  decoyReceiptStatusLabel: LocalizedText;
  normalReceiptStatusLabel: LocalizedText;
  initialSupportGreeting: LocalizedText;
};

export type TransferOutcome =
  | "completed"
  | "rejected_honeytrap"
  | "mirage_completed"
  | "insufficient_funds"
  | "invalid_input";

export type MirageSnapshot = {
  state: MirageState;
  preset: ScenarioPreset;
};

export const COERCION_ACTIVATION_THRESHOLD = 65;

export function getVisibleAccounts(state: MirageState): Account[] {
  return state.mode === "mirage" ? state.mirageAccounts : state.realAccounts;
}
