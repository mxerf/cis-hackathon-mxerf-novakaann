import { ArrowLeftRight, CreditCard, Home, LayoutGrid, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getVisibleAccounts,
  type DecoyReceipt,
  type DetectionSignals,
  type MirageState,
  type ScenarioPreset,
  type SuggestedMule,
} from "../../../shared/mirage-types.ts";
import { getUiCopy, shortIban } from "../../lib/ui-copy.ts";
import { WalletHome } from "./wallet-home.tsx";
import {
  WalletHappened,
  WalletLock,
  WalletReceipt,
  WalletStatements,
} from "./wallet-receipt-flow.tsx";
import { WalletReview, WalletSend } from "./wallet-send.tsx";
import { WalletSheets, type WalletSheetKind } from "./wallet-sheets.tsx";
import { WalletSupportChat } from "./wallet-support-chat.tsx";
import type { TransferActionResponse } from "./use-mirage-sync.ts";

type WalletScreen =
  | "lock"
  | "home"
  | "send"
  | "review"
  | "complete"
  | "happened"
  | "statements"
  | "statement"
  | "chat";

export type MobileWalletProps = {
  state: MirageState;
  preset: ScenarioPreset;
  isBusy: boolean;
  startUnlocked?: boolean;
  onEndCall: () => Promise<void>;
  onUpdateSignals: (patch: Partial<DetectionSignals>) => Promise<void>;
  onSubmitTransfer: (input: {
    fromAccountId: string;
    recipientValue: string;
    recipientLabel?: string;
    amount: number;
  }) => Promise<TransferActionResponse | null>;
  onSendSupport: (text: string) => Promise<void>;
  onRevealChange?: (revealed: boolean) => void;
  onCallerBlockedChange?: (blocked: boolean) => void;
};

const NEUTRAL_BENEFICIARY_BY_IBAN: Record<string, { en: string; ru: string }> = {
  AE070331234567890123456: {
    en: "UAEFTS Clearing Transit",
    ru: "Транзитный счёт UAEFTS",
  },
  AE460090000000123456789: {
    en: "Reserve Clearing Account",
    ru: "Резервный клиринговый счёт",
  },
  AE190260001015884422110: {
    en: "Partner Holding Reference",
    ru: "Партнёрский счёт #1",
  },
  AE830330000019283746501: {
    en: "Partner Settlement Account",
    ru: "Резервный счёт партнёра",
  },
};

