import type { Locale } from "../../shared/mirage-types.ts";

export type UiCopy = {
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
  algoLevelTitle: string;
  algoLevelSubtitle: string;
  aiLevelTitle: string;
  aiLevelSubtitle: string;
  screenShareToggle: string;
  screenShareBanner: string;
  noAlgoFlagsYet: string;
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
};

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
  xrayTitle: "2-Tier Antifraud & Mirage X-Ray",
  xraySubtitle:
    "Invisible to the scammer on screen-share — Algorithm + AI detection & honeytrap capture",
  callSimulatorTitle: "Active Phone Call & Detection Telemetry",
  startCall: "Start Call",
  endCall: "End Call",
  nextScriptedLine: "Play Next Scam Line",
  scriptFinished: "All scripted lines played",
  callerLabel: "Caller",
  simAgeBadge: "SIM age",
  coercionMeterLabel: "Ensemble Fraud Risk",
  thresholdHint: "Silent Mirage engages at 65+",
  algoLevelTitle: "Tier 1 · Algorithm Level",
  algoLevelSubtitle: "Flags, keywords & reversal syntax (<1ms)",
  aiLevelTitle: "Tier 2 · AI Semantic Level",
  aiLevelSubtitle: "Claude Haiku 5.5 manipulation intent",
  screenShareToggle: "Screen Share",
  screenShareBanner: "Screen Broadcast",
  noAlgoFlagsYet: "Monitoring OS flags, keywords & reversal syntax…",
  customLinePlaceholder: "Type a custom caller utterance…",
  sendCustomLine: "Inject",
  useAiAnalysis: "Live Haiku 5.5",
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
  trustedAlertSent: "Family Alert Triggered",
  trustedAlertStandby: "Family Alert Standby",
  noMulesYet:
    "No mule accounts captured yet. Once Mirage engages, transfers bait & log scammer accounts.",
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
  xrayTitle: "Двухуровневый антифрод и X-Ray Миража",
  xraySubtitle: "Невидимо для мошенника на показе экрана — Алгоритм + AI и ловушка дропов",
  callSimulatorTitle: "Телеметрия звонка и 2 уровня детекции",
  startCall: "Начать звонок",
  endCall: "Завершить",
  nextScriptedLine: "Следующая реплика мошенника",
  scriptFinished: "Все реплики сценария проиграны",
  callerLabel: "Звонящий",
  simAgeBadge: "Возраст SIM",
  coercionMeterLabel: "Итоговый риск фрода (Ансамбль)",
  thresholdHint: "Тихий переход в Мираж с 65+",
  algoLevelTitle: "Уровень 1 · Algorithm Level",
  algoLevelSubtitle: "Флаги ОС, ключевые слова и конструкции (<1мс)",
  aiLevelTitle: "Уровень 2 · AI Level",
  aiLevelSubtitle: "Семантическая оценка Claude Haiku 5.5",
  screenShareToggle: "Показ экрана",
  screenShareBanner: "Трансляция экрана",
  noAlgoFlagsYet: "Мониторинг флагов ОС, стоп-слов и конструкций…",
  customLinePlaceholder: "Введите произвольную реплику звонящего…",
  sendCustomLine: "Отправить",
  useAiAnalysis: "Живой Haiku 5.5",
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
  trustedAlertSent: "Уведомление близким создано",
  trustedAlertStandby: "Уведомление близким в ожидании",
  noMulesYet:
    "Реквизиты дропов пока не перехвачены. В режиме Миража переводы выманивают счета мошенника.",
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
