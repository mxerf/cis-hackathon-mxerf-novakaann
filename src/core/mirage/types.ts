export type AccountKind = "checking" | "vault";

export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  kind: AccountKind;
}

export type TranscriptSpeaker = "caller" | "victim" | "ai_decoy";

export interface TranscriptEntry {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  timestamp: string;
  flaggedTactics: string[];
}

export interface CallSession {
  active: boolean;
  callerNumber: string;
  callerLabel: string;
  simAgeDays: number;
  transcript: TranscriptEntry[];
  coercionScore: number;
}

export type MuleArtifactKind = "card" | "iban" | "phone";

export interface MuleArtifact {
  id: string;
  kind: MuleArtifactKind;
  value: string;
  label: string;
  attemptNumber: number;
  capturedAt: string;
}

export interface DecoyReceipt {
  refCode: string;
  amount: number;
  currency: string;
  recipientValue: string;
  createdAt: string;
  statusLabel: string;
}

export type SupportRole = "user" | "agent";

export interface SupportMessage {
  id: string;
  role: SupportRole;
  text: string;
  createdAt: string;
}

export type MirageMode = "normal" | "mirage";

export type HoneytrapStage = "armed" | "first_mule_rejected" | "completed";

export type Locale = "en" | "ru";

export interface MirageState {
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
}

export interface ScriptedTranscriptChunk {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  coercionScoreDelta: number;
  flaggedTactics: string[];
  stageHint?: "initial" | "escalation" | "first_mule" | "backup_mule";
}

export interface SuggestedMule {
  label: string;
  value: string;
  kind: MuleArtifactKind;
  suggestedAmount: number;
}

export interface LocalizedText {
  en: string;
  ru: string;
}

export interface ScenarioPreset {
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
}

export interface IngestTranscriptInput {
  id?: string;
  speaker: TranscriptSpeaker;
  text: string;
  timestamp?: string;
  coercionScoreDelta: number;
  flaggedTactics: string[];
}

export interface SubmitTransferInput {
  fromAccountId: string;
  recipientValue: string;
  recipientLabel?: string;
  amount: number;
  now?: string;
  refSuffix?: string;
}

export type TransferOutcome =
  | "completed"
  | "rejected_honeytrap"
  | "mirage_completed"
  | "insufficient_funds"
  | "invalid_input";

export interface TransferResult {
  state: MirageState;
  outcome: TransferOutcome;
  errorMessage?: string;
  receipt?: DecoyReceipt;
  capturedMule?: MuleArtifact;
}
