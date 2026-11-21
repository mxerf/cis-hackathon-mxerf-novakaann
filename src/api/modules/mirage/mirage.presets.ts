import type { ScenarioPreset } from "./mirage.types.ts";

export const BANK_REFUND_TRAP_PRESET: ScenarioPreset = {
  id: "bank-refund-trap",
  brandName: "Wio · Pulse Bank",
  walletSubtitle: {
    en: "UAE Retail Banking · AED Personal Account",
    ru: "Розничный банк ОАЭ · Личный счёт AED",
  },
  telecomCarrier: "du UAE · LTE",
  scenarioTitle: {
    en: "Fake Bank Security · 'Cancel 14,500 AED Debit' Screen-Assist Trap",
    ru: "Фейк-безопасность банка · Ловушка «Отмена списания 14,500 AED»",
  },
  currency: "AED",
  refPrefix: "AED",
  trustedContactLabel: {
    en: "Family Guardian (In-App Trusted Contact)",
    ru: "Доверенный контакт семьи (внутри банка)",
  },
  initialAccounts: [
    {
      id: "acc-checking",
      name: "Everyday Current Account",
      balance: 24500,
      currency: "AED",
      kind: "checking",
    },
    {
      id: "acc-vault",
      name: "Family Savings Vault",
      balance: 140000,
      currency: "AED",
      kind: "vault",
    },
  ],
  defaultCall: {
    callerNumber: "+971 4 319 8802",
    callerLabel: "Bank Security Desk (Unverified SIP)",
    simAgeDays: 4,
  },
  scriptedChunks: [
    {
      id: "refund-1",
      speaker: "caller",
      text: "Hello, this is Officer Omar from the Bank Fraud Prevention Desk. We noticed a pending charge of 14,500 AED from your Everyday Account — did you authorize this payment?",
      coercionScoreDelta: 24,
      aiScore: 28,
      aiReasoning:
        "Caller introduces as bank fraud desk verifying a 14,500 AED pending charge; monitoring call before taking action.",
      flaggedTactics: ["authority_impersonation"],
      stageHint: "initial",
    },
    {
      id: "refund-2",
      speaker: "victim",
      text: "14,500 AED?! I never made that payment! Okay, I just turned on screen sharing like you asked — please help me stop it!",
      coercionScoreDelta: 0,
      autoEnableScreenShare: true,
      flaggedTactics: [],
      stageHint: "initial",
    },
    {
      id: "refund-3",
      speaker: "caller",
      text: "I see your screen now. Do not hang up — because the 14,500 AED debit is in active clearing, open Transfer and submit a mirror reversal of 14,500 AED to our technical transit IBAN AE070331234567890123456, then tap Confirm Transfer to cancel the charge.",
      coercionScoreDelta: 48,
      aiScore: 93,
      aiReasoning:
        "High-confidence social engineering: caller exploits screen-share assistance to disguise an outbound 14,500 AED transfer as a 'mirror cancellation'.",
      flaggedTactics: ["fake_refund_reversal", "isolation", "safe_account_lure"],
      stageHint: "first_mule",
    },
    {
      id: "refund-4",
      speaker: "caller",
      text: "Transit IBAN AE07 returned clearing limit CB-412? Stay on the line — enter our backup settlement IBAN AE460090000000123456789 for 14,500 AED and confirm immediately before the reversal window expires!",
      coercionScoreDelta: 12,
      aiScore: 98,
      aiReasoning:
        "Scammer reacted to honeytrap rejection CB-412 by exposing a second mule IBAN under countdown pressure.",
      flaggedTactics: ["mule_pivoting", "coercion_escalation"],
      stageHint: "backup_mule",
    },
  ],
  suggestedMules: [
    {
      label: "Scammer 'Reversal' IBAN #1",
      value: "AE070331234567890123456",
      kind: "iban",
      suggestedAmount: 14500,
    },
    {
      label: "Scammer Backup IBAN #2",
      value: "AE460090000000123456789",
      kind: "iban",
      suggestedAmount: 14500,
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
    en: "Hello! You are connected to Priority Banking Support. How can we help with your account today?",
    ru: "Здравствуйте! Вы подключены к поддержке банка. Чем можем помочь по вашему счёту?",
  },
};

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

export const DEFAULT_PRESET: ScenarioPreset = BANK_REFUND_TRAP_PRESET;

export const SCENARIO_PRESETS: Record<string, ScenarioPreset> = {
  [BANK_REFUND_TRAP_PRESET.id]: BANK_REFUND_TRAP_PRESET,
  [UAE_DU_KYC_PRESET.id]: UAE_DU_KYC_PRESET,
};

export function getPresetById(presetId: string): ScenarioPreset {
  return SCENARIO_PRESETS[presetId] ?? DEFAULT_PRESET;
}
