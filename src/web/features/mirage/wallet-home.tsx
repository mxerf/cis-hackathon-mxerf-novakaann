import { FileText, Lock, Plus, QrCode, Search, ShieldCheck } from "lucide-react";
import type { Account, DecoyReceipt, Locale } from "../../../shared/mirage-types.ts";
import { formatNumber, getInitials, getUiCopy } from "../../lib/ui-copy.ts";

export const ACCOUNT_DETAILS_MAP = {
  checking: {
    accountNumber: "1012 3456 7390",
    ownIban: "AE21 0331 0000 1012 3456 739",
    cardNumber: "5241 7700 1836 4821",
    validThru: "09/28",
  },
  vault: {
    accountNumber: "1012 9084 8412",
    ownIban: "AE21 0331 0000 1012 9084 8412",
    cardNumber: "5241 7700 1836 4821",
    validThru: "09/28",
  },
} as const;

const BASELINE_ACTIVITY = [
  {
    code: "CF",
    name: "Carrefour",
    dateEn: "Yesterday",
    dateRu: "Вчера",
    amount: "-212.40",
    incoming: false,
  },
  {
    code: "SL",
    name: "Salary",
    dateEn: "18 Nov",
    dateRu: "18 ноя",
    amount: "+14,500.00",
    incoming: true,
  },
  {
    code: "DW",
    name: "DEWA",
    dateEn: "15 Nov",
    dateRu: "15 ноя",
    amount: "-386.15",
    incoming: false,
  },
  {
    code: "CR",
    name: "Careem",
    dateEn: "14 Nov",
    dateRu: "14 ноя",
    amount: "-47.00",
    incoming: false,
  },
] as const;

export type WalletHomeProps = {
  locale: Locale;
  accounts: Account[];
  selectedAccountId: string;
  receipts: DecoyReceipt[];
  isScreenSharing: boolean;
  isStoppedRevealed: boolean;
  recipientDisplayName: (value: string) => string;
  onSelectAccount: (accountId: string) => void;
  onOpenDetails: () => void;
  onOpenSend: () => void;
  onOpenStatements: () => void;
  onOpenReceipt: (receipt: DecoyReceipt) => void;
  onShowToast: (message: string) => void;
};

