import type { Locale } from "../../shared/mirage-types.ts";

export type UiCopy = {
  presenterTag: string;
  caseTag: string;
  startCall: string;
  startDemo: string;
  startingDemo: string;
  nextScamLine: string;
  allLinesPlayed: string;
  endCall: string;
  stopSharing: string;
  shareScreen: string;
  reset: string;
  liveHaikuLabel: string;
  callerVoiceLabel: string;
  personaAriaLabel: string;
  personaVictim: string;
  personaGuardian: string;
  mobileLink: string;
  wsLive: string;
  wsOffline: string;
  connectingLabel: string;

  panelBrand: string;
  panelSubtitle: string;
  panelWaiting: string;
  panelModeMirage: string;
  panelModeMonitoring: string;
  panelModeStandby: string;
  caseBadgeScam: string;
  caseBadgeSafe: string;
  fraudProbabilityLabel: string;
  riskLow: string;
  riskElevated: string;
  riskMirageEngaged: string;
  thresholdNotchLabel: string;
  aiAnalyzingBadge: string;
  osSignalsLabel: string;
  toggleCallActive: string;
  toggleCallCooldown: string;
  toggleUnverifiedCaller: string;
  toggleScreenShare: string;
  toggleIbanPasted: string;
  cueDeckTitle: string;
  cuePlayNext: string;
  cueAllPlayed: string;
  cueScreenTag: string;
  cueLivePlaceholder: string;
  transcriptIdleHint: string;
  safeControlLedgerNote: string;
  signalCallActive: string;
  signalCallStillActive: string;
  signalCallCooldown: string;
  signalCallEnded: string;
  signalSharingOn: string;
  signalSharingOff: string;
  signalHiddenDetails: string;
  signalCustomerNotTold: string;
  speakerCaller: string;
  speakerCustomer: string;
  speakerAiDecoy: string;
  transcriptListening: string;
  injectPlaceholder: string;
  injectSend: string;
  tier1Title: string;
  tier1Waiting: string;
  tier2Title: string;
  sourceAi: string;
  sourceScripted: string;
  sourceFallback: string;
  sourceStandby: string;
  verdictActive: string;
  verdictInactive: string;
  verdictRiskPrefix: string;
  verdictActiveBody: string;
  verdictRevealedBody: string;
  verdictInactiveBody: string;
  actuallyTransferred: string;
  realBalanceLocked: string;
  realBalanceLive: string;
  phoneShowsMirage: string;
  phoneShowsLive: string;
  shadowSynced: string;
  liveLedgerSub: string;
  decoyDeltaSuffix: string;
  restoredAfterReveal: string;
  honeytrapLabel: string;
  stageArmed: string;
  stageFirstRejected: string;
  stageCompleted: string;
  honeytrapArmedHint: string;
  muleAttempt1Tag: string;
  muleAttempt2Tag: string;
  familyAlertSent: string;
  familyAlertStandby: string;
  familyAlertOpenTip: string;
  familyAlertBackTip: string;
  customerNotifiedNote: string;
  callerBlockedNote: string;

  lockDate: string;
  lockHint: string;
  pushAppName: string;
  pushNow: string;
  pushTitle: string;
  pushBodyPrefix: string;
  pushBodySuffix: string;
  pushFamilyNotified: string;

  searchPlaceholder: string;
  availableBalance: string;
  savingsBalance: string;
  debitCardLabel: string;
  vaultCardLabel: string;
  viewDetails: string;
  viewDetailsBlockedTip: string;
  sendMoney: string;
  actionTopUp: string;
  actionScan: string;
  actionStatements: string;
  transactionsTitle: string;
  earlierTransactions: string;
  spendingSubtitle: string;
  hiddenWhileSharing: string;
  transferToPrefix: string;
  todaySent: string;
  transferBlocked: string;
  noMoneyLeft: string;
  tabMain: string;
  tabPayments: string;
  tabCards: string;
  tabChat: string;
  tabMore: string;

  localTransferPill: string;
  fillIban1: string;
  fillIban2: string;
  fromPrefix: string;
  toPrefix: string;
  newRecipientTag: string;
  chooseRecipient: string;
  reviewTransfer: string;
  noFee: string;
  youAreSending: string;
  detailTo: string;
  detailIban: string;
  detailFrom: string;
  detailType: string;
  detailTypeValue: string;
  detailFee: string;
  detailStatus: string;
  detailDate: string;
  detailReference: string;
  detailBalance: string;
  detailNewBalance: string;
  confirmTransfer: string;
  sendingTransfer: string;
  transferComplete: string;
  statusSent: string;
  statusBlocked: string;
  ofPrefix: string;
  seeWhatHappened: string;
  done: string;

  cb412Title: string;
  cb412UseAlternate: string;
  close: string;

  safeSheetTitle: string;
  safeSheetBodyPrefix: string;
  safeSheetBodyMid: string;
  safeSheetBodySuffix: string;
  viewAccount: string;

  whatHappenedTitle: string;
  whatCallerSaid: string;
  whatYouDid: string;
  whatYouDidPrefix: string;
  whatBankDid: string;
  whatBankDidBody: string;
  whatBankDidMules: string;
  amountTransferred: string;
  blockNumber: string;
  numberBlocked: string;
  thisWasReal: string;
  backToAccount: string;

  askRealTitle: string;
  askRealBody: string;
  askRealAmountLabel: string;
  keepStopped: string;
  requestManualReview: string;
  manualReviewToast: string;

  callInProgress: string;
  backToCall: string;
  accountDetailsTitle: string;
  accountNumberLabel: string;
  cardNumberLabel: string;
  validThruLabel: string;

  recipientPickerTitle: string;
  recipientCustomLabel: string;
  recipientCustomPlaceholder: string;
  recipientNamePlaceholder: string;
  applyRecipient: string;

  statementsTitle: string;
  openStatement: string;
  octoberStatementTitle: string;
  statementSubPrefix: string;
  amountsHiddenSharing: string;
  openingBalance: string;
  moneyIn: string;
  moneyOut: string;
  closingBalance: string;

  supportTitle: string;
  supportSubtitle: string;
  supportPlaceholder: string;
  supportSend: string;

  toastSharingStopped: string;
  toastSharingStarted: string;
  toastCardHidden: string;
  toastTopUp: string;
  toastScan: string;
  toastNumberBlocked: string;
  toastNetworkError: string;
  checkingShort: string;
  vaultShort: string;
  currentAccountTitle: string;
  savingsVaultTitle: string;

  guardianAppBrand: string;
  guardianAppSubtitle: string;
  guardianBackVictim: string;
  guardianAllClearTitle: string;
  guardianAllClearSub: string;
  guardianLinkedProfile: string;
  guardianRulesTitle: string;
  guardianRuleAutoShield: string;
  guardianRuleAutoShieldVal: string;
  guardianRuleMasking: string;
  guardianRuleMaskingVal: string;
  guardianRuleAlert: string;
  guardianRuleAlertVal: string;
  guardianPushMeta: string;
  guardianPushNow: string;
  guardianPushTitle: string;
  guardianPushBody: string;
  guardianProtectedBalance: string;
  guardianLeftBankBadge: string;
  guardianIncidentTitle: string;
  guardianRiskScoreLabel: string;
  guardianAlgoPrefix: string;
  guardianAiPrefix: string;
  guardianStatusLabel: string;
  guardianStatusLive: string;
  guardianStatusEnded: string;
  guardianMulesLabel: string;
  guardianMulesWaiting: string;
  guardianMuleCb412: string;
  guardianMuleDecoy: string;
  guardianCallMom: string;
  guardianCallingMom: string;
  guardianHold24h: string;
  guardianHold24hActive: string;
  guardianFalseAlarm: string;
  guardianFalseAlarmToast: string;
};

