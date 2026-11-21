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
  compactForCallBar?: boolean;
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
  compactForCallBar = false,
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

      <div
        className={`mono text-center leading-[1.1] font-bold tracking-[-0.04em] text-[var(--foreground)] ${
          compactForCallBar ? "my-1 text-[34px]" : "my-1.5 text-[42px]"
        }`}
      >
        {formattedAmount}
        <small
          className={`ml-2 font-semibold tracking-normal text-[var(--muted-foreground)] ${
            compactForCallBar ? "text-[18px]" : "text-[22px]"
          }`}
        >
          {currency}
        </small>
      </div>

      {suggestedMules.length > 0 && (
        <div
          className={`flex flex-wrap justify-center gap-1.5 ${
            compactForCallBar ? "mb-1.5" : "mb-2.5"
          }`}
        >
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
                className={`rounded-full px-3 text-[11.5px] font-semibold transition ${
                  compactForCallBar ? "py-1" : "py-1.5"
                } ${
                  isBackupHighlighted
                    ? "border border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_22%,var(--card))] text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                    : isSelected
                      ? "border border-[var(--primary)]/70 bg-[var(--secondary)] text-[var(--foreground)]"
                      : "border border-transparent bg-[var(--card)] text-[var(--secondary-foreground)] hover:border-[var(--border)]"
                }`}
              >
                {mule.label}{" "}
                <span className="mono text-[10.5px] opacity-80">
                  · {formatNumber(mule.suggestedAmount, 0)} {currency}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className={`rounded-[24px] bg-[var(--card)] px-4 py-0.5 ${
          compactForCallBar ? "mb-2" : "mb-2.5"
        }`}
      >
        {fromAccount && (
          <button
            type="button"
            onClick={onCycleFromAccount}
            className={`flex w-full items-center gap-3 text-left transition hover:opacity-90 ${
              compactForCallBar ? "py-2" : "py-2.5"
            }`}
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--primary)] text-[11.5px] font-bold text-[var(--primary-foreground)]">
              {fromAccount.currency}
            </span>
            <div className="min-w-0 flex-1">
              <div className="mono truncate text-[11.5px] text-[var(--muted-foreground)]">
                {formatAed(fromAccount.balance, fromAccount.currency, 2)} ·{" "}
                {maskIfSharing(fromMeta.accountNumber, isScreenSharing)}
              </div>
              <div className="truncate text-[14px] font-semibold text-[var(--foreground)]">
                {copy.fromPrefix} {fromAccount.name}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 flex-none text-[var(--muted-foreground)]" />
          </button>
        )}

        <button
          type="button"
          onClick={onOpenRecipientPicker}
          className={`flex w-full items-center gap-3 border-t border-[var(--border)] text-left transition hover:opacity-90 ${
            compactForCallBar ? "py-2" : "py-2.5"
          }`}
        >
          {recipientValue.trim() ? (
            <>
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--primary)] text-[11.5px] font-bold text-[var(--primary-foreground)]">
                {getInitials(recipientLabel || recipientValue)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11.5px] text-[var(--muted-foreground)]">
                  {copy.newRecipientTag} ·{" "}
                  <span className="mono">{maskIfSharing(recipientValue, isScreenSharing)}</span>
                </div>
                <div className="truncate text-[14px] font-semibold text-[var(--foreground)]">
                  {copy.toPrefix} {recipientLabel || shortIban(recipientValue)}
                </div>
              </div>
            </>
          ) : (
            <>
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--secondary)] text-[17px] font-semibold text-[var(--muted-foreground)]">
                +
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] text-[var(--muted-foreground)]">
                  {copy.newRecipientTag}
                </div>
                <div className="text-[14px] font-semibold text-[var(--foreground)]">
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
        className={`w-full flex-none rounded-[var(--radius-md)] bg-[var(--primary)] text-[16px] font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-xs)] transition hover:brightness-105 active:scale-[0.99] disabled:bg-[var(--secondary)] disabled:text-[var(--muted-foreground)] disabled:shadow-none ${
          compactForCallBar ? "h-[46px]" : "h-[52px]"
        }`}
      >
        {copy.reviewTransfer}
      </button>

      <div
        className={`text-center text-[12px] text-[var(--muted-foreground)] ${
          compactForCallBar ? "my-1" : "my-1.5"
        }`}
      >
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
              className={`rounded-[10px] font-medium text-[var(--foreground)] transition active:bg-[var(--accent)] ${
                compactForCallBar ? "h-[31px] text-[18px]" : "h-[40px] text-[20px]"
              } ${isMutedKey ? "bg-transparent" : "bg-[var(--secondary)]"}`}
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
  compactForCallBar?: boolean;
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
  compactForCallBar = false,
  onBack,
  onConfirm,
}: WalletReviewProps) {
  const copy = getUiCopy(locale);
  const fromMeta = ACCOUNT_DETAILS_MAP[fromAccount.kind];
  const displayRecipient = recipientLabel || shortIban(recipientValue);

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

      <div className={`text-center ${compactForCallBar ? "my-2" : "my-4"}`}>
        <span className="inline-block rounded-full bg-[var(--secondary)] px-3 py-1 text-[12px] font-semibold text-[var(--secondary-foreground)]">
          {copy.localTransferPill}
        </span>
        <div
          className={`text-[13px] text-[var(--muted-foreground)] ${
            compactForCallBar ? "mt-1.5" : "mt-2.5"
          }`}
        >
          {copy.youAreSending}
        </div>
        <div
          className={`mono mt-0.5 leading-tight font-bold tracking-[-0.04em] text-[var(--foreground)] ${
            compactForCallBar ? "text-[38px]" : "text-[44px]"
          }`}
        >
          {formatAed(amount, fromAccount.currency, amount % 1 === 0 ? 0 : 2)}
        </div>
        <div
          className={`truncate tracking-[-0.01em] text-[var(--foreground)] ${
            compactForCallBar
              ? "mt-1 text-[19px] font-extrabold"
              : "mt-1.5 text-[22px] font-extrabold"
          }`}
        >
          <span className="font-medium text-[var(--muted-foreground)]">{copy.toPrefix} </span>
          {displayRecipient}
        </div>
      </div>

      <div className="rounded-[28px] bg-[var(--card)] px-5 py-1.5">
        <div
          className={`flex items-baseline justify-between gap-3 border-b border-[var(--border)] text-[14.5px] ${
            compactForCallBar ? "py-2.5" : "py-3"
          }`}
        >
          <span className="text-[var(--muted-foreground)]">{copy.detailIban}</span>
          <b className="mono text-right text-[12.5px] font-medium text-[var(--foreground)]">
            {maskIfSharing(recipientValue, isScreenSharing)}
          </b>
        </div>
        <div
          className={`flex items-baseline justify-between gap-3 border-b border-[var(--border)] text-[14.5px] ${
            compactForCallBar ? "py-2.5" : "py-3"
          }`}
        >
          <span className="text-[var(--muted-foreground)]">{copy.detailFrom}</span>
          <b className="text-right text-[13.5px] font-semibold text-[var(--foreground)]">
            {fromAccount.kind === "vault" ? copy.savingsVaultTitle : copy.currentAccountTitle}{" "}
            <span className="mono block text-[12px] font-medium text-[var(--muted-foreground)]">
              {maskIfSharing(fromMeta.accountNumber, isScreenSharing)}
            </span>
          </b>
        </div>
        <div
          className={`flex items-baseline justify-between gap-3 border-b border-[var(--border)] text-[14.5px] ${
            compactForCallBar ? "py-2.5" : "py-3"
          }`}
        >
          <span className="text-[var(--muted-foreground)]">{copy.detailType}</span>
          <b className="text-right font-semibold text-[var(--foreground)]">
            {copy.detailTypeValue}
          </b>
        </div>
        <div
          className={`flex items-baseline justify-between gap-3 text-[14.5px] ${
            compactForCallBar ? "py-2.5" : "py-3"
          }`}
        >
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