function sanitizeBeneficiaryLabel(rawLabel: string, rawValue: string, locale: "en" | "ru"): string {
  const normalized = rawValue.replace(/[\s-]/g, "").toUpperCase();
  const mapped = NEUTRAL_BENEFICIARY_BY_IBAN[normalized];
  if (mapped) {
    return mapped[locale];
  }
  if (/scammer|mule|дроп|мошенник/i.test(rawLabel)) {
    return locale === "ru" ? "Внешний получатель" : "External Beneficiary";
  }
  return rawLabel || shortIban(rawValue);
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function MobileWallet({
  state,
  preset,
  isBusy,
  startUnlocked = true,
  onEndCall,
  onUpdateSignals,
  onSubmitTransfer,
  onSendSupport,
  onRevealChange,
  onCallerBlockedChange,
}: MobileWalletProps) {
  const copy = getUiCopy(state.locale);
  const isScreenSharing = state.call.detection.signals.screenSharing;
  const isCallOrActivityStarted =
    state.call.active || state.call.transcript.length > 0 || state.receipts.length > 0;

  const [screen, setScreen] = useState<WalletScreen>(
    startUnlocked || isCallOrActivityStarted ? "home" : "lock",
  );
  const [selectedAccountId, setSelectedAccountId] = useState(
    state.realAccounts[0]?.id ?? "acc-checking",
  );
  const [fromAccountId, setFromAccountId] = useState(state.realAccounts[0]?.id ?? "acc-checking");
  const [recipientValue, setRecipientValue] = useState("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [highlightBackupMule, setHighlightBackupMule] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [cb412Error, setCb412Error] = useState("");
  const [activeSheet, setActiveSheet] = useState<WalletSheetKind>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<DecoyReceipt | null>(null);
  const [showLockPush, setShowLockPush] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [isCallerBlocked, setIsCallerBlocked] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [callSeconds, setCallSeconds] = useState(0);

  const toastTimerRef = useRef<number | null>(null);
  const callStartRef = useRef<number | null>(state.call.active ? Date.now() : null);

  const showToast = useCallback((message: string) => {
    setToastText(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastText(null);
      toastTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (screen === "lock" && !showLockPush && isCallOrActivityStarted) {
      setScreen("home");
    }
  }, [isCallOrActivityStarted, screen, showLockPush]);

  useEffect(() => {
    if (!state.call.active) {
      callStartRef.current = null;
      return;
    }
    if (callStartRef.current === null) {
      callStartRef.current = Date.now();
      setCallSeconds(0);
    }
    const intervalId = window.setInterval(() => {
      if (callStartRef.current !== null) {
        setCallSeconds(Math.floor((Date.now() - callStartRef.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [state.call.active]);

  useEffect(() => {
    if (isScreenSharing && activeSheet === "details") {
      setActiveSheet(null);
    }
  }, [activeSheet, isScreenSharing]);

  useEffect(() => {
    const canRevealNow =
      state.mode === "mirage" &&
      state.receipts.length > 0 &&
      !state.call.active &&
      !isScreenSharing &&
      !hasRevealed;

    if (canRevealNow) {
      setHasRevealed(true);
      setShowLockPush(true);
      setActiveSheet(null);
      onRevealChange?.(true);
    }
  }, [
    hasRevealed,
    isScreenSharing,
    onRevealChange,
    state.call.active,
    state.mode,
    state.receipts.length,
  ]);

  const displayedAccounts = hasRevealed ? state.realAccounts : getVisibleAccounts(state);
  const activeAccount =
    displayedAccounts.find((acc) => acc.id === selectedAccountId) ?? displayedAccounts[0];
  const fromAccount =
    displayedAccounts.find((acc) => acc.id === fromAccountId) ?? displayedAccounts[0];
  const latestReceipt = selectedReceipt ?? state.receipts[0] ?? null;

  const recipientDisplayName = useCallback(
    (rawValue: string): string => {
      const normalized = rawValue.replace(/[\s-]/g, "").toUpperCase();
      const matchedMule = state.capturedMules.find(
        (m) => m.value.replace(/[\s-]/g, "").toUpperCase() === normalized,
      );
      if (matchedMule?.label) {
        return sanitizeBeneficiaryLabel(matchedMule.label, rawValue, state.locale);
      }
      const matchedSuggested = preset.suggestedMules.find(
        (m) => m.value.replace(/[\s-]/g, "").toUpperCase() === normalized,
      );
      if (matchedSuggested?.label) {
        return sanitizeBeneficiaryLabel(matchedSuggested.label, rawValue, state.locale);
      }
      return shortIban(rawValue);
    },
    [preset.suggestedMules, state.capturedMules, state.locale],
  );

  const markClipboardPaste = useCallback(() => {
    if (state.call.active && !state.call.detection.signals.clipboardPasteDetected) {
      void onUpdateSignals({ clipboardPasteDetected: true });
    }
  }, [onUpdateSignals, state.call.active, state.call.detection.signals.clipboardPasteDetected]);

  const handleKeypadInput = useCallback((key: string) => {
    setAmountInput((prev) => {
      if (key === "del") {
        return prev.slice(0, -1);
      }
      if (key === ".") {
        if (prev.includes(".")) {
          return prev;
        }
        return `${prev || "0"}.`;
      }
      if (prev.includes(".")) {
        const decimals = prev.split(".")[1] ?? "";
        return decimals.length < 2 ? `${prev}${key}` : prev;
      }
      if (prev.length >= 7) {
        return prev;
      }
      return `${prev === "0" ? "" : prev}${key}`;
    });
  }, []);

  function handleSelectSuggestedMule(mule: SuggestedMule) {
    setRecipientValue(mule.value);
    setRecipientLabel(sanitizeBeneficiaryLabel(mule.label, mule.value, state.locale));
    setAmountInput(String(mule.suggestedAmount));
    setHighlightBackupMule(false);
    if (preset.category !== "safe") {
      markClipboardPaste();
    }
  }

  function handleCycleFromAccount() {
    if (displayedAccounts.length <= 1) {
      return;
    }
    const idx = displayedAccounts.findIndex((acc) => acc.id === fromAccountId);
    const next = displayedAccounts[(idx + 1) % displayedAccounts.length];
    if (next) {
      setFromAccountId(next.id);
    }
  }

  async function handleConfirmTransfer() {
    if (isSubmittingTransfer || !fromAccount) {
      return;
    }
    const numericAmount = Number(amountInput);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !recipientValue.trim()) {
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const response = await onSubmitTransfer({
        fromAccountId: fromAccount.id,
        recipientValue: recipientValue.trim(),
        recipientLabel: recipientLabel.trim() || undefined,
        amount: numericAmount,
      });

      if (!response) {
        showToast(copy.toastNetworkError);
        return;
      }

      if (response.outcome === "rejected_honeytrap") {
        setCb412Error(response.errorMessage ?? preset.honeytrapRejectionMessage[state.locale]);
        setActiveSheet("honeytrap_cb412");
        return;
      }

      if (response.receipt) {
        setSelectedReceipt(response.receipt);
        setHighlightBackupMule(false);
        setScreen("complete");
        return;
      }

      if (response.errorMessage) {
        showToast(response.errorMessage);
      }
    } finally {
      setIsSubmittingTransfer(false);
    }
  }

  async function handleToggleSharing() {
    const next = !isScreenSharing;
    if (next) {
      setActiveSheet((prev) => (prev === "details" ? null : prev));
    }
    await onUpdateSignals({ screenSharing: next });
    showToast(next ? copy.toastSharingStarted : copy.toastSharingStopped);
  }

  async function handleEndCallFromSheet() {
    setActiveSheet(null);
    await onEndCall();
  }

  function handleUseAlternateIban() {
    setActiveSheet(null);
    setRecipientValue("");
    setRecipientLabel("");
    setHighlightBackupMule(true);
    setScreen("send");
  }

  function handleOpenPush() {
    setShowLockPush(false);
    setScreen("home");
    setActiveSheet("revealed_safe");
  }

  function handleBlockCaller() {
    setIsCallerBlocked(true);
    onCallerBlockedChange?.(true);
    showToast(copy.toastNumberBlocked);
  }

  const callerEntries = state.call.transcript.filter((entry) => entry.speaker === "caller");
  const latestCallerLine =
    [...callerEntries]
      .reverse()
      .find((entry) => /cancel|reverse|refund|mirror|отмен|зеркальн/i.test(entry.text))?.text ??
    callerEntries[callerEntries.length - 1]?.text ??
    "Let's cancel that 14,500 AED payment.";

  const stoppedAmount = latestReceipt?.amount ?? preset.suggestedMules[0]?.suggestedAmount ?? 14500;
  const fallbackMule = preset.suggestedMules[1] ?? preset.suggestedMules[0];
  const stoppedRecipient = latestReceipt
    ? recipientDisplayName(latestReceipt.recipientValue)
    : fallbackMule
      ? sanitizeBeneficiaryLabel(fallbackMule.label, fallbackMule.value, state.locale)
      : "External Beneficiary";
  const sanitizedSuggestedMules = preset.suggestedMules.map((mule) => ({
    ...mule,
    label: sanitizeBeneficiaryLabel(mule.label, mule.value, state.locale),
  }));
  const isStoppedRevealed = hasRevealed && state.mode === "mirage";
  const isLockView = showLockPush || screen === "lock";
  const showBottomTabs = !isLockView && (screen === "home" || screen === "chat");
  const callDuration = formatDuration(callSeconds);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className={`flex h-[54px] flex-none items-center justify-between px-[30px] pt-1.5 text-[15px] font-semibold ${
          isLockView ? "absolute inset-x-0 top-0 z-10 text-white" : "text-[var(--foreground)]"
        }`}
      >
        <span>9:41</span>
        <span className="flex items-center gap-[5px]" aria-hidden="true">
          <span
            className="inline-block h-[11px] w-[17px] rounded-[2px] bg-current"
            style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
          />
          <span className="inline-block h-[11px] w-[24px] rounded-[3px] bg-current" />
        </span>
      </div>

      {isLockView ? (
        <WalletLock
          locale={state.locale}
          showPush={showLockPush}
          stoppedAmount={stoppedAmount}
          currency={preset.currency}
          trustedAlertSent={state.trustedAlertSent}
          onUnlockIdle={() => setScreen("home")}
          onOpenPush={handleOpenPush}
        />
      ) : (
        <>
          {state.call.active && (
            <div className="mx-3.5 mt-0.5 flex h-[30px] flex-none items-center gap-2 rounded-full bg-[var(--call-green)] px-3 text-[12px] font-semibold text-white">
              <button
                type="button"
                onClick={() => setActiveSheet("call")}
                aria-label="Call options"
                className="flex h-full min-w-0 items-center gap-1.5 text-left text-white"
              >
                <span className="animate-mirage-blink h-[7px] w-[7px] flex-none rounded-full bg-white" />
                <span className="truncate">{state.call.callerNumber}</span>
                <span className="mono font-medium opacity-95">{callDuration}</span>
                <span className="text-[10px] opacity-85">▾</span>
              </button>

              {isScreenSharing ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleToggleSharing()}
                  className="ml-auto flex flex-none items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-0.5 text-[11px] font-bold text-white transition hover:bg-black/35"
                >
                  <span className="h-[6px] w-[6px] rounded-full bg-[var(--destructive)]" />
                  {copy.stopSharing}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void handleToggleSharing()}
                  className="ml-auto flex-none rounded-full bg-white/22 px-2.5 py-0.5 text-[11px] font-bold text-white transition hover:bg-white/30"
                >
                  {copy.shareScreen}
                </button>
              )}
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col px-4 pt-3 pb-4">
            {screen === "home" && (
              <WalletHome
                locale={state.locale}
                accounts={displayedAccounts}
                selectedAccountId={selectedAccountId}
                receipts={state.receipts}
                isScreenSharing={isScreenSharing}
                isStoppedRevealed={isStoppedRevealed}
                recipientDisplayName={recipientDisplayName}
                onSelectAccount={(id) => {
                  setSelectedAccountId(id);
                  setFromAccountId(id);
                }}
                onOpenDetails={() => {
                  if (!isScreenSharing) {
                    setActiveSheet("details");
                  }
                }}
                onOpenSend={() => setScreen("send")}
                onOpenStatements={() => setScreen("statements")}
                onOpenReceipt={(receipt) => {
                  setSelectedReceipt(receipt);
                  setScreen("complete");
                }}
                onShowToast={showToast}
              />
            )}

            {screen === "send" && (
              <WalletSend
                locale={state.locale}
                accounts={displayedAccounts}
                fromAccountId={fromAccountId}
                recipientValue={recipientValue}
                recipientLabel={recipientLabel}
                amountInput={amountInput}
                suggestedMules={preset.suggestedMules}
                highlightBackupMule={highlightBackupMule}
                isScreenSharing={isScreenSharing}
                onBack={() => setScreen("home")}
                onCycleFromAccount={handleCycleFromAccount}
                onOpenRecipientPicker={() => setActiveSheet("recipient_picker")}
                onSelectSuggestedMule={handleSelectSuggestedMule}
                onKeypadInput={handleKeypadInput}
                onOpenReview={() => setScreen("review")}
              />
            )}

            {screen === "review" && fromAccount && (
              <WalletReview
                locale={state.locale}
                fromAccount={fromAccount}
                recipientValue={recipientValue}
                recipientLabel={recipientLabel}
                amount={Number(amountInput) || 0}
                isScreenSharing={isScreenSharing}
                isSubmitting={isSubmittingTransfer}
                onBack={() => setScreen("send")}
                onConfirm={() => void handleConfirmTransfer()}
              />
            )}

            {screen === "complete" && latestReceipt && (
              <WalletReceipt
                locale={state.locale}
                receipt={latestReceipt}
                recipientDisplay={recipientDisplayName(latestReceipt.recipientValue)}
                shownBalance={fromAccount?.balance ?? activeAccount?.balance ?? 0}
                currency={latestReceipt.currency}
                isStoppedRevealed={isStoppedRevealed}
                onSeeWhatHappened={() => setScreen("happened")}
                onDone={() => {
                  setRecipientValue("");
                  setRecipientLabel("");
                  setAmountInput("");
                  setScreen("home");
                }}
              />
            )}

            {screen === "happened" && (
              <WalletHappened
                locale={state.locale}
                callerQuote={latestCallerLine}
                amount={stoppedAmount}
                currency={preset.currency}
                recipientDisplay={stoppedRecipient}
                capturedMulesCount={state.capturedMules.length}
                isBlocked={isCallerBlocked}
                onBlockNumber={handleBlockCaller}
                onAskReal={() => setActiveSheet("ask_real")}
                onBackToAccount={() => setScreen("home")}
              />
            )}

            {(screen === "statements" || screen === "statement") && (
              <WalletStatements
                locale={state.locale}
                isScreenSharing={isScreenSharing}
                view={screen === "statement" ? "detail" : "list"}
                onBack={() => setScreen(screen === "statement" ? "statements" : "home")}
                onOpenOctober={() => setScreen("statement")}
              />
            )}

            {screen === "chat" && (
              <WalletSupportChat
                locale={state.locale}
                messages={state.supportMessages}
                isBusy={isBusy}
                onBack={() => setScreen("home")}
                onSendMessage={onSendSupport}
              />
            )}
          </div>

          {showBottomTabs && (
            <nav className="flex h-[62px] flex-none items-center justify-around bg-[var(--background)] px-2 pb-1.5 text-[10.5px] font-semibold">
              <button
                type="button"
                onClick={() => setScreen("home")}
                className={`flex flex-col items-center gap-1 transition ${
                  screen === "home"
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Home className="h-[20px] w-[20px]" />
                <span>{copy.tabMain}</span>
              </button>

              <button
                type="button"
                onClick={() => setScreen("send")}
                className="flex flex-col items-center gap-1 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                <ArrowLeftRight className="h-[20px] w-[20px]" />
                <span>{copy.tabPayments}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isScreenSharing) {
                    showToast(copy.toastCardHidden);
                  } else {
                    setActiveSheet("details");
                  }
                }}
                className="flex flex-col items-center gap-1 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                <CreditCard className="h-[20px] w-[20px]" />
                <span>{copy.tabCards}</span>
              </button>

              <button
                type="button"
                onClick={() => setScreen("chat")}
                className={`flex flex-col items-center gap-1 transition ${
                  screen === "chat"
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <MessageSquare className="h-[20px] w-[20px]" />
                <span>{copy.tabChat}</span>
              </button>

              <button
                type="button"
                onClick={() => setScreen("statements")}
                className="flex flex-col items-center gap-1 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                <LayoutGrid className="h-[20px] w-[20px]" />
                <span>{copy.tabMore}</span>
              </button>
            </nav>
          )}
        </>
      )}

      {activeAccount && (
        <WalletSheets
          key={`${activeSheet ?? "none"}-${recipientValue}`}
          locale={state.locale}
          activeSheet={activeSheet}
          callerNumber={state.call.callerNumber}
          callDuration={callDuration}
          activeAccount={activeAccount}
          isScreenSharing={isScreenSharing}
          cb412Error={cb412Error}
          stoppedAmount={stoppedAmount}
          stoppedRecipient={stoppedRecipient}
          trustedAlertSent={state.trustedAlertSent}
          suggestedMules={sanitizedSuggestedMules}
          currentRecipientValue={recipientValue}
          currentRecipientLabel={recipientLabel}
          onClose={() => setActiveSheet(null)}
          onEndCall={() => void handleEndCallFromSheet()}
          onUseAlternateIban={handleUseAlternateIban}
          onViewAccountAfterReveal={() => {
            setActiveSheet(null);
            setScreen("home");
          }}
          onSeeWhatHappened={() => {
            setActiveSheet(null);
            setScreen("happened");
          }}
          onRequestManualReview={() => {
            setActiveSheet(null);
            showToast(copy.manualReviewToast);
          }}
          onApplyRecipient={(value, label, suggestedAmount) => {
            setRecipientValue(value);
            setRecipientLabel(label);
            if (suggestedAmount && !amountInput) {
              setAmountInput(String(suggestedAmount));
            }
            if (preset.category !== "safe") {
              markClipboardPaste();
            }
          }}
          onPasteRecipient={markClipboardPaste}
        />
      )}

      {toastText && !showLockPush && (
        <div className="animate-mirage-fade pointer-events-none absolute top-[90px] left-1/2 z-50 -translate-x-1/2 rounded-full bg-[var(--secondary)] px-4 py-2 text-[13px] font-semibold whitespace-nowrap text-[var(--foreground)] shadow-[var(--shadow-sm)]">
          {toastText}
        </div>
      )}
    </div>
  );
}
