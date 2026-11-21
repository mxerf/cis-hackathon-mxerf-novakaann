import { Check, ChevronLeft, Lock, ShieldCheck } from "lucide-react";
import type { DecoyReceipt, Locale } from "../../../shared/mirage-types.ts";
import { formatAed, getUiCopy, maskIfSharing } from "../../lib/ui-copy.ts";
import { ACCOUNT_DETAILS_MAP } from "./wallet-home.tsx";

export type WalletLockProps = {
  locale: Locale;
  showPush: boolean;
  stoppedAmount: number;
  currency: string;
  trustedAlertSent: boolean;
  onUnlockIdle: () => void;
  onOpenPush: () => void;
};

export function WalletLock({
  locale,
  showPush,
  stoppedAmount,
  currency,
  trustedAlertSent,
  onUnlockIdle,
  onOpenPush,
}: WalletLockProps) {
  const copy = getUiCopy(locale);

  return (
    <div
      onClick={showPush ? undefined : onUnlockIdle}
      className="flex flex-1 flex-col items-center bg-black pt-[138px] text-white"
    >
      <div className="text-[76px] leading-none font-light tracking-[-0.03em]">9:41</div>
      <div className="mt-1.5 text-[15px] opacity-70">{copy.lockDate}</div>

      {showPush ? (
        <button
          type="button"
          onClick={onOpenPush}
          className="animate-mirage-sheet mx-3.5 mt-11 flex items-start gap-3 self-stretch rounded-[22px] bg-[var(--card)] p-3.5 text-left text-[var(--foreground)] shadow-[var(--shadow-xl)] transition hover:brightness-105"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[11px] bg-[var(--primary)] text-[var(--primary-foreground)]">
            <ShieldCheck className="h-[22px] w-[22px]" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-[12px] text-[var(--muted-foreground)]">
              <b className="font-semibold tracking-[0.04em] uppercase">{copy.pushAppName}</b>
              <span>{copy.pushNow}</span>
            </div>
            <div className="mt-0.5 text-[16px] font-bold text-[var(--foreground)]">
              {copy.pushTitle}
            </div>
            <div className="mt-0.5 text-[13.5px] leading-[1.35] text-[var(--secondary-foreground)]">
              {copy.pushBodyPrefix} {formatAed(stoppedAmount, currency, 0)}. {copy.pushBodySuffix}
            </div>
            {trustedAlertSent && (
              <div className="mt-1.5 text-[11.5px] font-semibold text-[var(--primary)]">
                {copy.pushFamilyNotified}
              </div>
            )}
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={onUnlockIdle}
          className="mt-auto mb-14 text-[13px] text-white/45 transition hover:text-white/75"
        >
          {copy.lockHint}
        </button>
      )}
    </div>
  );
}

export type WalletReceiptProps = {
  locale: Locale;
  receipt: DecoyReceipt;
  recipientDisplay: string;
  shownBalance: number;
  currency: string;
  isStoppedRevealed: boolean;
  compactForCallBar?: boolean;
  onSeeWhatHappened: () => void;
  onDone: () => void;
};

