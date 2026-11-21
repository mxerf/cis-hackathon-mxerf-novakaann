import type { ScenarioPreset } from "./mirage.types.ts";

export const BANK_REFUND_TRAP_PRESET: ScenarioPreset = {
  id: "bank-refund-trap",
  shortLabel: {
    en: "Refund Scam",
    ru: "Отмена списания",
  },
  category: "scam",
  summary: {
    en: "Fake bank security + screen share + mirror-transfer paradox (Tier 1 <1ms + Haiku + CB-412)",
    ru: "Фейк-безопасность банка + показ экрана + зеркальный перевод (Алгоритм <1мс + Haiku + CB-412)",
  },
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
    unverifiedCaller: true,
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
      label: "Transit IBAN #1",
      value: "AE070331234567890123456",
      kind: "iban",
      suggestedAmount: 14500,
    },
    {
      label: "Backup IBAN #2",
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

export const STEALTH_EUPHEMISM_PRESET: ScenarioPreset = {
  id: "stealth-euphemism-scam",
  shortLabel: {
    en: "Stealth AI",
    ru: "Скрытый скам · AI",
  },
  category: "scam",
  summary: {
    en: "No screen share, no stop-words — Algorithm stays <30%, Haiku 5.5 + Pre-Transfer Gate trigger Mirage",
    ru: "Без показа экрана и стоп-слов — Алгоритм <30%, но Haiku 5.5 + Pre-Transfer Gate включают Мираж",
  },
  brandName: "Wio · Pulse Bank",
  walletSubtitle: {
    en: "UAE Retail Banking · AED Personal Account",
    ru: "Розничный банк ОАЭ · Личный счёт AED",
  },
  telecomCarrier: "du UAE · LTE",
  scenarioTitle: {
    en: "Stealth Euphemism Coercion · AI Semantic Catch Without Stop-Words",
    ru: "Скрытое давление на эвфемизмах · Перехват через AI Semantic",
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
    callerNumber: "+971 50 714 2910",
    callerLabel: "Account Review Specialist",
    simAgeDays: 90,
    unverifiedCaller: true,
  },
  scriptedChunks: [
    {
      id: "stealth-1",
      speaker: "caller",
      text: "Hi, I'm calling from the regional clearing desk regarding an internal audit adjustment on your profile.",
      coercionScoreDelta: 18,
      aiScore: 26,
      aiReasoning:
        "Caller mentions an internal clearing audit adjustment without demanding money yet; watching semantic intent.",
      flaggedTactics: ["authority_impersonation"],
      stageHint: "initial",
    },
    {
      id: "stealth-2",
      speaker: "victim",
      text: "Oh, is something wrong with my Everyday Account?",
      coercionScoreDelta: 0,
      flaggedTactics: [],
      stageHint: "initial",
    },
    {
      id: "stealth-3",
      speaker: "caller",
      text: "Nothing alarming, just move 3,500 AED to the temporary holding reference I texted you so our system matches the batch — please keep this routine check private while we finalize it.",
      coercionScoreDelta: 46,
      aiScore: 91,
      aiReasoning:
        "Stealth social engineering detected via euphemisms: directs an outbound 3,500 AED transfer to a texted holding reference while requesting secrecy.",
      flaggedTactics: ["euphemism_coercion", "secrecy_pressure", "safe_account_lure"],
      stageHint: "first_mule",
    },
    {
      id: "stealth-4",
      speaker: "caller",
      text: "That reference hit its batch cap — just use the second partner IBAN I sent for the same 3,500 AED and tap confirm so we close the ticket.",
      coercionScoreDelta: 14,
      aiScore: 96,
      aiReasoning:
        "Caller pivoted immediately to a second partner IBAN after CB-412 rejection to complete funds extraction.",
      flaggedTactics: ["mule_pivoting", "coercion_escalation"],
      stageHint: "backup_mule",
    },
  ],
  suggestedMules: [
    {
      label: "Partner IBAN #1",
      value: "AE190260001015884422110",
      kind: "iban",
      suggestedAmount: 3500,
    },
    {
      label: "Partner IBAN #2",
      value: "AE830330000019283746501",
      kind: "iban",
      suggestedAmount: 3500,
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
  shortLabel: {
    en: "du Vault",
    ru: "du / Сейф",
  },
  category: "scam",
  summary: {
    en: "2-day SIM + Emirates ID threat pushing Savings Vault withdrawal (YOUNG_SIM + VAULT_WITHDRAWAL flags)",
    ru: "Свежая SIM (2 дня) + давление по Emirates ID на вывод из сейфа (флаги YOUNG_SIM и VAULT_WITHDRAWAL)",
  },
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
    unverifiedCaller: true,
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
      label: "Safe-Custody IBAN #1",
      value: "AE070331234567890123456",
      kind: "iban",
      suggestedAmount: 12000,
    },
    {
      label: "Clearing IBAN #2",
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

export const LEGIT_CONTROL_PRESET: ScenarioPreset = {
  id: "legit-control-call",
  shortLabel: {
    en: "Legit Call",
    ru: "Обычный звонок",
  },
  category: "safe",
  summary: {
    en: "Saved contact splitting dinner deposit (500 AED) — green risk, 0 false positives, real settlement",
    ru: "Сохранённый контакт, ужин в Dubai Marina (500 AED) — зелёная зона, без Миража, реальное списание",
  },
  brandName: "Wio · Pulse Bank",
  walletSubtitle: {
    en: "UAE Retail Banking · AED Personal Account",
    ru: "Розничный банк ОАЭ · Личный счёт AED",
  },
  telecomCarrier: "du UAE · LTE",
  scenarioTitle: {
    en: "Control Case · Legitimate Friend Call & 500 AED Transfer",
    ru: "Контрольный кейс · Обычный звонок от друга и перевод 500 AED",
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
    callerNumber: "+971 50 412 8890",
    callerLabel: "Nadia Al-Mansoori (Saved Contact)",
    simAgeDays: 420,
    unverifiedCaller: false,
  },
  scriptedChunks: [
    {
      id: "legit-1",
      speaker: "caller",
      text: "Hey! Are we still on for dinner at Dubai Marina tonight?",
      coercionScoreDelta: 0,
      aiScore: 4,
      aiReasoning: "Casual dinner plans with a saved contact; zero coercion or fraud signals.",
      flaggedTactics: [],
      stageHint: "initial",
    },
    {
      id: "legit-2",
      speaker: "victim",
      text: "Yes! Let me split the booking deposit with you right now.",
      coercionScoreDelta: 0,
      flaggedTactics: [],
      stageHint: "initial",
    },
    {
      id: "legit-3",
      speaker: "caller",
      text: "Awesome, no rush at all — just send 500 AED whenever you open the app, see you at eight!",
      coercionScoreDelta: 0,
      aiScore: 8,
      aiReasoning:
        "Benign peer-to-peer dinner split with no urgency, secrecy, or authority pretext.",
      flaggedTactics: [],
      stageHint: "initial",
    },
  ],
  suggestedMules: [
    {
      label: "Nadia Al-Mansoori",
      value: "AE290331000044118822901",
      kind: "iban",
      suggestedAmount: 500,
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

export const ORDERED_PRESETS: readonly ScenarioPreset[] = [
  BANK_REFUND_TRAP_PRESET,
  STEALTH_EUPHEMISM_PRESET,
  UAE_DU_KYC_PRESET,
  LEGIT_CONTROL_PRESET,
];

export const DEFAULT_PRESET: ScenarioPreset = BANK_REFUND_TRAP_PRESET;

export const SCENARIO_PRESETS: Record<string, ScenarioPreset> = {
  [BANK_REFUND_TRAP_PRESET.id]: BANK_REFUND_TRAP_PRESET,
  [STEALTH_EUPHEMISM_PRESET.id]: STEALTH_EUPHEMISM_PRESET,
  [UAE_DU_KYC_PRESET.id]: UAE_DU_KYC_PRESET,
  [LEGIT_CONTROL_PRESET.id]: LEGIT_CONTROL_PRESET,
};

export function getPresetById(presetId: string): ScenarioPreset {
  return SCENARIO_PRESETS[presetId] ?? DEFAULT_PRESET;
}
