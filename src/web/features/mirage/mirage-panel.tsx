import { BellRing, Lock, Send, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  COERCION_ACTIVATION_THRESHOLD,
  type AiAssessmentSource,
  type MirageState,
  type ScenarioPreset,
  type TranscriptSpeaker,
} from "../../../shared/mirage-types.ts";
import { formatAed, formatNumber, getUiCopy, shortIban } from "../../lib/ui-copy.ts";

const POST_CALL_COOLDOWN_MS = 180_000;

export type MiragePanelProps = {
  state: MirageState;
  preset: ScenarioPreset;
  isBusy: boolean;
  isRevealed: boolean;
  isCallerBlocked: boolean;
  onInjectTranscript: (speaker: TranscriptSpeaker, text: string) => Promise<void>;
};

function getSourceLabel(source: AiAssessmentSource, copy: ReturnType<typeof getUiCopy>): string {
  switch (source) {
    case "ai":
      return copy.sourceAi;
    case "scripted":
      return copy.sourceScripted;
    case "fallback":
      return copy.sourceFallback;
    case "standby":
      return copy.sourceStandby;
  }
}

function getStageLabel(
  stage: MirageState["honeytrapStage"],
  copy: ReturnType<typeof getUiCopy>,
): string {
  switch (stage) {
    case "armed":
      return copy.stageArmed;
    case "first_mule_rejected":
      return copy.stageFirstRejected;
    case "completed":
      return copy.stageCompleted;
  }
}

