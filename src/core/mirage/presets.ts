import type { ScenarioPreset } from "./types.ts";

export const UAE_DU_KYC_PRESET: ScenarioPreset = {
  id: "uae-du-kyc",
  brandName: "du Pay",
  walletSubtitle: {
    en: "UAE Digital Wallet · Emirates ID Verified",
    ru: "Цифровой кошелёк ОАЭ · Emirates ID",
  },
  telecomCarrier: "du Telecom (UAE)",
  scenarioTitle: {
    en: "UAE du Telecom / Emirates ID KYC Phone Coercion",
    ru: "Сценарий ОАЭ: звонок от имени du Telecom / Emirates ID KYC",
  },
  currency: "AED",
  refPrefix: "DU",
  trustedContactLabel: {
    en: "Trusted Family Contact & du Fraud Desk",
    ru: "Доверенный контакт и антифрод du",
  },
  initialAccounts: [
    {
      id: "acc-checking",
      name: "du Pay Everyday",
      balance: 18450,
      currency: "AED",
      kind: "checking",
    },
    {
      id: "acc-vault",
      name: "Emirates Savings Vault",
      balance: 125000,
      currency: "AED",
      kind: "vault",
    },
  ],
  defaultCall: {
    callerNumber: "+971 55 842 9104",
    callerLabel: "du Compliance Desk (Unverified SIM)",
    simAgeDays: 2,
  },
  scriptedChunks: [
    {
      id: "chunk-1",
      speaker: "caller",
      text: "Good afternoon. This is Senior Officer Tariq from du Regulatory Compliance. Your Emirates ID KYC expired and your SIM plus du Pay wallet will be disconnected in 15 minutes unless you complete emergency verification now.",
      coercionScoreDelta: 30,
      flaggedTactics: ["authority_impersonation", "artificial_urgency"],
      stageHint: "initial",
    },
    {
      id: "chunk-2",
      speaker: "victim",
      text: "Wait, I renewed my Emirates ID last month. Can I just visit a du store in Dubai Mall instead?",
      coercionScoreDelta: 0,
      flaggedTactics: [],
      stageHint: "initial",
    },
    {
      id: "chunk-3",
      speaker: "caller",
      text: "No, Central Bank case #CB-8841 is already open with a 50,000 AED penalty. Stay on this line, do not call anyone or hang up, and move your balance into our temporary Central Bank safe-custody account right now to clear the flag.",
      coercionScoreDelta: 42,
      flaggedTactics: ["fear_threat", "isolation", "safe_account_lure"],
      stageHint: "escalation",
    },
    {
      id: "chunk-4",
      speaker: "caller",
      text: "Open your du Pay app immediately and transfer 12,000 AED to safe-custody IBAN AE070331234567890123456. Keep me on speaker so I can confirm the reference code.",
      coercionScoreDelta: 18,
      flaggedTactics: ["financial_extraction", "urgency_pressure"],
      stageHint: "first_mule",
    },
    {
      id: "chunk-5",
      speaker: "caller",
      text: "That escrow node hit its daily Central Bank cap? No problem, use our secondary clearing account IBAN AE460090000000123456789 right now before the 5-minute cutoff.",
      coercionScoreDelta: 10,
      flaggedTactics: ["mule_pivoting", "coercion_escalation"],
      stageHint: "backup_mule",
    },
  ],
  suggestedMules: [
    {
      label: "Primary Safe-Custody Node (Mule #1)",
      value: "AE070331234567890123456",
      kind: "iban",
      suggestedAmount: 12000,
    },
    {
      label: "Secondary Clearing Account (Mule #2)",
      value: "AE460090000000123456789",
      kind: "iban",
      suggestedAmount: 12000,
    },
  ],
  honeytrapRejectionMessage: {
    en: "Transfer declined by beneficiary institution: daily inbound clearing limit reached (Code CB-412). Please request an alternate beneficiary account.",
    ru: "Перевод отклонён банком получателя: превышен дневной лимит входящего клиринга (Код CB-412). Запросите резервный счёт получателя.",
  },
  decoyReceiptStatusLabel: {
    en: "Completed · UAEFTS Clearing Ref Issued",
    ru: "Выполнено · Выдан референс клиринга UAEFTS",
  },
  normalReceiptStatusLabel: {
    en: "Completed · Instant Transfer",
    ru: "Выполнено · Мгновенный перевод",
  },
  initialSupportGreeting: {
    en: "Hello! You are connected to du Pay Priority Support. How can I assist with your account today?",
    ru: "Здравствуйте! Вы подключены к приоритетной поддержке du Pay. Чем могу помочь с вашим счётом?",
  },
};

export const SCENARIO_PRESETS: Record<string, ScenarioPreset> = {
  [UAE_DU_KYC_PRESET.id]: UAE_DU_KYC_PRESET,
};

export function getPresetById(presetId: string): ScenarioPreset {
  return SCENARIO_PRESETS[presetId] ?? UAE_DU_KYC_PRESET;
}