export function WalletHome({
  locale,
  accounts,
  selectedAccountId,
  receipts,
  isScreenSharing,
  isStoppedRevealed,
  recipientDisplayName,
  onSelectAccount,
  onOpenDetails,
  onOpenSend,
  onOpenStatements,
  onOpenReceipt,
  onShowToast,
}: WalletHomeProps) {
  const copy = getUiCopy(locale);
  const activeAccount = accounts.find((acc) => acc.id === selectedAccountId) ?? accounts[0];

  if (!activeAccount) {
    return null;
  }

  const meta = ACCOUNT_DETAILS_MAP[activeAccount.kind];
  const latestReceipt = receipts[0] ?? null;
  const visibleBaselineCount = latestReceipt ? 1 : 2;

  function renderReceiptRow(receipt: DecoyReceipt) {
    const label = recipientDisplayName(receipt.recipientValue);
    if (isStoppedRevealed) {
      return (
        <button
          key={`${receipt.refCode}-${receipt.createdAt}`}
          type="button"
          onClick={() => onOpenReceipt(receipt)}
          className="flex w-full items-center gap-3 border-b border-[var(--border)] py-2.5 text-left text-[14px] transition hover:opacity-90"
        >
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-[var(--accent)] text-[var(--primary)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-[var(--foreground)]">
              <span className="font-bold text-[var(--primary)]">{copy.transferBlocked}</span> ·{" "}
              {label}
            </div>
            <div className="text-[12.5px] text-[var(--muted-foreground)]">{copy.noMoneyLeft}</div>
          </div>
        </button>
      );
    }

    return (
      <button
        key={`${receipt.refCode}-${receipt.createdAt}`}
        type="button"
        onClick={() => onOpenReceipt(receipt)}
        className="flex w-full items-center gap-3 border-b border-[var(--border)] py-2.5 text-left text-[14px] transition hover:opacity-90"
      >
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-[var(--secondary)] text-[12px] font-bold text-[var(--secondary-foreground)]">
          {getInitials(label)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-[var(--foreground)]">
            {copy.transferToPrefix} {label}
          </div>
          <div className="text-[12.5px] text-[var(--muted-foreground)]">{copy.todaySent}</div>
        </div>
        <div className="mono ml-auto text-[13.5px] font-medium text-[var(--foreground)]">
          −{formatNumber(receipt.amount, 2)}
        </div>
      </button>
    );
  }

  return (
    <div className="animate-mirage-fade flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-[40px] w-[40px] flex-none items-center justify-center rounded-full bg-[var(--accent)] text-[13.5px] font-bold text-[var(--accent-foreground)]">
          LA
        </div>
        <div className="flex h-[40px] flex-1 items-center gap-2 rounded-full bg-[var(--card)] px-3.5 text-[14.5px] text-[var(--muted-foreground)]">
          <Search className="h-4 w-4" />
          <span>{copy.searchPlaceholder}</span>
        </div>
      </div>

      <div className="rounded-[28px] bg-[var(--card)] px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-[15px] font-semibold text-[var(--foreground)]">
            {activeAccount.name}
            <span className="mono ml-1.5 text-[11.5px] font-medium text-[var(--muted-foreground)]">
              · •{meta.accountNumber.slice(-4)}
            </span>
          </div>

          {accounts.length > 1 && (
            <div className="flex flex-none rounded-full bg-[var(--background)] p-0.5">
              {accounts.map((acc) => {
                const isSelected = acc.id === activeAccount.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => onSelectAccount(acc.id)}
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition ${
                      isSelected
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {acc.kind === "vault" ? copy.vaultShort : copy.checkingShort}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mono mt-2 text-[34px] leading-tight font-bold tracking-[-0.04em] text-[var(--foreground)]">
          <small className="mr-2 text-[16px] font-semibold tracking-normal text-[var(--muted-foreground)]">
            {activeAccount.currency}
          </small>
          {formatNumber(activeAccount.balance, 2)}
        </div>
        <div className="text-[12.5px] text-[var(--muted-foreground)]">
          {activeAccount.kind === "vault" ? copy.savingsBalance : copy.availableBalance}
        </div>

        <div className="mt-3.5 flex items-center gap-3 border-t border-[var(--border)] pt-3">
          <div
            aria-hidden="true"
            className="h-[26px] w-[38px] flex-none rounded-[7px]"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
            }}
          />
          <div className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--foreground)]">
            {activeAccount.kind === "vault" ? copy.vaultCardLabel : copy.debitCardLabel}
            <span className="mono ml-1.5 text-[11.5px] font-medium text-[var(--muted-foreground)]">
              · •
              {activeAccount.kind === "vault"
                ? meta.accountNumber.slice(-4)
                : meta.cardNumber.slice(-4)}
            </span>
          </div>
          <button
            type="button"
            disabled={isScreenSharing}
            title={isScreenSharing ? copy.viewDetailsBlockedTip : undefined}
            onClick={onOpenDetails}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--secondary)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--foreground)] transition hover:brightness-110 disabled:opacity-45"
          >
            {isScreenSharing && <Lock className="h-3 w-3" />}
            {copy.viewDetails}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSend}
        className="mt-3 h-[52px] w-full flex-none rounded-[var(--radius-md)] bg-[var(--primary)] text-[16.5px] font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-xs)] transition hover:brightness-105 active:scale-[0.99]"
      >
        {copy.sendMoney}
      </button>

      <div className="my-3 flex justify-around px-1">
        <button
          type="button"
          onClick={() => onShowToast(copy.toastTopUp)}
          className="flex w-[76px] flex-col items-center gap-1.5 text-[12px] font-medium text-[var(--foreground)] transition hover:opacity-90"
        >
          <span className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[var(--card)]">
            <Plus className="h-5 w-5" />
          </span>
          {copy.actionTopUp}
        </button>

        <button
          type="button"
          onClick={() => onShowToast(copy.toastScan)}
          className="flex w-[76px] flex-col items-center gap-1.5 text-[12px] font-medium text-[var(--foreground)] transition hover:opacity-90"
        >
          <span className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[var(--card)]">
            <QrCode className="h-5 w-5" />
          </span>
          {copy.actionScan}
        </button>

        <button
          type="button"
          onClick={onOpenStatements}
          className="flex w-[76px] flex-col items-center gap-1.5 text-[12px] font-medium text-[var(--foreground)] transition hover:opacity-90"
        >
          <span className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[var(--card)]">
            <FileText className="h-5 w-5" />
          </span>
          {copy.actionStatements}
        </button>
      </div>

      {isScreenSharing ? (
        <div className="flex-none rounded-[28px] bg-[var(--card)] px-5 py-3.5">
          {latestReceipt && renderReceiptRow(latestReceipt)}
          <div className={`flex items-center gap-3 ${latestReceipt ? "pt-3" : "py-1"}`}>
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-[var(--secondary)] text-[var(--muted-foreground)]">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[15px] font-bold text-[var(--foreground)]">
                {latestReceipt ? copy.earlierTransactions : copy.transactionsTitle}
              </div>
              <div className="text-[13px] text-[var(--muted-foreground)]">
                {copy.hiddenWhileSharing}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] bg-[var(--card)] px-5 pt-4 pb-2">
          <h4 className="m-0 text-[17px] font-extrabold text-[var(--foreground)]">
            {copy.transactionsTitle}
          </h4>
          <div className="text-[13px] text-[var(--muted-foreground)]">{copy.spendingSubtitle}</div>

          <div className="mt-1">
            {latestReceipt && renderReceiptRow(latestReceipt)}
            {BASELINE_ACTIVITY.slice(0, visibleBaselineCount).map((item, idx, arr) => (
              <div
                key={item.code}
                className={`flex items-center gap-3 py-2.5 text-[14px] ${
                  idx < arr.length - 1 ? "border-b border-[var(--border)]" : ""
                }`}
              >
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-[var(--secondary)] text-[12px] font-bold text-[var(--secondary-foreground)]">
                  {item.code}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[var(--foreground)]">{item.name}</div>
                  <div className="text-[12.5px] text-[var(--muted-foreground)]">
                    {locale === "ru" ? item.dateRu : item.dateEn}
                  </div>
                </div>
                <div
                  className={`mono ml-auto text-[13.5px] font-medium ${
                    item.incoming ? "text-[var(--primary)]" : "text-[var(--foreground)]"
                  }`}
                >
                  {item.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