export function MiragePanel({
  state,
  preset,
  isBusy,
  isRevealed,
  isCallerBlocked,
  onInjectTranscript,
}: MiragePanelProps) {
  const copy = getUiCopy(state.locale);
  const [customLine, setCustomLine] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const isIdle =
    !state.call.active &&
    state.call.transcript.length === 0 &&
    state.receipts.length === 0 &&
    state.capturedMules.length === 0 &&
    !state.call.endedAt;

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [state.call.transcript.length]);

  useEffect(() => {
    if (!state.call.endedAt || state.call.active) {
      return;
    }
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, [state.call.active, state.call.endedAt]);

  async function handleInjectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = customLine.trim();
    if (!trimmed) {
      return;
    }
    setCustomLine("");
    await onInjectTranscript("caller", trimmed);
  }

  const isMirage = state.mode === "mirage";
  const isScreenSharing = state.call.detection.signals.screenSharing;
  const hasDecoyReceipt = isMirage && state.receipts.length > 0;
  const customerNotTold = hasDecoyReceipt && !isRevealed && (state.call.active || isScreenSharing);

  const inCooldown =
    !state.call.active &&
    Boolean(state.call.endedAt) &&
    nowMs - Date.parse(state.call.endedAt ?? "") < POST_CALL_COOLDOWN_MS;

  const algo = state.call.detection.algorithm;
  const ai = state.call.detection.ai;
  const combinedScore = state.call.detection.combinedScore;

  const algoTags = [...algo.matchedConstructions, ...algo.activeFlags, ...algo.matchedKeywords];
  const visibleAlgoTags = algoTags.slice(0, 4);
  const hiddenAlgoCount = Math.max(0, algoTags.length - visibleAlgoTags.length);

  const lastCallerLine = [...state.call.transcript]
    .reverse()
    .find((entry) => entry.speaker === "caller");

  const initialRealTotal =
    Object.values(state.initialBalancesByAccount).reduce((sum, val) => sum + val, 0) ||
    preset.initialAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const currentRealTotal = state.realAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const currentMirageTotal = state.mirageAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const phoneDisplayedTotal = isRevealed
    ? currentRealTotal
    : isMirage
      ? currentMirageTotal
      : currentRealTotal;
  const actuallyTransferred = Math.max(0, initialRealTotal - currentRealTotal);
  const decoyDelta = Math.max(0, currentRealTotal - currentMirageTotal);
  const showResultSection = isMirage || state.receipts.length > 0 || state.capturedMules.length > 0;

  const realEveryday = state.realAccounts.find((a) => a.kind === "checking");
  const realVault = state.realAccounts.find((a) => a.kind === "vault");

  return (
    <section
      aria-label="Mirage private bank panel"
      className="dark relative flex h-[780px] w-[560px] flex-none flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--background)] px-6 py-4 shadow-[var(--shadow-xl)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[20px] font-bold tracking-[-0.01em] text-[var(--foreground)]">
          {copy.panelBrand}
          <small className="ml-2.5 text-[12px] font-medium tracking-[0.02em] text-[var(--muted-foreground)]">
            {copy.panelSubtitle}
          </small>
        </div>

        {!isIdle && (
          <span
            className={`mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold tracking-[0.08em] uppercase ${
              isMirage
                ? "border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_18%,var(--card))] text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isMirage ? "bg-[var(--primary)]" : "bg-[var(--muted-foreground)]"
              }`}
            />
            {isMirage ? copy.panelModeMirage : copy.panelModeMonitoring}
          </span>
        )}
      </div>

      {isIdle ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[14px] text-[var(--muted-foreground)] opacity-60">
          {copy.panelWaiting}
        </div>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`animate-mirage-pop inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold ${
                state.call.active
                  ? "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
                  : inCooldown
                    ? "border-[var(--primary)]/50 bg-[var(--card)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
              }`}
            >
              <span
                className={`h-[7px] w-[7px] rounded-full ${
                  state.call.active || inCooldown ? "bg-[var(--primary)]" : "bg-[var(--accent)]"
                }`}
              />
              {state.call.active
                ? customerNotTold && !isScreenSharing
                  ? copy.signalCallStillActive
                  : copy.signalCallActive
                : inCooldown
                  ? copy.signalCallCooldown
                  : copy.signalCallEnded}
            </span>

            <span
              className={`animate-mirage-pop inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 text-[12px] font-semibold ${
                isScreenSharing ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
              }`}
            >
              <span
                className={`h-[7px] w-[7px] rounded-full ${
                  isScreenSharing ? "bg-[var(--primary)]" : "bg-[var(--accent)]"
                }`}
              />
              {isScreenSharing ? copy.signalSharingOn : copy.signalSharingOff}
            </span>

            {isScreenSharing && (
              <span className="animate-mirage-pop inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 text-[12px] font-semibold text-[var(--foreground)]">
                <Lock className="h-3 w-3 text-[var(--primary)]" />
                {copy.signalHiddenDetails}
              </span>
            )}

            {customerNotTold && (
              <span className="animate-mirage-pop inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[var(--primary)] bg-[var(--card)] px-2.5 text-[12px] font-semibold text-[var(--primary)]">
                {copy.signalCustomerNotTold}
              </span>
            )}
          </div>

          <div className="mt-2">
            <div
              ref={transcriptRef}
              className="mirage-scroll max-h-[84px] space-y-0.5 overflow-y-auto pr-1"
            >
              {state.call.transcript.length === 0 ? (
                <p className="py-1 text-[12.5px] text-[var(--muted-foreground)]">
                  {copy.transcriptListening}
                </p>
              ) : (
                state.call.transcript.map((entry) => {
                  const isCaller = entry.speaker === "caller";
                  const speakerName =
                    entry.speaker === "caller"
                      ? copy.speakerCaller
                      : entry.speaker === "victim"
                        ? copy.speakerCustomer
                        : copy.speakerAiDecoy;
                  return (
                    <div
                      key={entry.id}
                      className="animate-mirage-rise flex gap-2.5 py-0.5 text-[13px] leading-[1.35]"
                    >
                      <b className="w-[68px] flex-none pt-px text-[12px] font-semibold text-[var(--muted-foreground)]">
                        {speakerName}
                      </b>
                      <span
                        className={
                          isCaller
                            ? "text-[var(--foreground)]"
                            : "text-[var(--secondary-foreground)]"
                        }
                      >
                        “{entry.text}”
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleInjectSubmit} className="mt-2 flex gap-1.5">
              <input
                type="text"
                value={customLine}
                onChange={(event) => setCustomLine(event.target.value)}
                placeholder={copy.injectPlaceholder}
                className="h-8 min-w-0 flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isBusy || customLine.trim().length === 0}
                className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--secondary)] px-2.5 text-[12px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] disabled:opacity-45"
              >
                <Send className="h-3 w-3" />
                {copy.injectSend}
              </button>
            </form>
          </div>

          <div className="animate-mirage-rise mt-2.5 grid grid-cols-2 gap-2.5">
            <div className="flex flex-col rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 shadow-[var(--shadow-xs)]">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10.5px] font-semibold tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                  {copy.tier1Title}
                </span>
                <span
                  className={`mono text-[20px] leading-none font-bold tracking-[-0.02em] ${
                    algo.score >= COERCION_ACTIVATION_THRESHOLD
                      ? "text-[var(--primary)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {algo.score}%
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {visibleAlgoTags.length > 0 ? (
                  <>
                    {visibleAlgoTags.map((tag) => (
                      <span
                        key={tag}
                        title={tag}
                        className="mono max-w-[210px] truncate rounded-[6px] bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--foreground)]"
                      >
                        {tag}
                      </span>
                    ))}
                    {hiddenAlgoCount > 0 && (
                      <span className="mono rounded-[6px] border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted-foreground)]">
                        +{hiddenAlgoCount}
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-[11.5px] leading-snug text-[var(--muted-foreground)]">
                    {copy.tier1Waiting}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 shadow-[var(--shadow-xs)]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-semibold tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                    {copy.tier2Title}
                  </span>
                  <span className="mono w-fit rounded-[5px] border border-[var(--border)] bg-[var(--background)] px-1.5 py-px text-[9.5px] font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
                    {getSourceLabel(ai.source, copy)}
                  </span>
                </div>
                <span
                  className={`mono text-[20px] leading-none font-bold tracking-[-0.02em] ${
                    ai.score >= COERCION_ACTIVATION_THRESHOLD
                      ? "text-[var(--primary)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {ai.score}%
                </span>
              </div>

              <p
                title={ai.reasoning}
                className="mt-1.5 line-clamp-3 text-[11.5px] leading-[1.35] text-[var(--secondary-foreground)]"
              >
                {ai.reasoning}
              </p>
            </div>
          </div>

          <div
            className={`animate-mirage-rise mt-2.5 rounded-[var(--radius-sm)] border px-3.5 py-2.5 ${
              isMirage
                ? "border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_16%,var(--card))] shadow-[var(--shadow-sm)]"
                : "border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-[9px] w-[9px] flex-none rounded-full ${
                  isMirage
                    ? "bg-[var(--primary)] shadow-[0_0_0_5px_color-mix(in_oklch,var(--primary)_25%,transparent)]"
                    : "bg-[var(--muted-foreground)]"
                }`}
              />
              <span className="text-[16px] font-bold text-[var(--foreground)]">
                {isMirage ? copy.verdictActive : copy.verdictInactive}
              </span>
              <span className="mono ml-auto rounded-[6px] border border-[var(--border)] bg-[var(--background)]/60 px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase">
                {copy.verdictRiskPrefix} {combinedScore}/100 · ≥{COERCION_ACTIVATION_THRESHOLD}
              </span>
            </div>

            <p className="mt-1 text-[12.5px] leading-[1.35] text-[var(--secondary-foreground)]">
              {isRevealed
                ? copy.verdictRevealedBody
                : isMirage
                  ? copy.verdictActiveBody
                  : copy.verdictInactiveBody}
            </p>

            {lastCallerLine && (
              <div
                className={`mt-1.5 line-clamp-1 border-l-2 pl-2.5 text-[12px] text-[var(--foreground)] ${
                  isMirage ? "border-[var(--primary)]" : "border-[var(--muted-foreground)]"
                }`}
              >
                {copy.speakerCaller}: “{lastCallerLine.text}”
              </div>
            )}
          </div>

          {showResultSection && (
            <div className="animate-mirage-fade mt-auto pt-2">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="text-[10.5px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
                    {copy.actuallyTransferred}
                  </div>
                  <div
                    className={`mono mt-0.5 text-[36px] leading-none font-bold tracking-[-0.04em] ${
                      actuallyTransferred > 0
                        ? "text-[var(--destructive)]"
                        : "text-[var(--primary)]"
                    }`}
                  >
                    {formatAed(actuallyTransferred, preset.currency, 0)}
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    state.trustedAlertSent
                      ? "border-[var(--primary)]/60 bg-[color-mix(in_oklch,var(--primary)_14%,var(--card))] text-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {state.trustedAlertSent ? (
                    <BellRing className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {state.trustedAlertSent ? copy.familyAlertSent : copy.familyAlertStandby}
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-[var(--shadow-xs)]">
                  <div className="text-[10px] font-semibold tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                    {isMirage ? copy.realBalanceLocked : copy.realBalanceLive}
                  </div>
                  <div className="mono mt-0.5 text-[16px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                    {formatAed(currentRealTotal, preset.currency, 0)}
                  </div>
                  {realEveryday && realVault && (
                    <div className="mono mt-0.5 text-[10.5px] text-[var(--muted-foreground)]">
                      {copy.checkingShort} {formatNumber(realEveryday.balance, 0)} ·{" "}
                      {copy.vaultShort} {formatNumber(realVault.balance, 0)}
                    </div>
                  )}
                </div>

                <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-[var(--shadow-xs)]">
                  <div className="text-[10px] font-semibold tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                    {isMirage ? copy.phoneShowsMirage : copy.phoneShowsLive}
                  </div>
                  <div className="mono mt-0.5 text-[16px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
                    {formatAed(phoneDisplayedTotal, preset.currency, 0)}
                  </div>
                  <div className="mono mt-0.5 text-[10.5px] text-[var(--muted-foreground)]">
                    {isRevealed
                      ? copy.restoredAfterReveal
                      : decoyDelta > 0
                        ? `−${formatAed(decoyDelta, preset.currency, 0)} ${copy.decoyDeltaSuffix}`
                        : isMirage
                          ? copy.shadowSynced
                          : copy.liveLedgerSub}
                  </div>
                </div>
              </div>

              <div className="mt-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-[var(--shadow-xs)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
                    {copy.honeytrapLabel}
                  </span>
                  <span className="mono rounded-[5px] border border-[var(--border)] bg-[var(--background)] px-1.5 py-px text-[10px] font-semibold text-[var(--primary)]">
                    {getStageLabel(state.honeytrapStage, copy)}
                  </span>
                </div>

                {state.capturedMules.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {state.capturedMules.map((mule) => (
                      <span
                        key={mule.id}
                        title={`${mule.label} · ${mule.value}`}
                        className="mono inline-flex items-center gap-1.5 rounded-[7px] border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[11px] font-medium text-[var(--foreground)]"
                      >
                        <span className="font-bold text-[var(--primary)]">
                          #{mule.attemptNumber}
                        </span>
                        <span className="text-[var(--muted-foreground)]">
                          {mule.attemptNumber === 1 ? copy.muleAttempt1Tag : copy.muleAttempt2Tag}
                        </span>
                        <span>· {shortIban(mule.value)}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[11.5px] text-[var(--muted-foreground)]">
                    {copy.honeytrapArmedHint}
                  </p>
                )}
              </div>

              {isRevealed && (
                <div className="animate-mirage-rise mt-1.5 text-[12px] font-semibold text-[var(--primary)]">
                  {copy.customerNotifiedNote}
                  {isCallerBlocked ? ` ${copy.callerBlockedNote}` : ""}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
