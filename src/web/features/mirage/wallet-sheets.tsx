import { Landmark, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Account, Locale, SuggestedMule } from "../../../shared/mirage-types.ts";
import { formatAed, getUiCopy, shortIban } from "../../lib/ui-copy.ts";
import { ACCOUNT_DETAILS_MAP } from "./wallet-home.tsx";

export type WalletSheetKind =
  | null
  | "call"
  | "details"
  | "honeytrap_cb412"
  | "revealed_safe"
  | "ask_real"
  | "recipient_picker";

export type WalletSheetsProps = {
  locale: Locale;
  activeSheet: WalletSheetKind;
  callerNumber: string;
  callDuration: string;
  activeAccount: Account;
  isScreenSharing: boolean;
  cb412Error: string;
  stoppedAmount: number;
  stoppedRecipient: string;
  trustedAlertSent: boolean;
  suggestedMules: SuggestedMule[];
  currentRecipientValue: string;
  currentRecipientLabel: string;
  onClose: () => void;
  onEndCall: () => void;
  onUseAlternateIban: () => void;
  onViewAccountAfterReveal: () => void;
  onSeeWhatHappened: () => void;
  onRequestManualReview: () => void;
  onApplyRecipient: (value: string, label: string, suggestedAmount?: number) => void;
  onPasteRecipient: () => void;
};

