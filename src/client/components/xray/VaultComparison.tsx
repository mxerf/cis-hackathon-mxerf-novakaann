import { EyeOff, Lock, ShieldCheck } from "lucide-react";
import type { MirageState } from "../../../core/mirage/types.ts";
import { formatMoney, getUiCopy } from "../../../i18n/index.ts";

export interface VaultComparisonProps {
  state: MirageState;
}

export function VaultComparison({ state }: VaultComparisonProps) {
  const copy = getUiCopy(state.locale);
  const isMirage = state.mode === "mirage";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">{copy.vaultComparisonTitle}</h2>
        {isMirage && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {copy.realVaultProtected}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div
          className={`rounded-xl border p-3.5 ${
            isMirage
              ? "border-emerald-500/40 bg-emerald-950/25"
              : "border-slate-800 bg-slate-950/60"
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
              <Lock className={`h-3.5 w-3.5 ${isMirage ? "text-emerald-400" : "text-slate-400"}`} />
              {copy.realVaultTitle}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                isMirage
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {isMirage ? "IMMUTABLE" : copy.realVaultLive}
            </span>
          </div>

          <div className="space-y-2">
            {state.realAccounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2 text-xs"
              >
                <span className="text-slate-300">{acc.name}</span>
                <span className="font-mono font-bold text-emerald-300 tabular-nums">
                  {formatMoney(acc.balance, acc.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`rounded-xl border p-3.5 ${
            isMirage
              ? "border-violet-500/40 bg-violet-950/25"
              : "border-slate-800 bg-slate-950/60"
          }`}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
              <EyeOff className={`h-3.5 w-3.5 ${isMirage ? "text-violet-400" : "text-slate-400"}`} />
              {copy.mirageLedgerTitle}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                isMirage
                  ? "bg-violet-500/20 text-violet-200"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {isMirage ? copy.mirageLedgerActive : copy.mirageLedgerMirrored}
            </span>
          </div>

          <div className="space-y-2">
            {state.mirageAccounts.map((acc) => {
              const realMatch = state.realAccounts.find((r) => r.id === acc.id);
              const delta = realMatch ? acc.balance - realMatch.balance : 0;

              return (
                <div
                  key={acc.id}
                  className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2 text-xs"
                >
                  <span className="text-slate-300">{acc.name}</span>
                  <div className="flex items-center gap-2">
                    {delta < 0 && (
                      <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-[10px] text-violet-200 tabular-nums">
                        {formatMoney(delta, acc.currency)} decoy
                      </span>
                    )}
                    <span className="font-mono font-bold text-slate-100 tabular-nums">
                      {formatMoney(acc.balance, acc.currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