export function WalletReceipt({
  locale,
  receipt,
  recipientDisplay,
  shownBalance,
  currency,
  isStoppedRevealed,
  compactForCallBar = false,
  onSeeWhatHappened,
  onDone,
}: WalletReceiptProps) {
  const copy = getUiCopy(locale);

  return (
    <div
      className={`animate-mirage-fade flex min-h-0 flex-1 flex-col items-center text-center ${
        compactForCallBar ? "pt-1.5" : "pt-7"
      }`}
    >
      <div
        className={`animate-mirage-pop flex flex-none items-center justify-center rounded-full shadow-[var(--shadow)] ${
          compactForCallBar ? "h-12 w-12" : "h-16 w-16"
        } ${
          isStoppedRevealed
            ? "bg-[var(--secondary)] text-[var(--primary)]"
            : "bg-[var(--primary)] text-[var(--primary-foreground)]"
        }`}
      >
        {isStoppedRevealed ? (
          <ShieldCheck className={compactForCallBar ? "h-6 w-6" : "h-8 w-8"} />
        ) : (
          <Check className={compactForCallBar ? "h-6 w-6 stroke-[3]" : "h-8 w-8 stroke-[3]"} />
        )}
      </div>

      <h2
        className={`font-extrabold tracking-[-0.02em] text-[var(--foreground)] ${
          compactForCallBar ? "mt-2 text-[21px]" : "mt-4 text-[24px]"
        }`}
      >
        {isStoppedRevealed ? copy.transferBlocked : copy.transferComplete}
      </h2>

      <div
        className={`mono leading-none font-bold tracking-[-0.04em] text-[var(--foreground)] ${
          compactForCallBar ? "mt-3 text-[40px]" : "mt-6 text-[46px]"
        }`}
      >
        {isStoppedRevealed
          ? formatAed(0, currency, 0)
          : formatAed(receipt.amount, receipt.currency, 0)}
      </div>
      <div
        className={`text-[14.5px] text-[var(--muted-foreground)] ${
          compactForCallBar ? "mt-1.5" : "mt-3"
        }`}
      >
        {isStoppedRevealed
          ? `${copy.ofPrefix} ${formatAed(receipt.amount, receipt.currency, 0)} ${copy.toPrefix} ${recipientDisplay}`
          : `${copy.toPrefix} ${recipientDisplay}`}
      </div>

      <div
        className={`self-stretch rounded-[28px] bg-[var(--card)] px-5 py-1.5 text-left ${
          compactForCallBar ? "mt-3" : "mt-5"
        }`}
      >
        <div
          className={`flex items-baseline justify-between border-b border-[var(--border)] text-[14px] ${
            compactForCallBar ? "py-2" : "py-2.5"
          }`}
        >
          <span className="text-[var(--muted-foreground)]">{copy.detailStatus}</span>
          <b className={isStoppedRevealed ? "font-bold text-[var(--primary)]" : "font-semibold"}>
            {isStoppedRevealed ? copy.statusBlocked : copy.statusSent}
          </b>
        </div>
        <div
          className={`flex items-baseline justify-between border-b border-[var(--border)] text-[14px] ${
            compactForCallBar ? "py-2" : "py-2.5"
          }`}
        >
          <span className="text-[var(--muted-foreground)]">{copy.detailType}</span>
          <b className="font-semibold text-[var(--foreground)]">{copy.detailTypeValue}</b>
        </div>
        <div
          className={`flex items-baseline justify-between border-b border-[var(--border)] text-[14px] ${
            compactForCallBar ? "py-2" : "py-2.5"
          }`}
        >
          <span className="text-[var(--muted-foreground)]">{copy.detailDate}</span>
          <b className="font-semibold text-[var(--foreground)]">21 Nov 2026, 9:41</b>
        </div>
        <div
          className={`flex items-baseline justify-between border-b border-[var(--border)] text-[14px] ${
            compactForCallBar ? "py-2" : "py-2.5"
          }`}
        >
          <span className="text-[var(--muted-foreground)]">{copy.detailReference}</span>
          <b className="mono text-[13px] font-medium text-[var(--foreground)]">{receipt.refCode}</b>
        </div>
        <div
          className={`flex items-baseline justify-between text-[14px] ${
            compactForCallBar ? "py-2" : "py-2.5"
          }`}
        >
          <span className="text-[var(--muted-foreground)]">
            {isStoppedRevealed ? copy.detailBalance : copy.detailNewBalance}
          </span>
          <b className="mono text-[13.5px] font-medium text-[var(--foreground)]">
            {formatAed(shownBalance, currency, 2)}
          </b>
        </div>
      </div>

      <div className="mt-auto w-full pt-3">
        {isStoppedRevealed && (
          <button
            type="button"
            onClick={onSeeWhatHappened}
            className="mb-2.5 h-[48px] w-full rounded-[var(--radius-md)] bg-[var(--card)] text-[15.5px] font-semibold text-[var(--foreground)] transition hover:brightness-110"
          >
            {copy.seeWhatHappened}
          </button>
        )}
        <button
          type="button"
          onClick={onDone}
          className="h-[52px] w-full rounded-[var(--radius-md)] bg-[var(--primary)] text-[17px] font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-xs)] transition hover:brightness-105"
        >
          {copy.done}
        </button>
      </div>
    </div>
  );
}

