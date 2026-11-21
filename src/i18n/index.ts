import type { Locale } from "../core/mirage/types.ts";

export interface UiCopy {
  appTitle: string;
  stageBadge: string;
  mobileViewLink: string;
  stageViewLink: string;
  resetDemo: string;
  connected: string;
  reconnecting: string;
  modeNormal: string;
  modeMirage: string;
  xrayTitle: string;
  xraySubtitle: string;
  callSimulatorTitle: string;
  startCall: string;
  endCall: string;
  nextScriptedLine: string;
  scriptFinished: string;
  callerLabel: string;
  simAgeBadge: string;
  coercionMeterLabel: string;
  thresholdHint: string;
  customLinePlaceholder: string;
  sendCustomLine: string;
  useAiAnalysis: string;
  transcriptEmpty: string;
  vaultComparisonTitle: string;
  realVaultTitle: string;
  mirageLedgerTitle: string;
  realVaultProtected: string;
  realVaultLive: string;
  mirageLedgerMirrored: string;
  mirageLedgerActive: string;
  muleGraphTitle: string;
  honeytrapStageLabel: string;
  stageArmed: string;
  stageFirstRejected: string;
  stageCompleted: string;
  trustedAlertSent: string;
  trustedAlertStandby: string;
  noMulesYet: string;
  attemptBadge: string;
  walletTabHome: string;
  walletTabTransfer: string;
  walletTabSupport: string;
  totalBalance: string;
  activeCallBanner: string;
  fromAccount: string;
  recipientLabel: string;
  recipientPlaceholder: string;
  amountLabel: string;
  sendTransfer: string;
  quickFillLabel: string;
  recentReceipts: string;
  noReceiptsYet: string;
  supportPlaceholder: string;
  sendMessage: string;
  checkingLabel: string;
  vaultLabel: string;
}

const EN_COPY: UiCopy = {
  appTitle: "Mirage Shield",
  stageBadge: "Live Demo Stage",
  mobileViewLink: "Open /mobile",
  stageViewLink: "Open /stage",
  resetDemo: "Reset Demo",
  connected: "WS Live",
  reconnecting: "Reconnecting…",
  modeNormal: "NORMAL LEDGER",
  modeMirage: "MIRAGE ACTIVE · REAL FUNDS LOCKED",
  xrayTitle: "Telco & Bank Security X-Ray",
  xraySubtitle: "Invisible to the victim and caller — live coercion telemetry & honeytrap capture",
  callSimulatorTitle: "Active Phone Call Telemetry",
  startCall: "Start Call",
  endCall: "End Call",
  nextScriptedLine: "Play Next Scam Line",
  scriptFinished: "All scripted lines played",
  callerLabel: "Caller",
  simAgeBadge: "SIM age",
  coercionMeterLabel: "Coercion Score",
  thresholdHint: "Silent Mirage engages at 65+",
  customLinePlaceholder: "Type a custom caller utterance…",
  sendCustomLine: "Inject",
  useAiAnalysis: "AI Tactic Scoring",
  transcriptEmpty: "Start the simulated call or press Play Next Scam Line to stream coercion cues.",
  vaultComparisonTitle: "Real Vault vs Mirage Decoy Ledger",
  realVaultTitle: "Real Core Banking Vault",
  mirageLedgerTitle: "Mirage Shadow Ledger (Phone UI)",
  realVaultProtected: "LOCKED · 0 AED LEFT BANK",
  realVaultLive: "LIVE · STANDARD SETTLEMENT",
  mirageLedgerMirrored: "Synced mirror (standby)",
  mirageLedgerActive: "Decoy active (mutated on phone)",
  muleGraphTitle: "Honeytrap Mule Graph",
  honeytrapStageLabel: "Honeytrap",
  stageArmed: "Armed (will reject attempt #1)",
  stageFirstRejected: "Mule #1 baited · awaiting backup",
  stageCompleted: "Mules captured · decoy receipt issued",
  trustedAlertSent: "Trusted Alert Sent",
  trustedAlertStandby: "Trusted Alert Standby",
  noMulesYet: "No mule accounts captured yet. Once Mirage engages, transfers bait & log scammer accounts.",
  attemptBadge: "Attempt",
  walletTabHome: "Accounts",
  walletTabTransfer: "Transfer",
  walletTabSupport: "Support",
  totalBalance: "Total Available Balance",
  activeCallBanner: "Active voice call",
  fromAccount: "From Account",
  recipientLabel: "Recipient IBAN / Card / Phone",
  recipientPlaceholder: "AE07...",
  amountLabel: "Amount",
  sendTransfer: "Confirm Transfer",
  quickFillLabel: "Demo quick-fill",
  recentReceipts: "Recent Activity",
  noReceiptsYet: "No transfers yet.",
  supportPlaceholder: "Ask Priority Support…",
  sendMessage: "Send",
  checkingLabel: "Everyday",
  vaultLabel: "Savings",
};