const EN_COPY: UiCopy = {
  presenterTag: "Presenter",
  caseTag: "Case",
  startCall: "Start Call",
  startDemo: "Start demo",
  startingDemo: "Starting…",
  nextScamLine: "Next scam line",
  allLinesPlayed: "All lines played",
  endCall: "End Call",
  stopSharing: "Stop sharing",
  shareScreen: "Share screen",
  reset: "Reset",
  liveHaikuLabel: "Live Haiku 5.5",
  callerVoiceLabel: "Caller voice",
  personaAriaLabel: "Phone persona",
  personaVictim: "Victim",
  personaGuardian: "Guardian",
  mobileLink: "/mobile",
  wsLive: "WS Live",
  wsOffline: "Offline",
  connectingLabel: "Connecting to Mirage…",

  panelBrand: "Mirage",
  panelSubtitle: "real-time risk engine",
  panelWaiting: "Waiting for a call",
  panelModeMirage: "MIRAGE ACTIVE",
  panelModeMonitoring: "MONITORING",
  panelModeStandby: "STANDBY",
  caseBadgeScam: "SCAM SCENARIO",
  caseBadgeSafe: "SAFE CONTROL",
  fraudProbabilityLabel: "Fraud probability",
  riskLow: "Low risk",
  riskElevated: "Elevated",
  riskMirageEngaged: "Mirage engaged",
  thresholdNotchLabel: "65% MIRAGE",
  aiAnalyzingBadge: "ANALYZING…",
  osSignalsLabel: "OS signals",
  toggleCallActive: "Call",
  toggleCallCooldown: "Cooldown",
  toggleUnverifiedCaller: "Unverified",
  toggleScreenShare: "Screen",
  toggleIbanPasted: "IBAN",
  cueDeckTitle: "Case cue deck",
  cuePlayNext: "Play next",
  cueAllPlayed: "All played",
  cueScreenTag: "+Screen",
  cueLivePlaceholder: "Test any custom phrase live…",
  transcriptIdleHint: "Click any cue above or toggle OS flags to stream live risk signals…",
  safeControlLedgerNote: "Control scenario — real ledger settles normally with zero friction.",
  signalCallActive: "Call active",
  signalCallStillActive: "Call still active",
  signalCallCooldown: "Call ended · Cooldown",
  signalCallEnded: "Call ended",
  signalSharingOn: "Screen sharing on",
  signalSharingOff: "Screen sharing off",
  signalHiddenDetails: "Sensitive details hidden",
  signalCustomerNotTold: "Customer not told yet",
  speakerCaller: "Caller",
  speakerCustomer: "Customer",
  speakerAiDecoy: "Support",
  transcriptListening: "Listening to incoming call audio…",
  injectPlaceholder: "Inject custom caller line into Haiku 5.5…",
  injectSend: "Send",
  tier1Title: "Tier 1 · Algorithm (<1ms)",
  tier1Waiting: "Monitoring OS flags & reversal syntax…",
  tier2Title: "Tier 2 · AI Semantic",
  sourceAi: "AI LIVE",
  sourceScripted: "SCRIPTED",
  sourceFallback: "FALLBACK",
  sourceStandby: "STANDBY",
  verdictActive: "Mirage active",
  verdictInactive: "Mirage not active",
  verdictRiskPrefix: "Risk",
  verdictActiveBody:
    "Coercion detected — real vault locked while the phone runs in Mirage sandbox with Honeytrap active.",
  verdictRevealedBody:
    "Caller disconnected and screen sharing ended. Customer notified safely; 0 AED left the real vault.",
  verdictInactiveBody:
    "Evaluating call telemetry and semantic intent in real time; real ledger remains live below threshold.",
  actuallyTransferred: "Actually transferred",
  realBalanceLocked: "Real balance (locked)",
  realBalanceLive: "Real balance",
  phoneShowsMirage: "Phone shows (Mirage)",
  phoneShowsLive: "Phone balance",
  shadowSynced: "Shadow sandbox active",
  liveLedgerSub: "Live bank ledger",
  decoyDeltaSuffix: "decoy",
  restoredAfterReveal: "Restored after reveal",
  honeytrapLabel: "Honeytrap",
  stageArmed: "Armed",
  stageFirstRejected: "Mule #1 CB-412",
  stageCompleted: "Captured",
  honeytrapArmedHint: "Armed — attempt #1 returns CB-412 to extract backup mule IBAN.",
  muleAttempt1Tag: "CB-412 Bait",
  muleAttempt2Tag: "Decoy Settled",
  familyAlertSent: "Family Alert: Sent",
  familyAlertStandby: "Family Alert: Standby",
  familyAlertOpenTip: "Switch phone to Family Guardian view",
  familyAlertBackTip: "Switch phone back to Victim view",
  customerNotifiedNote: "Customer told after the call and screen sharing ended.",
  callerBlockedNote: "Caller number blocked.",

  lockDate: "Saturday, 21 November",
  lockHint: "Press Start demo",
  pushAppName: "nura bank",
  pushNow: "now",
  pushTitle: "Your money is safe",
  pushBodyPrefix: "We stopped a transfer of",
  pushBodySuffix: "Tap to see what happened.",
  pushFamilyNotified: "Family contact notified",

  searchPlaceholder: "Search",
  availableBalance: "Available balance",
  savingsBalance: "Savings vault balance",
  debitCardLabel: "Debit card",
  vaultCardLabel: "Vault account",
  viewDetails: "View details",
  viewDetailsBlockedTip: "Not available while you share your screen",
  sendMoney: "Send money",
  actionTopUp: "Top up",
  actionScan: "Scan",
  actionStatements: "Statements",
  transactionsTitle: "Transactions",
  earlierTransactions: "Earlier transactions",
  spendingSubtitle: "Spending in November",
  hiddenWhileSharing: "Hidden while you share your screen",
  transferToPrefix: "Transfer to",
  todaySent: "Today · Sent",
  transferBlocked: "Transfer blocked",
  noMoneyLeft: "No money left your account",
  tabMain: "Main",
  tabPayments: "Payments",
  tabCards: "Cards",
  tabChat: "Chat",
  tabMore: "More",

  localTransferPill: "Local transfer · UAE",
  fillIban1: "Fill IBAN #1",
  fillIban2: "Fill IBAN #2",
  fromPrefix: "from",
  toPrefix: "to",
  newRecipientTag: "New recipient",
  chooseRecipient: "Choose recipient",
  reviewTransfer: "Review transfer",
  noFee: "No fee",
  youAreSending: "You are sending",
  detailTo: "To",
  detailIban: "IBAN",
  detailFrom: "From",
  detailType: "Type",
  detailTypeValue: "Local transfer within UAE",
  detailFee: "Fee",
  detailStatus: "Status",
  detailDate: "Date",
  detailReference: "Reference",
  detailBalance: "Balance",
  detailNewBalance: "New balance",
  confirmTransfer: "Confirm transfer",
  sendingTransfer: "Sending…",
  transferComplete: "Transfer complete",
  statusSent: "Sent",
  statusBlocked: "Blocked",
  ofPrefix: "of",
  seeWhatHappened: "See what happened",
  done: "Done",

  cb412Title: "Beneficiary limit reached",
  cb412UseAlternate: "Use alternate IBAN",
  close: "Close",

  safeSheetTitle: "No money was sent",
  safeSheetBodyPrefix: "The caller said you were cancelling a payment. You were actually sending",
  safeSheetBodyMid: "to",
  safeSheetBodySuffix: "Mirage stopped the transfer.",
  viewAccount: "View account",

  whatHappenedTitle: "What happened",
  whatCallerSaid: "The caller said",
  whatYouDid: "You did",
  whatYouDidPrefix: "Confirmed a new transfer of",
  whatBankDid: "The bank did",
  whatBankDidBody: "Stopped the transfer in Mirage sandbox. No money left your account.",
  whatBankDidMules: "mule account(s) logged for fraud desk.",
  amountTransferred: "Amount transferred",
  blockNumber: "Block this number",
  numberBlocked: "Number blocked",
  thisWasReal: "This was a real transfer",
  backToAccount: "Back to account",

  askRealTitle: "Confirm real transfer?",
  askRealBody:
    "Because this transfer was isolated during a suspected coercion call, real funds stay protected until verified through an independent callback.",
  askRealAmountLabel: "Protected amount",
  keepStopped: "Keep it stopped",
  requestManualReview: "Request callback verification",
  manualReviewToast: "Verification logged — real funds stay protected",

  callInProgress: "Call in progress",
  backToCall: "Back to call",
  accountDetailsTitle: "Account details",
  accountNumberLabel: "Account number",
  cardNumberLabel: "Card number",
  validThruLabel: "Valid thru",

  recipientPickerTitle: "Recipient details",
  recipientCustomLabel: "IBAN / Card / Phone",
  recipientCustomPlaceholder: "AE07 0331 2345 6789 0123 456",
  recipientNamePlaceholder: "Beneficiary label (optional)",
  applyRecipient: "Use recipient",

  statementsTitle: "Statements",
  openStatement: "Open",
  octoberStatementTitle: "October 2026",
  statementSubPrefix: "Statement · Everyday account",
  amountsHiddenSharing: "Amounts hidden while you share your screen",
  openingBalance: "Opening balance",
  moneyIn: "Money in",
  moneyOut: "Money out",
  closingBalance: "Closing balance",

  supportTitle: "Priority Support",
  supportSubtitle: "UAEFTS Operations Desk",
  supportPlaceholder: "Ask Priority Support…",
  supportSend: "Send",

  toastSharingStopped: "Screen sharing stopped",
  toastSharingStarted: "You are sharing your screen",
  toastCardHidden: "Hidden while you share your screen",
  toastTopUp: "Top up via Apple Pay ready",
  toastScan: "QR scanner ready",
  toastNumberBlocked: "Caller number blocked",
  toastNetworkError: "Connection error — please try again",
  checkingShort: "Everyday",
  vaultShort: "Vault",
  currentAccountTitle: "Current account",
  savingsVaultTitle: "Savings vault",

  guardianAppBrand: "nura bank",
  guardianAppSubtitle: "Family Guardian",
  guardianBackVictim: "Victim",
  guardianAllClearTitle: "Protection active · All clear",
  guardianAllClearSub: "Live call & screen-share shield standing by.",
  guardianLinkedProfile: "Mom · Everyday + Vault",
  guardianRulesTitle: "Protection rules",
  guardianRuleAutoShield: "Mirage Auto-Shield",
  guardianRuleAutoShieldVal: "≥ 65% risk",
  guardianRuleMasking: "Screen-Share Masking",
  guardianRuleMaskingVal: "Enabled",
  guardianRuleAlert: "Instant Family Alert",
  guardianRuleAlertVal: "In-App Push",
  guardianPushMeta: "NURA BANK · FAMILY GUARDIAN",
  guardianPushNow: "NOW",
  guardianPushTitle: "Scam attempt intercepted",
  guardianPushBody: "Mom's account was moved into Mirage sandbox. No real money left the bank.",
  guardianProtectedBalance: "Protected balance",
  guardianLeftBankBadge: "left bank",
  guardianIncidentTitle: "Incident details",
  guardianRiskScoreLabel: "Risk score",
  guardianAlgoPrefix: "Algo",
  guardianAiPrefix: "AI",
  guardianStatusLabel: "Status",
  guardianStatusLive: "Call still live · Mirage masking active",
  guardianStatusEnded: "Call ended · Mom notified",
  guardianMulesLabel: "Captured mule accounts",
  guardianMulesWaiting: "Honeytrap armed · waiting for destination IBAN",
  guardianMuleCb412: "CB-412",
  guardianMuleDecoy: "Decoy",
  guardianCallMom: "Call Mom on trusted line",
  guardianCallingMom: "Calling Mom… (safe line)",
  guardianHold24h: "Keep 24h outbound hold",
  guardianHold24hActive: "24h safe hold enabled ✓",
  guardianFalseAlarm: "Mark as trusted / false alarm",
  guardianFalseAlarmToast: "Biometric verification required after call ends",
};