export type WalletHappenedProps = {
  locale: Locale;
  callerQuote: string;
  amount: number;
  currency: string;
  recipientDisplay: string;
  capturedMulesCount: number;
  isBlocked: boolean;
  onBlockNumber: () => void;
  onAskReal: () => void;
  onBackToAccount: () => void;
};

export function WalletHappened({
  locale,
  callerQuote,
  amount,
  currency,
  recipientDisplay,
  capturedMulesCount,
  isBlocked,
  onBlockNumber,
  onAskReal,
  onBackToAccount,
}: WalletHappenedProps) {
  const copy = getUiCopy(locale);
  const sentences = callerQuote.split(/(?<=[.!?])\s+/).filter(Boolean);
  const relevantSentence =
    sentences.find((sentence) =>
      /cancel|reverse|refund|mirror|debit|transfer|iban|отмен|перевед|списан/i.test(sentence),
    ) ??
    sentences[0] ??
    callerQuote;
  const shortQuote = relevantSentence.replace(/[.!?]+$/, "");

  return (
    <div className="animate-mirage-fade flex min-h-0 flex-1 flex-col">
      <h1 className="mx-1.5 mt-2 mb-3 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
        {copy.whatHappenedTitle}
      </h1>

      <div className="rounded-[28px] bg-[var(--card)] px-5 py-1.5">
        <div className="border-b border-[var(--border)] py-3">
          <span className="mb-1 block text-[11.5px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase">
            {copy.whatCallerSaid}
          </span>
          <b className="line-clamp-2 text-[15px] leading-[1.35] font-semibold text-[var(--foreground)]">
            “{shortQuote}.”
          </b>
        </div>

        <div className="border-b border-[var(--border)] py-3">
          <span className="mb-1 block text-[11.5px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase">
            {copy.whatYouDid}
          </span>
          <b className="text-[15px] leading-[1.35] font-semibold text-[var(--foreground)]">
            {copy.whatYouDidPrefix} {formatAed(amount, currency, 0)} {copy.toPrefix}{" "}
            {recipientDisplay}.
          </b>
        </div>

        <div className="py-3">
          <span className="mb-1 block text-[11.5px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase">
            {copy.whatBankDid}
          </span>
          <b className="text-[15px] leading-[1.35] font-semibold text-[var(--foreground)]">
            {copy.whatBankDidBody}
            {capturedMulesCount > 0 ? ` ${capturedMulesCount} ${copy.whatBankDidMules}` : ""}
          </b>
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between rounded-[var(--radius-sm)] bg-[var(--secondary)] px-4 py-3.5">
        <span className="text-[14.5px] text-[var(--muted-foreground)]">
          {copy.amountTransferred}
        </span>
        <b className="mono text-[22px] font-bold tracking-[-0.03em] text-[var(--primary)]">
          {formatAed(0, currency, 0)}
        </b>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        disabled={isBlocked}
        onClick={onBlockNumber}
        className="mt-2 h-[48px] w-full rounded-[var(--radius-md)] bg-[var(--card)] text-[15.5px] font-semibold text-[var(--foreground)] transition hover:brightness-110 disabled:text-[var(--muted-foreground)]"
      >
        {isBlocked ? copy.numberBlocked : copy.blockNumber}
      </button>

      <button
        type="button"
        onClick={onAskReal}
        className="mt-1.5 h-[40px] w-full rounded-[var(--radius-md)] bg-transparent text-[14.5px] font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
      >
        {copy.thisWasReal}
      </button>

      <button
        type="button"
        onClick={onBackToAccount}
        className="mt-2 h-[54px] w-full rounded-[var(--radius-md)] bg-[var(--primary)] text-[17px] font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-xs)] transition hover:brightness-105"
      >
        {copy.backToAccount}
      </button>
    </div>
  );
}