const RU_COPY: UiCopy = {
  appTitle: "Mirage Shield",
  stageBadge: "Демо-сцена",
  mobileViewLink: "Открыть /mobile",
  stageViewLink: "Открыть /stage",
  resetDemo: "Сбросить демо",
  connected: "WS активен",
  reconnecting: "Переподключение…",
  modeNormal: "ОБЫЧНЫЙ РЕЖИМ",
  modeMirage: "МИРАЖ АКТИВЕН · РЕАЛЬНЫЕ ДЕНЬГИ ЗАЩИЩЕНЫ",
  xrayTitle: "X-Ray Телекома и Антифрода",
  xraySubtitle: "Невидимо для жертвы и мошенника — скоринг принуждения и ловушка дропов",
  callSimulatorTitle: "Телеметрия активного звонка",
  startCall: "Начать звонок",
  endCall: "Завершить",
  nextScriptedLine: "Следующая реплика мошенника",
  scriptFinished: "Все реплики сценария проиграны",
  callerLabel: "Звонящий",
  simAgeBadge: "Возраст SIM",
  coercionMeterLabel: "Индекс принуждения",
  thresholdHint: "Тихий переход в Мираж с 65+",
  customLinePlaceholder: "Введите произвольную реплику звонящего…",
  sendCustomLine: "Отправить",
  useAiAnalysis: "AI-анализ тактик",
  transcriptEmpty: "Запустите звонок или нажмите «Следующая реплика мошенника» для симуляции.",
  vaultComparisonTitle: "Реальный счёт vs Теневой Мираж",
  realVaultTitle: "Реальный банковский контур",
  mirageLedgerTitle: "Теневой баланс (экран телефона)",
  realVaultProtected: "ЗАБЛОКИРОВАН · 0 AED СПИСАНО",
  realVaultLive: "АКТИВЕН · ОБЫЧНЫЕ ПЕРЕВОДЫ",
  mirageLedgerMirrored: "Зеркало в ожидании",
  mirageLedgerActive: "Подмена активна на телефоне",
  muleGraphTitle: "Граф перехваченных дропов",
  honeytrapStageLabel: "Ловушка",
  stageArmed: "Взведена (отклонит попытку №1)",
  stageFirstRejected: "Дроп №1 пойман · ждём резервный",
  stageCompleted: "Дропы собраны · выдан фейк-чек",
  trustedAlertSent: "Алерт доверенным отправлен",
  trustedAlertStandby: "Алерт в ожидании",
  noMulesYet: "Реквизиты дропов пока не перехвачены. В режиме Миража переводы выманивают счета мошенника.",
  attemptBadge: "Попытка",
  walletTabHome: "Счета",
  walletTabTransfer: "Перевод",
  walletTabSupport: "Чат",
  totalBalance: "Доступный баланс",
  activeCallBanner: "Идёт голосовой звонок",
  fromAccount: "Счёт списания",
  recipientLabel: "IBAN / Карта / Телефон получателя",
  recipientPlaceholder: "AE07...",
  amountLabel: "Сумма",
  sendTransfer: "Подтвердить перевод",
  quickFillLabel: "Быстрая подстановка для демо",
  recentReceipts: "История операций",
  noReceiptsYet: "Переводов пока нет.",
  supportPlaceholder: "Написать в поддержку…",
  sendMessage: "Отправить",
  checkingLabel: "Текущий",
  vaultLabel: "Накопительный",
};

export function getUiCopy(locale: Locale): UiCopy {
  return locale === "ru" ? RU_COPY : EN_COPY;
}

export function formatMoney(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} ${currency}`;
}
