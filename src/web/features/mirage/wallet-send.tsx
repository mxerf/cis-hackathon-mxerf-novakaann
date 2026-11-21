import { ChevronDown, ChevronLeft } from "lucide-react";
import { useEffect } from "react";
import type { Account, Locale, SuggestedMule } from "../../../shared/mirage-types.ts";
import {
  formatAed,
  formatNumber,
  getInitials,
  getUiCopy,
  maskIfSharing,
  shortIban,
} from "../../lib/ui-copy.ts";
import { ACCOUNT_DETAILS_MAP } from "./wallet-home.tsx";

export type WalletSendProps = {
  locale: Locale;
  accounts: Account[];
  fromAccountId: string;
  recipientValue: string;
  recipientLabel: string;
  amountInput: string;
  suggestedMules: SuggestedMule[];
  highlightBackupMule: boolean;
  isScreenSharing: boolean;
  onBack: () => void;
  onCycleFromAccount: () => void;
  onOpenRecipientPicker: () => void;
  onSelectSuggestedMule: (mule: SuggestedMule) => void;
  onKeypadInput: (key: string) => void;
  onOpenReview: () => void;
};

const KEYPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;

export function WalletSend({
  locale,
  accounts,
  fromAccountId,
  recipientValue,
  recipientLabel,
  amountInput,
  suggestedMules,
  highlightBackupMule,
  isScreenSharing,
  onBack,
  onCycleFromAccount,
  onOpenRecipientPicker,
  onSelectSuggestedMule,
  onKeypadInput,
  onOpenReview,
}: WalletSendProps) {
  const copy = getUiCopy(locale);
  const fromAccount = accounts.find((acc) => acc.id === fromAccountId) ?? accounts[0];
  const currency = fromAccount?.currency ?? "AED";
  const parsedAmount = Number(amountInput) || 0;
  const canReview = recipientValue.trim().length > 0 && parsedAmount > 0;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        onKeypadInput(event.key);
      } else if (event.key === ".") {
        event.preventDefault();
        onKeypadInput(".");
      } else if (event.key === "Backspace") {
        event.preventDefault();
        onKeypadInput("del");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onKeypadInput]);

  const [intPart, decPart] = amountInput.split(".");
  const formattedAmount =
    (intPart ? Number(intPart).toLocaleString("en-US") : "0") +
    (decPart !== undefined ? `.${decPart}` : "");

  const fromMeta = fromAccount
    ? ACCOUNT_DETAILS_MAP[fromAccount.kind]
    : ACCOUNT_DETAILS_MAP.checking;

  return (
    <div className="animate-mirage-fade flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--card)]"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="rounded-full bg-[var(--card)] px-3 py-1 text-[12px] font-semibold text-[var(--secondary-foreground)]">
          {copy.localTransferPill}
        </span>
        <span className="w-8" />
      </div>

      <div className="mono my-1.5 text-center text-[42px] leading-[1.1] font-bold tracking-[-0.04em] text-[var(--foreground)]">
        {formattedAmount}
        <small className="ml-2 text-[22px] font-semibold tracking-normal text-[var(--muted-foreground)]">
          {currency}
        </small>
      </div>

      {suggestedMules.length > 0 && (
        <div className="mb-2.5 flex flex-wrap justify-center gap-2">
          {suggestedMules.slice(0, 2).map((mule, idx) => {
            const isBackupHighlighted = highlightBackupMule && idx === 1;
            const isSelected =
              recipientValue.replace(/[\s-]/g, "").toUpperCase() ===
              mule.value.replace(/[\s-]/g, "").toUpperCase();
            return (
              <button
                key={mule.value}
                type="button"
                onClick={() => onSelectSuggestedMule(mule)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                  isBackupHighlighted
                    ? "border border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_22%,var(--card))] text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                    : isSelected
                      ? "border border-[var(--primary)]/70 bg-[var(--secondary)] text-[var(--foreground)]"
                      : "border border-transparent bg-[var(--card)] text-[var(--secondary-foreground)] hover:border-[var(--border)]"
                }`}
              >
                {idx === 0 ? copy.fillIban1 : copy.fillIban2}{" "}
                <span className="mono text-[11px] opacity-80">({shortIban(mule.value)})</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-2.5 rounded-[24px] bg-[var(--card)] px-4 py-1">
        {fromAccount && (
          <button
            type="button"
            onClick={onCycleFromAccount}
            className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-90"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--primary)] text-[12px] font-bold text-[var(--primary-foreground)]">
              {fromAccount.currency}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mono truncate text-[12px] text-[var(--muted-foreground)]">
                {formatAed(fromAccount.balance, fromAccount.currency, 2)} ·{" "}
                {maskIfSharing(fromMeta.accountNumber, isScreenSharing)}
              </div>
              <div className="truncate text-[14.5px] font-semibold text-[var(--foreground)]">
                {copy.fromPrefix} {fromAccount.name}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 flex-none text-[var(--muted-foreground)]" />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenRecipientPicker}
          className="flex w-full items-center gap-3 border-t border-[var(--border)] py-2.5 text-left transition hover:opacity-90"
        >
          {recipientValue.trim() ? (
            <>
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--primary)] text-[12px] font-bold text-[var(--primary-foreground)]">
                {getInitials(recipientLabel || recipientValue)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] text-[var(--muted-foreground)]">
                  {copy.newRecipientTag} ·{" "}
                  <span className="mono">{maskIfSharing(recipientValue, isScreenSharing)}</span>
                </div>
                <div className="truncate text-[14.5px] font-semibold text-[var(--foreground)]">
                  {copy.toPrefix} {recipientLabel || shortIban(recipientValue)}
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--secondary)] text-[18px] font-semibold text-[var(--muted-foreground)]">
                +
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-[var(--muted-foreground)]">
                  {copy.newRecipientTag}
                </div>
                <div className="text-[14.5px] font-semibold text-[var(--foreground)]">
                  {copy.chooseRecipient}
                </div>
              </div>
            </>
          )}
          <ChevronDown className="h-4 w-4 flex-none text-[var(--muted-foreground)]" />
        </button>
      </div>

      <button
        type="button"
        disabled={!canReview}
        onClick={onOpenReview}
        className="h-[52px] w-full flex-none rounded-[var(--radius-md)] bg-[var(--primary)] text-[16.5px] font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-xs)] transition hover:brightness-105 active:scale-[0.99] disabled:bg-[var(--secondary)] disabled:text-[var(--muted-foreground)] disabled:shadow-none"
      >
        {copy.reviewTransfer}
      </button>

      <div className="my-1.5 text-center text-[12.5px] text-[var(--muted-foreground)]">
        {copy.noFee}
      </div>

      <div className="mt-auto -mx-2 -mb-2 grid grid-cols-3 gap-1.5 rounded-t-[24px] rounded-b-[34px] bg-[var(--background)] p-2">
        {KEYPAD_KEYS.map((key) => {
          const isMutedKey = key === "." || key === "del";
          return (
            <button
              key={key}
              type="button"
              onClick={() => onKeypadInput(key)}
              className={`h-[40px] rounded-[10px] text-[20px] font-medium text-[var(--foreground)] transition active:bg-[var(--accent)] ${
                isMutedKey ? "bg-transparent" : "bg-[var(--secondary)]"
              }`}
            >
              {key === "del" ? "⌫" : key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type WalletReviewProps = {
  locale: Locale;
  fromAccount: Account;
  recipientValue: string;
  recipientLabel: string;
  amount: number;
  isScreenSharing: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
};

export function WalletReview({
  locale,
  fromAccount,
  recipientValue,
  recipientLabel,
  amount,
  isScreenSharing,
  isSubmitting,
  onBack,
  onConfirm,
}: WalletReviewProps) {
  const copy = getUiCopy(locale);
  const fromMeta = ACCOUNT_DETAILS_MAP[fromAccount.kind];

  return (
    <div className="animate-mirage-fade flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onBack}
          aria-label="Back"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--card)] disabled:opacity-40"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
          {copy.reviewTransfer}
        </h1>
      </div>

      <div className="my-4 text-center">
        <span className="inline-block rounded-full bg-[var(--secondary)] px-3 py-1 text-[12px] font-semibold text-[var(--secondary-foreground)]">
          {copy.localTransferPill}
        </span>
        <div className="mt-2.5 text-[13px] text-[var(--muted-foreground)]">
          {copy.youAreSending}
        </div>
        <div className="mono mt-0.5 text-[42px] leading-tight font-bold tracking-[-0.04em] text-[var(--foreground)]">
          {formatAed(amount, fromAccount.currency, amount % 1 === 0 ? 0 : 2)}
        </div>
      </div>

      <div className="rounded-[28px] bg-[var(--card)] px-5 py-2">
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] py-3 text-[14.5px]">
          <span className="text-[var(--muted-foreground)]">{copy.detailTo}</span>
          <b className="truncate text-right font-semibold text-[var(--foreground)]">
            {recipientLabel || shortIban(recipientValue)}
          </b>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] py-3 text-[14.5px]">
          <span className="text-[var(--muted-foreground)]">{copy.detailIban}</span>
          <b className="mono text-right text-[12.5px] font-medium text-[var(--foreground)]">
            {maskIfSharing(recipientValue, isScreenSharing)}
          </b>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] py-3 text-[14.5px]">
          <span className="text-[var(--muted-foreground)]">{copy.detailFrom}</span>
          <b className="text-right text-[13.5px] font-semibold text-[var(--foreground)]">
            {fromAccount.name}{" "}
            <span className="mono block text-[12px] font-medium text-[var(--muted-foreground)]">
              {maskIfSharing(fromMeta.accountNumber, isScreenSharing)}
            </span>
          </b>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] py-3 text-[14.5px]">
          <span className="text-[var(--muted-foreground)]">{copy.detailType}</span>
          <b className="text-right font-semibold text-[var(--foreground)]">
            {copy.detailTypeValue}
          </b>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-3 text-[14.5px]">
          <span className="text-[var(--muted-foreground)]">{copy.detailFee}</span>
          <b className="mono text-right font-semibold text-[var(--foreground)]">
            {fromAccount.currency} {formatNumber(0, 0)}
          </b>
        </div>
      </div>

      <div className="flex-1" />

      <button
        type="button"
        disabled={isSubmitting}
        onClick={onConfirm}
        className="h-[54px] w-full flex-none rounded-[var(--radius-md)] bg-[var(--primary)] text-[17px] font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-xs)] transition hover:brightness-105 active:scale-[0.99] disabled:bg-[var(--secondary)] disabled:text-[var(--muted-foreground)] disabled:shadow-none"
      >
        {isSubmitting ? copy.sendingTransfer : copy.confirmTransfer}
      </button>
    </div>
  );
}