export type WalletStatementsProps = {
  locale: Locale;
  isScreenSharing: boolean;
  view: "list" | "detail";
  onBack: () => void;
  onOpenOctober: () => void;
};

export function WalletStatements({
  locale,
  isScreenSharing,
  view,
  onBack,
  onOpenOctober,
}: WalletStatementsProps) {
  const copy = getUiCopy(locale);
  const months =
    locale === "ru"
      ? ["Октябрь 2026", "Сентябрь 2026", "Август 2026"]
      : ["October 2026", "September 2026", "August 2026"];

  if (view === "detail") {
    return (
      <div className="animate-mirage-fade flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--card)]"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <h1 className="mx-1.5 mt-1.5 mb-4 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
          {copy.octoberStatementTitle}
        </h1>

        <div className="rounded-[var(--radius-xl)] bg-[var(--card)] p-[18px] shadow-[var(--shadow)]">
          <div className="text-[13px] text-[var(--muted-foreground)]">
            {copy.statementSubPrefix}{" "}
            <span className="mono">
              {maskIfSharing(ACCOUNT_DETAILS_MAP.checking.accountNumber, isScreenSharing)}
            </span>
          </div>

          {isScreenSharing ? (
            <div className="flex items-center gap-3 pt-4 pb-1 text-[14px] text-[var(--muted-foreground)]">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-[var(--secondary)]">
                <Lock className="h-4 w-4" />
              </span>
              <span>{copy.amountsHiddenSharing}</span>
            </div>
          ) : (
            <div className="mt-2">
              <div className="flex items-baseline justify-between border-b border-[var(--border)] py-3 text-[14.5px]">
                <span className="text-[var(--muted-foreground)]">{copy.openingBalance}</span>
                <b className="mono font-medium">AED 15,216.75</b>
              </div>
              <div className="flex items-baseline justify-between border-b border-[var(--border)] py-3 text-[14.5px]">
                <span className="text-[var(--muted-foreground)]">{copy.moneyIn}</span>
                <b className="mono font-medium">AED 14,500.00</b>
              </div>
              <div className="flex items-baseline justify-between border-b border-[var(--border)] py-3 text-[14.5px]">
                <span className="text-[var(--muted-foreground)]">{copy.moneyOut}</span>
                <b className="mono font-medium">AED 5,216.75</b>
              </div>
              <div className="flex items-baseline justify-between py-3 text-[14.5px]">
                <span className="text-[var(--muted-foreground)]">{copy.closingBalance}</span>
                <b className="mono font-medium">AED 24,500.00</b>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-mirage-fade flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--card)]"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <h1 className="mx-1.5 mt-1.5 mb-4 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
        {copy.statementsTitle}
      </h1>

      <div className="rounded-[28px] bg-[var(--card)] px-[18px] py-1.5">
        {months.map((label, idx) => (
          <div
            key={label}
            className={`flex items-center gap-3 py-3 text-[14.5px] ${
              idx < months.length - 1 ? "border-b border-[var(--border)]" : ""
            }`}
          >
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-[var(--secondary)] text-[11.5px] font-bold text-[var(--secondary-foreground)]">
              PDF
            </div>
            <div>
              <div className="font-semibold text-[var(--foreground)]">{label}</div>
              <div className="text-[12.5px] text-[var(--muted-foreground)]">
                Everyday Current Account
              </div>
            </div>
            {idx === 0 && (
              <button
                type="button"
                onClick={onOpenOctober}
                className="ml-auto text-[14px] font-semibold text-[var(--primary)] transition hover:brightness-110"
              >
                {copy.openStatement}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