export function WalletSheets({
  locale,
  activeSheet,
  callerNumber,
  callDuration,
  activeAccount,
  isScreenSharing,
  cb412Error,
  stoppedAmount,
  stoppedRecipient,
  trustedAlertSent,
  suggestedMules,
  currentRecipientValue,
  currentRecipientLabel,
  onClose,
  onEndCall,
  onUseAlternateIban,
  onViewAccountAfterReveal,
  onSeeWhatHappened,
  onRequestManualReview,
  onApplyRecipient,
  onPasteRecipient,
}: WalletSheetsProps) {
  const copy = getUiCopy(locale);
  const [draftValue, setDraftValue] = useState(currentRecipientValue);
  const [draftLabel, setDraftLabel] = useState(currentRecipientLabel);

  if (!activeSheet) {
    return null;
  }

  if (activeSheet === "details" && isScreenSharing) {
    return null;
  }

  const meta = ACCOUNT_DETAILS_MAP[activeAccount.kind];

  return (
    <>
      <div
        onClick={activeSheet === "revealed_safe" ? undefined : onClose}
        className="animate-mirage-fade absolute inset-0 z-30 bg-black/60"
      />

      <div className="animate-mirage-sheet absolute inset-x-0 bottom-0 z-40 rounded-t-[30px] rounded-b-[47px] bg-[var(--card)] px-6 pt-3.5 pb-7 shadow-[var(--shadow-2xl)]">
        <div className="mx-auto mb-5 h-[5px] w-[40px] rounded-full bg-[var(--border)]" />

        {activeSheet === "call" && (
          <div>
            <div className="text-[14px] text-[var(--muted-foreground)]">{copy.callInProgress}</div>
            <h3 className="mono mt-1 mb-0.5 text-[22px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
              {callerNumber}
            </h3>
            <div className="mono mb-5 text-[15px] text-[var(--muted-foreground)]">
              {callDuration}
            </div>
            <button
              type="button"
              onClick={onEndCall}
              className="h-[54px] w-full rounded-[var(--radius-md)] bg-[var(--destructive)] text-[17px] font-bold text-white transition hover:brightness-105"
            >
              {copy.endCall}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 h-[42px] w-full rounded-[var(--radius-md)] bg-transparent text-[15px] font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            >
              {copy.backToCall}
            </button>
          </div>
        )}

        {activeSheet === "details" && (
          <div>
            <h3 className="m-0 mb-3 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
              {copy.accountDetailsTitle}
            </h3>
            <div className="flex items-baseline justify-between border-b border-[var(--border)] py-3 text-[14.5px]">
              <span className="text-[var(--muted-foreground)]">{copy.accountNumberLabel}</span>
              <b className="mono text-[13.5px] font-medium text-[var(--foreground)]">
                {meta.accountNumber}
              </b>
            </div>
            <div className="flex items-baseline justify-between border-b border-[var(--border)] py-3 text-[14.5px]">
              <span className="text-[var(--muted-foreground)]">{copy.detailIban}</span>
              <b className="mono text-[12px] font-medium text-[var(--foreground)]">
                {meta.ownIban}
              </b>
            </div>
            <div className="flex items-baseline justify-between border-b border-[var(--border)] py-3 text-[14.5px]">
              <span className="text-[var(--muted-foreground)]">{copy.cardNumberLabel}</span>
              <b className="mono text-[13.5px] font-medium text-[var(--foreground)]">
                {meta.cardNumber}
              </b>
            </div>
            <div className="mb-4 flex items-baseline justify-between py-3 text-[14.5px]">
              <span className="text-[var(--muted-foreground)]">{copy.validThruLabel}</span>
              <b className="mono text-[13.5px] font-medium text-[var(--foreground)]">
                {meta.validThru}
              </b>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-[54px] w-full rounded-[var(--radius-md)] bg-[var(--primary)] text-[17px] font-bold text-[var(--primary-foreground)]"
            >
              {copy.close}
            </button>
          </div>
        )}

        {activeSheet === "honeytrap_cb412" && (
          <div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--secondary)] text-[var(--foreground)]">
              <Landmark className="h-7 w-7" />
            </div>
            <h3 className="m-0 mb-2.5 text-[23px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
              {copy.cb412Title}
            </h3>
            <p className="m-0 mb-5 text-[14.5px] leading-[1.45] text-[var(--secondary-foreground)]">
              {cb412Error}
            </p>
            <button
              type="button"
              onClick={onUseAlternateIban}
              className="h-[54px] w-full rounded-[var(--radius-md)] bg-[var(--primary)] text-[16.5px] font-bold text-[var(--primary-foreground)] transition hover:brightness-105"
            >
              {copy.cb412UseAlternate}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 h-[40px] w-full rounded-[var(--radius-md)] bg-transparent text-[14.5px] font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            >
              {copy.close}
            </button>
          </div>
        )}

        {activeSheet === "revealed_safe" && (
          <div>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent)] text-[var(--primary)]">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="m-0 mb-2.5 text-[25px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
              {copy.safeSheetTitle}
            </h3>
            <p className="m-0 mb-4 text-[15px] leading-[1.45] text-[var(--accent-foreground)]">
              {copy.safeSheetBodyPrefix} {formatAed(stoppedAmount, activeAccount.currency, 0)}{" "}
              {copy.safeSheetBodyMid} {stoppedRecipient}. {copy.safeSheetBodySuffix}
            </p>
            {trustedAlertSent && (
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/40 bg-[var(--secondary)] px-3 py-1 text-[12px] font-semibold text-[var(--primary)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                {copy.pushFamilyNotified}
              </div>
            )}
            <button
              type="button"
              onClick={onViewAccountAfterReveal}
              className="h-[54px] w-full rounded-[var(--radius-md)] bg-[var(--primary)] text-[16.5px] font-bold text-[var(--primary-foreground)] transition hover:brightness-105"
            >
              {copy.viewAccount}
            </button>
            <button
              type="button"
              onClick={onSeeWhatHappened}
              className="mt-2 h-[42px] w-full rounded-[var(--radius-md)] bg-transparent text-[15px] font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            >
              {copy.seeWhatHappened}
            </button>
          </div>
        )}

        {activeSheet === "ask_real" && (
          <div>
            <h3 className="m-0 mb-2.5 text-[24px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
              {copy.askRealTitle}
            </h3>
            <p className="m-0 mb-4 text-[14.5px] leading-[1.45] text-[var(--accent-foreground)]">
              {copy.askRealBody}
            </p>
            <div className="mb-4 flex items-baseline justify-between rounded-[var(--radius-sm)] bg-[var(--secondary)] px-4 py-3.5">
              <span className="text-[14.5px] text-[var(--muted-foreground)]">
                {copy.askRealAmountLabel}
              </span>
              <b className="mono text-[20px] font-bold tracking-[-0.03em] text-[var(--foreground)]">
                {formatAed(stoppedAmount, activeAccount.currency, 0)}
              </b>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-[54px] w-full rounded-[var(--radius-md)] bg-[var(--primary)] text-[16.5px] font-bold text-[var(--primary-foreground)]"
            >
              {copy.keepStopped}
            </button>
            <button
              type="button"
              onClick={onRequestManualReview}
              className="mt-2 h-[42px] w-full rounded-[var(--radius-md)] bg-transparent text-[14.5px] font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            >
              {copy.requestManualReview}
            </button>
          </div>
        )}

        {activeSheet === "recipient_picker" && (
          <div>
            <h3 className="m-0 mb-3 text-[21px] font-extrabold tracking-[-0.02em] text-[var(--foreground)]">
              {copy.recipientPickerTitle}
            </h3>

            {suggestedMules.length > 0 && (
              <div className="mb-3 space-y-2">
                {suggestedMules.map((mule) => (
                  <button
                    key={mule.value}
                    type="button"
                    onClick={() => {
                      onApplyRecipient(mule.value, mule.label, mule.suggestedAmount);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-left transition hover:border-[var(--primary)]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-semibold text-[var(--foreground)]">
                        {mule.label}
                      </div>
                      <div className="mono text-[11.5px] text-[var(--muted-foreground)]">
                        {shortIban(mule.value)}
                      </div>
                    </div>
                    <span className="mono ml-2 text-[12px] font-semibold text-[var(--primary)]">
                      {formatAed(mule.suggestedAmount, activeAccount.currency, 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!draftValue.trim()) {
                  return;
                }
                onApplyRecipient(draftValue.trim(), draftLabel.trim());
                onClose();
              }}
              className="space-y-2.5"
            >
              <div>
                <label className="mb-1 block text-[11.5px] font-semibold text-[var(--muted-foreground)]">
                  {copy.recipientCustomLabel}
                </label>
                <input
                  type="text"
                  value={draftValue}
                  onChange={(event) => setDraftValue(event.target.value)}
                  onPaste={onPasteRecipient}
                  placeholder={copy.recipientCustomPlaceholder}
                  className="mono h-[42px] w-full rounded-[12px] border border-[var(--border)] bg-[var(--background)] px-3 text-[12.5px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <input
                type="text"
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                placeholder={copy.recipientNamePlaceholder}
                className="h-[40px] w-full rounded-[12px] border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
              />

              <button
                type="submit"
                disabled={draftValue.trim().length === 0}
                className="h-[48px] w-full rounded-[var(--radius-md)] bg-[var(--primary)] text-[15.5px] font-bold text-[var(--primary-foreground)] disabled:opacity-45"
              >
                {copy.applyRecipient}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
