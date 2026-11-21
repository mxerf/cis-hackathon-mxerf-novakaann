import { BellRing, GitBranch, Network, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import type { MirageState } from "../../../core/mirage/types.ts";
import { getUiCopy } from "../../../i18n/index.ts";

export interface MuleGraphProps {
  state: MirageState;
}

export function MuleGraph({ state }: MuleGraphProps) {
  const copy = getUiCopy(state.locale);

  const stageLabel =
    state.honeytrapStage === "armed"
      ? copy.stageArmed
      : state.honeytrapStage === "first_mule_rejected"
        ? copy.stageFirstRejected
        : copy.stageCompleted;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-slate-100">{copy.muleGraphTitle}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-[11px] font-medium text-slate-200">
            {copy.honeytrapStageLabel}: {stageLabel}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              state.trustedAlertSent
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            <BellRing className="h-3 w-3" />
            {state.trustedAlertSent ? copy.trustedAlertSent : copy.trustedAlertStandby}
          </span>
        </div>
      </div>

      {state.capturedMules.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-500">
          {copy.noMulesYet}
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span className="font-mono font-semibold">{state.call.callerNumber}</span>
            <span className="text-rose-300/80">({state.call.callerLabel})</span>
          </div>

          <div className="ml-4 space-y-2 border-l border-slate-700 pl-4">
            {state.capturedMules.map((mule) => (
              <motion.div
                key={mule.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 text-violet-400" />
                    <span className="font-semibold text-slate-100">{mule.label}</span>
                    <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-violet-200 uppercase">
                      {mule.kind}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-sky-300">{mule.value}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      mule.attemptNumber === 1
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {copy.attemptBadge} #{mule.attemptNumber} ·{" "}
                    {mule.attemptNumber === 1 ? "CB-412 Bait" : "Decoy Settled"}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
