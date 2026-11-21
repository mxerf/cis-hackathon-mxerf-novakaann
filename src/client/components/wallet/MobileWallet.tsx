import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Landmark,
  MessageSquare,
  PhoneCall,
  Send,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { getVisibleAccounts } from "../../../core/mirage/index.ts";
import type { DecoyReceipt, MirageState, ScenarioPreset } from "../../../core/mirage/types.ts";
import { formatMoney, getUiCopy } from "../../../i18n/index.ts";
import type { TransferActionResponse } from "../../hooks/useMirageSync.ts";

type WalletTab = "home" | "transfer" | "support";

export interface MobileWalletProps {
  state: MirageState;
  preset: ScenarioPreset;
  busy: boolean;
  onSubmitTransfer: (input: {
    fromAccountId: string;
    recipientValue: string;
    recipientLabel?: string;
    amount: number;
  }) => Promise<TransferActionResponse | null>;
  onSendSupport: (text: string) => Promise<void>;
}

export function MobileWallet({
  state,
  preset,
  busy,
  onSubmitTransfer,
  onSendSupport,
}: MobileWalletProps) {
  const copy = getUiCopy(state.locale);
  const visibleAccounts = getVisibleAccounts(state);
  const defaultAccountId = visibleAccounts[0]?.id ?? "acc-checking";

  const [tab, setTab] = useState<WalletTab>("home");
  const [fromAccountId, setFromAccountId] = useState(defaultAccountId);
  const [recipientValue, setRecipientValue] = useState("");
  const [recipientLabel, setRecipientLabel] = useState("");
  const [amountInput, setAmountInput] = useState("12000");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [latestReceipt, setLatestReceipt] = useState<DecoyReceipt | null>(null);
  const [supportDraft, setSupportDraft] = useState("");

  const totalBalance = visibleAccounts.reduce((sum, account) => sum + account.balance, 0);
  const primaryCurrency = visibleAccounts[0]?.currency ?? preset.currency;

  async function handleTransferSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTransferError(null);
    setLatestReceipt(null);

    const parsedAmount = Number(amountInput.replace(/,/g, "").trim());
    const response = await onSubmitTransfer({
      fromAccountId,
      recipientValue,
      recipientLabel: recipientLabel || undefined,
      amount: parsedAmount,
    });

    if (!response) {
      setTransferError("Network error while processing transfer.");
      return;
    }

    if (response.errorMessage) {
      setTransferError(response.errorMessage);
    }

    if (response.receipt) {
      setLatestReceipt(response.receipt);
      setRecipientValue("");
      setRecipientLabel("");
    }
  }

  async function handleSupportSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = supportDraft.trim();
    if (!trimmed) {
      return;
    }
    setSupportDraft("");
    await onSendSupport(trimmed);
  }

  return (
    <div className="flex h-full min-h-[640px] flex-col bg-white text-slate-900">
      {state.call.active && (
        <div className="flex items-center justify-between bg-emerald-600 px-4 py-2 text-xs font-medium text-white">
          <span className="flex items-center gap-1.5">
            <PhoneCall className="h-3.5 w-3.5 animate-pulse" />
            {copy.activeCallBanner} · {state.call.callerNumber}
          </span>
          <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
            HD
          </span>
        </div>
      )}

      <header className="border-b border-slate-100 bg-gradient-to-br from-sky-600 to-indigo-700 px-5 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold tracking-tight">{preset.brandName}</p>
            <p className="text-xs text-sky-100">{preset.walletSubtitle[state.locale]}</p>
          </div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">
            {primaryCurrency}
          </span>
        </div>

        <div className="mt-5">
          <p className="text-xs text-sky-100/90">{copy.totalBalance}</p>
          <p className="mt-0.5 text-3xl font-bold tracking-tight tabular-nums">
            {formatMoney(totalBalance, primaryCurrency)}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "home" && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              {visibleAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                      {account.kind === "vault" ? (
                        <Landmark className="h-5 w-5" />
                      ) : (
                        <Wallet className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{account.name}</p>
                      <p className="text-xs text-slate-500">
                        {account.kind === "vault" ? copy.vaultLabel : copy.checkingLabel}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatMoney(account.balance, account.currency)}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setTab("transfer")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <ArrowUpRight className="h-4 w-4" />
              {copy.walletTabTransfer}
            </button>

            <section className="pt-1">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {copy.recentReceipts}
              </h3>
              {state.receipts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  {copy.noReceiptsYet}
                </p>
              ) : (
                <div className="space-y-2">
                  {state.receipts.map((receipt) => (
                    <div
                      key={`${receipt.refCode}-${receipt.createdAt}`}
                      className="rounded-xl border border-slate-200 bg-white p-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900">
                        <span>{receipt.refCode}</span>
                        <span className="tabular-nums">
                          -{formatMoney(receipt.amount, receipt.currency)}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                        {receipt.recipientValue}
                      </p>
                      <p className="mt-1 text-[11px] text-emerald-700">{receipt.statusLabel}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "transfer" && (
          <div className="space-y-4">
            <form onSubmit={handleTransferSubmit} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {copy.fromAccount}
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                >
                  {visibleAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatMoney(acc.balance, acc.currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {copy.recipientLabel}
                </label>
                <input
                  type="text"
                  value={recipientValue}
                  onChange={(e) => setRecipientValue(e.target.value)}
                  placeholder={copy.recipientPlaceholder}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {copy.amountLabel} ({primaryCurrency})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 tabular-nums focus:border-sky-500 focus:outline-none"
                />
              </div>

              {preset.suggestedMules.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <p className="mb-1.5 text-[11px] font-medium text-slate-500">
                    {copy.quickFillLabel}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {preset.suggestedMules.map((mule) => (
                      <button
                        key={mule.value}
                        type="button"
                        onClick={() => {
                          setRecipientValue(mule.value);
                          setRecipientLabel(mule.label);
                          setAmountInput(String(mule.suggestedAmount));
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
                      >
                        {mule.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                <ArrowUpRight className="h-4 w-4" />
                {copy.sendTransfer}
              </button>
            </form>

            {transferError && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>{transferError}</p>
              </motion.div>
            )}

            {latestReceipt && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-950"
              >
                <div className="flex items-center gap-2 font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{latestReceipt.statusLabel}</span>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {latestReceipt.refCode}
                  </p>
                  <p className="tabular-nums">
                    {formatMoney(latestReceipt.amount, latestReceipt.currency)}
                  </p>
                  <p className="truncate font-mono text-[11px] text-slate-600">
                    {latestReceipt.recipientValue}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {tab === "support" && (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-2.5 overflow-y-auto pb-3">
              {state.supportMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === "user"
                      ? "ml-8 rounded-2xl rounded-br-sm bg-sky-600 px-3.5 py-2.5 text-xs text-white"
                      : "mr-6 rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2.5 text-xs text-slate-800"
                  }
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSupportSubmit} className="mt-auto flex gap-2 pt-2">
              <input
                type="text"
                value={supportDraft}
                onChange={(e) => setSupportDraft(e.target.value)}
                placeholder={copy.supportPlaceholder}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {copy.sendMessage}
              </button>
            </form>
          </div>
        )}
      </main>

      <nav className="grid grid-cols-3 border-t border-slate-200 bg-slate-50 px-2 py-2">
        <button
          type="button"
          onClick={() => setTab("home")}
          className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
            tab === "home" ? "text-sky-600" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Wallet className="h-4 w-4" />
          {copy.walletTabHome}
        </button>
        <button
          type="button"
          onClick={() => setTab("transfer")}
          className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
            tab === "transfer" ? "text-sky-600" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          {copy.walletTabTransfer}
        </button>
        <button
          type="button"
          onClick={() => setTab("support")}
          className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
            tab === "support" ? "text-sky-600" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          {copy.walletTabSupport}
        </button>
      </nav>
    </div>
  );
}