const RU_COPY: UiCopy = {
  presenterTag: "Сцена",
  caseTag: "Кейс",
  startCall: "Начать звонок",
  startDemo: "Старт демо",
  startingDemo: "Запуск…",
  nextScamLine: "След. реплика",
  allLinesPlayed: "Все реплики",
  endCall: "Завершить",
  stopSharing: "Стоп экран",
  shareScreen: "Показ экрана",
  reset: "Сброс",
  liveHaikuLabel: "Живой Haiku 5.5",
  callerVoiceLabel: "Голос",
  personaAriaLabel: "Режим телефона",
  personaVictim: "Клиент",
  personaGuardian: "Близкий",
  mobileLink: "/mobile",
  wsLive: "WS активен",
  wsOffline: "Офлайн",
  connectingLabel: "Подключение к Mirage…",

  panelBrand: "Mirage",
  panelSubtitle: "реалтайм-антифрод",
  panelWaiting: "Ожидание входящего звонка",
  panelModeMirage: "МИРАЖ АКТИВЕН",
  panelModeMonitoring: "МОНИТОРИНГ",
  panelModeStandby: "ОЖИДАНИЕ",
  caseBadgeScam: "СЦЕНАРИЙ СКАМА",
  caseBadgeSafe: "ЧИСТЫЙ КОНТРОЛЬ",
  fraudProbabilityLabel: "Вероятность фрода",
  riskLow: "Низкий риск",
  riskElevated: "Повышенный",
  riskMirageEngaged: "Мираж включён",
  thresholdNotchLabel: "65% МИРАЖ",
  aiAnalyzingBadge: "АНАЛИЗ…",
  osSignalsLabel: "Сигналы ОС",
  toggleCallActive: "Звонок",
  toggleCallCooldown: "Cooldown",
  toggleUnverifiedCaller: "Неизвест.",
  toggleScreenShare: "Экран",
  toggleIbanPasted: "IBAN",
  cueDeckTitle: "Реплики кейса",
  cuePlayNext: "След. фраза",
  cueAllPlayed: "Все сыграны",
  cueScreenTag: "+Экран",
  cueLivePlaceholder: "Проверить любую живую фразу…",
  transcriptIdleHint: "Нажмите на фразу выше или тумблер сигнала ОС для расчёта риска…",
  safeControlLedgerNote: "Контрольный кейс — реальные переводы проходят без ложных блокировок.",
  signalCallActive: "Идёт звонок",
  signalCallStillActive: "Звонок ещё активен",
  signalCallCooldown: "Звонок завершён · Cooldown",
  signalCallEnded: "Звонок завершён",
  signalSharingOn: "Показ экрана вкл.",
  signalSharingOff: "Показ экрана выкл.",
  signalHiddenDetails: "Данные счёта скрыты",
  signalCustomerNotTold: "Клиенту ещё не сообщили",
  speakerCaller: "Звонящий",
  speakerCustomer: "Клиент",
  speakerAiDecoy: "Поддержка",
  transcriptListening: "Слушаем аудиопоток звонка…",
  injectPlaceholder: "Ввести реплику звонящего в Haiku 5.5…",
  injectSend: "Отправить",
  tier1Title: "Уровень 1 · Алгоритм (<1мс)",
  tier1Waiting: "Мониторинг флагов ОС и конструкций…",
  tier2Title: "Уровень 2 · AI Семантика",
  sourceAi: "AI LIVE",
  sourceScripted: "СКРИПТ",
  sourceFallback: "ФОЛБЭК",
  sourceStandby: "ОЖИДАНИЕ",
  verdictActive: "Мираж активен",
  verdictInactive: "Мираж не активен",
  verdictRiskPrefix: "Риск",
  verdictActiveBody:
    "Обнаружено давление — реальный счёт заблокирован, телефон переведён в песочницу Mirage с ловушкой Honeytrap.",
  verdictRevealedBody:
    "Звонок и показ экрана завершены. Клиент безопасно уведомлён, 0 AED покинули реальный счёт.",
  verdictInactiveBody:
    "Оценка телеметрии звонка и намерения в реальном времени; обычный контур активен ниже порога.",
  actuallyTransferred: "Реально списано",
  realBalanceLocked: "Реальный счёт (защищён)",
  realBalanceLive: "Реальный счёт",
  phoneShowsMirage: "Экран телефона (Мираж)",
  phoneShowsLive: "Баланс на телефоне",
  shadowSynced: "Теневой баланс активен",
  liveLedgerSub: "Основной контур банка",
  decoyDeltaSuffix: "мираж",
  restoredAfterReveal: "Восстановлен после раскрытия",
  honeytrapLabel: "Ловушка",
  stageArmed: "Взведена",
  stageFirstRejected: "Дроп #1 CB-412",
  stageCompleted: "Собраны",
  honeytrapArmedHint: "Взведена — попытка #1 вернёт CB-412 для выманивания резервного IBAN.",
  muleAttempt1Tag: "CB-412 Приманка",
  muleAttempt2Tag: "Мираж-чек",
  familyAlertSent: "Близкие: Уведомлены",
  familyAlertStandby: "Близкие: Ожидание",
  familyAlertOpenTip: "Открыть экран доверенного лица (Family Guardian)",
  familyAlertBackTip: "Вернуться к телефону клиента",
  customerNotifiedNote: "Клиенту сообщили после завершения звонка и показа экрана.",
  callerBlockedNote: "Номер звонящего заблокирован.",

  lockDate: "Суббота, 21 ноября",
  lockHint: "Нажмите «Старт демо»",
  pushAppName: "nura bank",
  pushNow: "сейчас",
  pushTitle: "Ваши деньги в безопасности",
  pushBodyPrefix: "Мы остановили перевод на",
  pushBodySuffix: "Нажмите, чтобы узнать детали.",
  pushFamilyNotified: "Доверенное лицо уведомлено",

  searchPlaceholder: "Поиск",
  availableBalance: "Доступный баланс",
  savingsBalance: "Накопительный сейф",
  debitCardLabel: "Дебетовая карта",
  vaultCardLabel: "Счёт сейфа",
  viewDetails: "Реквизиты",
  viewDetailsBlockedTip: "Скрыто во время показа экрана",
  sendMoney: "Перевести",
  actionTopUp: "Пополнить",
  actionScan: "Скан QR",
  actionStatements: "Выписки",
  transactionsTitle: "Операции",
  earlierTransactions: "Прошлые операции",
  spendingSubtitle: "Расходы в ноябре",
  hiddenWhileSharing: "Скрыто, пока включён показ экрана",
  transferToPrefix: "Перевод:",
  todaySent: "Сегодня · Отправлено",
  transferBlocked: "Перевод остановлен",
  noMoneyLeft: "Деньги остались на счёте",
  tabMain: "Главная",
  tabPayments: "Платежи",
  tabCards: "Карты",
  tabChat: "Чат",
  tabMore: "Ещё",

  localTransferPill: "Перевод по ОАЭ",
  fillIban1: "Вставить IBAN #1",
  fillIban2: "Вставить IBAN #2",
  fromPrefix: "со счёта",
  toPrefix: "кому:",
  newRecipientTag: "Новый получатель",
  chooseRecipient: "Выбрать получателя",
  reviewTransfer: "Проверить перевод",
  noFee: "Без комиссии",
  youAreSending: "Сумма перевода",
  detailTo: "Получатель",
  detailIban: "IBAN",
  detailFrom: "Счёт списания",
  detailType: "Тип",
  detailTypeValue: "Локальный перевод по ОАЭ",
  detailFee: "Комиссия",
  detailStatus: "Статус",
  detailDate: "Дата",
  detailReference: "Референс",
  detailBalance: "Баланс",
  detailNewBalance: "Новый баланс",
  confirmTransfer: "Подтвердить перевод",
  sendingTransfer: "Отправка…",
  transferComplete: "Перевод выполнен",
  statusSent: "Отправлено",
  statusBlocked: "Остановлено",
  ofPrefix: "из",
  seeWhatHappened: "Что произошло",
  done: "Готово",

  cb412Title: "Лимит получателя исчерпан",
  cb412UseAlternate: "Указать другой IBAN",
  close: "Закрыть",

  safeSheetTitle: "Деньги не были отправлены",
  safeSheetBodyPrefix: "Звонящий говорил об отмене платежа, но фактически оформлялся перевод на",
  safeSheetBodyMid: "получателю",
  safeSheetBodySuffix: "Mirage остановил операцию.",
  viewAccount: "Открыть счёт",

  whatHappenedTitle: "Что произошло",
  whatCallerSaid: "Звонящий говорил",
  whatYouDid: "Вы подтвердили",
  whatYouDidPrefix: "Новый исходящий перевод на",
  whatBankDid: "Что сделал банк",
  whatBankDidBody: "Перехватил перевод в песочнице Mirage. Деньги не покинули счёт.",
  whatBankDidMules: "счёт(а) дропов переданы в антифрод.",
  amountTransferred: "Фактически списано",
  blockNumber: "Заблокировать номер",
  numberBlocked: "Номер заблокирован",
  thisWasReal: "Это был мой реальный перевод",
  backToAccount: "Вернуться к счёту",

  askRealTitle: "Подтвердить реальный перевод?",
  askRealBody:
    "Перевод был изолирован во время подозрительного звонка. Реальные средства остаются под защитой до независимого обратного звонка банка.",
  askRealAmountLabel: "Защищённая сумма",
  keepStopped: "Оставить остановленным",
  requestManualReview: "Запросить проверку колл-центром",
  manualReviewToast: "Запрос зафиксирован — реальные средства под защитой",

  callInProgress: "Идёт звонок",
  backToCall: "Вернуться к звонку",
  accountDetailsTitle: "Реквизиты счёта",
  accountNumberLabel: "Номер счёта",
  cardNumberLabel: "Номер карты",
  validThruLabel: "Срок действия",

  recipientPickerTitle: "Данные получателя",
  recipientCustomLabel: "IBAN / Карта / Телефон",
  recipientCustomPlaceholder: "AE07 0331 2345 6789 0123 456",
  recipientNamePlaceholder: "Имя получателя (необязательно)",
  applyRecipient: "Выбрать",

  statementsTitle: "Выписки",
  openStatement: "Открыть",
  octoberStatementTitle: "Октябрь 2026",
  statementSubPrefix: "Выписка · Текущий счёт",
  amountsHiddenSharing: "Суммы скрыты во время показа экрана",
  openingBalance: "Входящий остаток",
  moneyIn: "Поступления",
  moneyOut: "Списания",
  closingBalance: "Исходящий остаток",

  supportTitle: "Приоритетная поддержка",
  supportSubtitle: "Служба операций UAEFTS",
  supportPlaceholder: "Написать в поддержку…",
  supportSend: "Отправить",

  toastSharingStopped: "Показ экрана остановлен",
  toastSharingStarted: "Вы делитесь экраном",
  toastCardHidden: "Скрыто во время показа экрана",
  toastTopUp: "Пополнение через Apple Pay готово",
  toastScan: "Сканер QR готов",
  toastNumberBlocked: "Номер звонящего заблокирован",
  toastNetworkError: "Ошибка сети — попробуйте снова",
  checkingShort: "Текущий",
  vaultShort: "Сейф",
  currentAccountTitle: "Текущий счёт",
  savingsVaultTitle: "Сберегательный сейф",

  guardianAppBrand: "nura bank",
  guardianAppSubtitle: "Family Guardian",
  guardianBackVictim: "Клиент",
  guardianAllClearTitle: "Защита активна · Всё спокойно",
  guardianAllClearSub: "Мониторинг звонков и показа экрана работает в фоне.",
  guardianLinkedProfile: "Мама · Счета под защитой",
  guardianRulesTitle: "Правила защиты",
  guardianRuleAutoShield: "Авто-Мираж",
  guardianRuleAutoShieldVal: "≥ 65% риск",
  guardianRuleMasking: "Скрытие при показе экрана",
  guardianRuleMaskingVal: "Включено",
  guardianRuleAlert: "Уведомление близким",
  guardianRuleAlertVal: "In-App Push",
  guardianPushMeta: "NURA BANK · FAMILY GUARDIAN",
  guardianPushNow: "СЕЙЧАС",
  guardianPushTitle: "Попытка обмана мамы перехвачена",
  guardianPushBody: "Сессия мамы тихо уведена в Мираж. Реальные деньги в безопасности.",
  guardianProtectedBalance: "Защищённый баланс",
  guardianLeftBankBadge: "ушло из банка",
  guardianIncidentTitle: "Детали инцидента",
  guardianRiskScoreLabel: "Оценка риска",
  guardianAlgoPrefix: "Алг",
  guardianAiPrefix: "AI",
  guardianStatusLabel: "Статус",
  guardianStatusLive: "Звонок идёт · Мираж скрывает счёт",
  guardianStatusEnded: "Звонок завершён · Мама уведомлена",
  guardianMulesLabel: "Пойманные счета дропов",
  guardianMulesWaiting: "Ловушка взведена · ждём IBAN мошенника",
  guardianMuleCb412: "CB-412",
  guardianMuleDecoy: "Мираж",
  guardianCallMom: "Позвонить маме по защищённой линии",
  guardianCallingMom: "Звоним маме… (защищённая линия)",
  guardianHold24h: "Удерживать исходящие 24 часа",
  guardianHold24hActive: "Защита на 24ч включена ✓",
  guardianFalseAlarm: "Отметить как ложную тревогу",
  guardianFalseAlarmToast: "Нужна биометрия после завершения звонка",
};

export function getUiCopy(locale: Locale): UiCopy {
  return locale === "ru" ? RU_COPY : EN_COPY;
}

export function formatAed(amount: number, currency = "AED", decimals?: number): string {
  const dp = decimals ?? (amount % 1 === 0 ? 0 : 2);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(amount);
  return `${currency} ${formatted}`;
}

export function formatNumber(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatIban(raw: string): string {
  const compact = raw.replace(/\s+/g, "");
  if (compact.length < 12) {
    return raw;
  }
  return compact.replace(/(.{4})/g, "$1 ").trim();
}

export function maskLast4(value: string): string {
  const compact = value.replace(/\s+/g, "");
  return `•••• ${compact.slice(-4)}`;
}

export function maskIfSharing(value: string, isScreenSharing: boolean): string {
  return isScreenSharing ? maskLast4(value) : formatIban(value);
}

export function shortIban(value: string): string {
  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 10) {
    return compact;
  }
  return `${compact.slice(0, 4)}…${compact.slice(-4)}`;
}

export function getInitials(label: string): string {
  const cleaned = label.replace(/[^A-Za-zА-Яа-я0-9\s]/g, " ").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return (cleaned.slice(0, 2) || "TR").toUpperCase();
}
