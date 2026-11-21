import { ArrowRight, Check, Send } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  COERCION_ACTIVATION_THRESHOLD,
  type DetectionSignals,
  type MirageState,
  type ScenarioPreset,
  type ScriptedTranscriptChunk,
  type TranscriptSpeaker,
} from "../../../shared/mirage-types.ts";
import { formatAed, formatSignalReason, getUiCopy, shortIban } from "../../lib/ui-copy.ts";

const POST_CALL_COOLDOWN_MS = 180_000;

export type MiragePanelProps = {
  state: MirageState;
  preset: ScenarioPreset;
  isBusy: boolean;
  isAiPending: boolean;
  isRevealed: boolean;
  isCallerBlocked: boolean;
  phonePersona: "victim" | "guardian";
  onStartCall: () => Promise<void>;
  onEndCall: () => Promise<void>;
  onUpdateSignals: (patch: Partial<DetectionSignals>) => Promise<void>;
  onPlayNextChunk: () => Promise<void>;
  onPlayCue: (chunk: ScriptedTranscriptChunk) => Promise<void>;
  onInjectTranscript: (speaker: TranscriptSpeaker, text: string) => Promise<void>;
  onToggleGuardianView: () => void;
};

function getRiskColor(score: number, isMirage: boolean, isActivityLive: boolean): string {
  if (isMirage || score >= COERCION_ACTIVATION_THRESHOLD) {
    return "var(--primary)";
  }
  if (score >= 35) {
    return "#f59e0b";
  }
  return isActivityLive ? "var(--call-green)" : "var(--muted-foreground)";
}

export function MiragePanel({
  state,
  preset,
  isBusy,
  isAiPending,
  isRevealed,
  isCallerBlocked,
  phonePersona,
  onStartCall,
  onEndCall,
  onUpdateSignals,
  onPlayNextChunk,
  onPlayCue,
  onInjectTranscript,
  onToggleGuardianView,
}: MiragePanelProps) {
  const copy = getUiCopy(state.locale);
  const [customLine, setCustomLine] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [riskDelta, setRiskDelta] = useState<number | null>(null);

  const prevScoreRef = useRef(state.call.detection.combinedScore);
  const prevSessionRef = useRef(state.sessionId);
  const deltaTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);

  const combinedScore = state.call.detection.combinedScore;

  useEffect(() => {
    if (prevSessionRef.current !== state.sessionId) {
      prevSessionRef.current = state.sessionId;
      prevScoreRef.current = combinedScore;
      setRiskDelta(null);
      setShowCustomInput(false);
      setCustomLine("");
      return;
    }

    const diff = combinedScore - prevScoreRef.current;
    prevScoreRef.current = combinedScore;
    if (diff !== 0) {
      setRiskDelta(diff);
      if (deltaTimerRef.current !== null) {
        window.clearTimeout(deltaTimerRef.current);
      }
      deltaTimerRef.current = window.setTimeout(() => {
        setRiskDelta(null);
        deltaTimerRef.current = null;
      }, 2400);
    }
  }, [combinedScore, state.sessionId]);

  useEffect(() => {
    return () => {
      if (deltaTimerRef.current !== null) {
        window.clearTimeout(deltaTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [state.call.transcript.length]);

  useEffect(() => {
    if (showCustomInput) {
      customInputRef.current?.focus();
    }
  }, [showCustomInput]);

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

  async function handleToggleScreenShare() {
    const next = !state.call.detection.signals.screenSharing;
    if (next && !state.call.active) {
      await onStartCall();
    }
    await onUpdateSignals({ screenSharing: next });
  }

  async function handleToggleUnverifiedCaller() {
    const next = !state.call.detection.signals.unverifiedCaller;
    if (next && !state.call.active) {
      await onStartCall();
    }
    await onUpdateSignals({ unverifiedCaller: next });
  }

  async function handleToggleIbanPasted() {
    const next = !state.call.detection.signals.clipboardPasteDetected;
    await onUpdateSignals({ clipboardPasteDetected: next });
  }

  const isMirage = state.mode === "mirage";
  const isSafeCase = preset.category === "safe";
  const signals = state.call.detection.signals;
  const isScreenSharing = signals.screenSharing;
  const hasDecoyReceipt = isMirage && state.receipts.length > 0;
  const customerNotTold = hasDecoyReceipt && !isRevealed && (state.call.active || isScreenSharing);

  const inCooldown =
    !state.call.active &&
    Boolean(state.call.endedAt) &&
    nowMs - Date.parse(state.call.endedAt ?? "") < POST_CALL_COOLDOWN_MS;

  const isActivityLive = state.call.active || inCooldown || state.call.transcript.length > 0;
  const statusLabel = isMirage
    ? copy.statusMirageActive
    : isActivityLive
      ? copy.statusMonitoring
      : copy.statusStandby;

  const algo = state.call.detection.algorithm;
  const ai = state.call.detection.ai;

  const rawReasonTags = [
    ...algo.matchedConstructions,
    ...algo.activeFlags,
    ...algo.matchedKeywords,
  ];
  const humanReasons = Array.from(
    new Set(rawReasonTags.map((tag) => formatSignalReason(tag, state.locale))),
  );
  const visibleReasonsText = humanReasons.slice(0, 3).join(" · ");
  const fullReasonsTitle = humanReasons.join(" · ");

  const riskColor = getRiskColor(combinedScore, isMirage, isActivityLive);

  const playedTexts = new Set(state.call.transcript.map((entry) => entry.text));
  const nextChunk = preset.scriptedChunks[state.scriptedChunkIndex];
  const allCuesPlayed = state.scriptedChunkIndex >= preset.scriptedChunks.length;

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
  const hasDecoyBalanceDiff = !isRevealed && currentMirageTotal !== currentRealTotal && isMirage;

  const showOutcomeBlock = isMirage || state.receipts.length > 0 || state.capturedMules.length > 0;

  const transferredValueColor =
    actuallyTransferred === 0
      ? "text-[var(--primary)]"
      : isSafeCase
        ? "text-[var(--call-green)]"
        : "text-[var(--destructive)]";

  const verdictEngineLabel =
    algo.score >= COERCION_ACTIVATION_THRESHOLD && ai.source === "ai"
      ? copy.verdictEngineBoth
      : ai.source === "ai"
        ? copy.verdictEngineHaiku
        : copy.verdictEngineAlgo;

  const verdictReason =
    ai.source !== "standby" && ai.reasoning
      ? ai.reasoning
      : isMirage
        ? copy.verdictActiveBody
        : copy.safeControlLedgerNote;

  const callChipText = state.call.active
    ? copy.chipCallActive
    : inCooldown
      ? copy.chipCallCooldown
      : state.call.endedAt
        ? copy.chipCallEnded
        : copy.chipCallActive;

  return (
    <section
      aria-label="Mirage private bank panel"
      className="dark relative flex h-[780px] w-[560px] flex-none flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--background)] px-7 py-6 shadow-[var(--shadow-xl)]"
    >
      {/* Zone A: Quiet header + single-row interactive signal chips */}
      <div className="flex flex-none items-baseline justify-between gap-3">
        <div className="min-w-0 truncate text-[20px] font-bold tracking-[-0.01em] text-[var(--foreground)]">
          {copy.panelBrand}
          <small className="ml-2.5 text-[12px] font-medium tracking-[0.02em] text-[var(--muted-foreground)]">
            {copy.panelSubtitle}
          </small>
        </div>

        <span
          className={`inline-flex flex-none items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap ${
            isMirage ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isMirage
                ? "bg-[var(--primary)]"
                : isActivityLive
                  ? "bg-[var(--call-green)]"
                  : "bg-[var(--muted-foreground)]/60"
            }`}
          />
          {statusLabel}
        </span>
      </div>

      <div className="mt-3.5 flex flex-none flex-nowrap items-center gap-1.5">
        <button
          type="button"
          disabled={isBusy}
          title={copy.chipTipCall}
          onClick={() => void (state.call.active ? onEndCall() : onStartCall())}
          aria-pressed={state.call.active}
          className={`inline-flex h-[28px] flex-none items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 text-[12px] font-semibold whitespace-nowrap transition hover:border-[var(--primary)]/50 ${
            state.call.active
              ? "text-[var(--foreground)]"
              : inCooldown
                ? "text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <i
            aria-hidden="true"
            className={`h-[7px] w-[7px] flex-none rounded-full ${
              state.call.active
                ? "bg-[var(--call-green)]"
                : inCooldown
                  ? "bg-[var(--primary)]"
                  : "bg-[var(--accent)]"
            }`}
          />
          {callChipText}
        </button>

        <button
          type="button"
          disabled={isBusy}
          title={copy.chipTipScreen}
          onClick={() => void handleToggleScreenShare()}
          aria-pressed={isScreenSharing}
          className={`inline-flex h-[28px] flex-none items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 text-[12px] font-semibold whitespace-nowrap transition hover:border-[var(--primary)]/50 ${
            isScreenSharing
              ? "text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <i
            aria-hidden="true"
            className={`h-[7px] w-[7px] flex-none rounded-full ${
              isScreenSharing ? "bg-[var(--primary)]" : "bg-[var(--accent)]"
            }`}
          />
          {copy.chipScreenSharing}
        </button>

        <button
          type="button"
          disabled={isBusy}
          title={copy.chipTipUnverified}
          onClick={() => void handleToggleUnverifiedCaller()}
          aria-pressed={signals.unverifiedCaller}
          className={`inline-flex h-[28px] flex-none items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 text-[12px] font-semibold whitespace-nowrap transition hover:border-[var(--primary)]/50 ${
            signals.unverifiedCaller
              ? "text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <i
            aria-hidden="true"
            className={`h-[7px] w-[7px] flex-none rounded-full ${
              signals.unverifiedCaller ? "bg-[var(--primary)]" : "bg-[var(--accent)]"
            }`}
          />
          {copy.chipUnverified}
        </button>

        <button
          type="button"
          disabled={isBusy}
          title={copy.chipTipIban}
          onClick={() => void handleToggleIbanPasted()}
          aria-pressed={signals.clipboardPasteDetected}
          className={`inline-flex h-[28px] flex-none items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 text-[12px] font-semibold whitespace-nowrap transition hover:border-[var(--primary)]/50 ${
            signals.clipboardPasteDetected
              ? "text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <i
            aria-hidden="true"
            className={`h-[7px] w-[7px] flex-none rounded-full ${
              signals.clipboardPasteDetected ? "bg-[var(--primary)]" : "bg-[var(--accent)]"
            }`}
          />
          {copy.chipIbanPasted}
        </button>
      </div>

      {/* Zone B: Borderless live risk scale directly on dark canvas */}
      <div className="mt-5 flex-none">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              {copy.fraudRiskLabel}
            </div>
            <div className="mt-1 flex items-baseline gap-2.5">
              <span
                className="mono text-[38px] leading-none font-bold tracking-[-0.04em]"
                style={{ color: riskColor }}
              >
                {combinedScore}%
              </span>
              {riskDelta !== null && (
                <motion.span
                  key={`${combinedScore}-${riskDelta}`}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mono text-[13px] font-semibold ${
                    riskDelta > 0 ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {riskDelta > 0 ? `+${riskDelta}%` : `${riskDelta}%`}
                </motion.span>
              )}
            </div>
          </div>

          <div className="space-y-1 text-right text-[12.5px] leading-tight">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[var(--muted-foreground)]">{copy.algorithmShort}</span>
              <span
                className={`mono font-semibold ${
                  algo.score >= COERCION_ACTIVATION_THRESHOLD
                    ? "text-[var(--primary)]"
                    : "text-[var(--foreground)]"
                }`}
              >
                {algo.score}%
              </span>
              <span className="mono text-[11px] text-[var(--muted-foreground)]">&lt;1ms</span>
            </div>

            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[var(--muted-foreground)]">{copy.haikuShort}</span>
              <span
                className={`mono font-semibold ${
                  ai.score >= COERCION_ACTIVATION_THRESHOLD
                    ? "text-[var(--primary)]"
                    : "text-[var(--foreground)]"
                }`}
              >
                {ai.score}%
              </span>
              {isAiPending && (
                <span className="animate-mirage-blink text-[11px] font-semibold text-[var(--primary)]">
                  {copy.analyzingInline}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Single smooth risk bar with 65% Mirage threshold */}
        <div className="relative mt-3">
          <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-[var(--secondary)]">
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{
                width: `${combinedScore}%`,
                backgroundColor:
                  combinedScore === 0 ? "transparent" : getRiskColor(combinedScore, isMirage, true),
              }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-[2px] h-[10px] w-[2px] rounded-full bg-[var(--foreground)]/70"
            style={{ left: `${COERCION_ACTIVATION_THRESHOLD}%` }}
          />
          <div className="mono relative mt-1.5 flex items-center justify-between text-[10px] font-medium text-[var(--muted-foreground)]">
            <span>0%</span>
            <span
              style={{ left: `${COERCION_ACTIVATION_THRESHOLD}%` }}
              className={`absolute -translate-x-1/2 whitespace-nowrap ${
                combinedScore >= COERCION_ACTIVATION_THRESHOLD
                  ? "font-semibold text-[var(--primary)]"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              {copy.thresholdShortLabel}
            </span>
            <span>100%</span>
          </div>
        </div>

        {/* Single calm line of human-readable signals (no ALL_CAPS_SNAKE_CASE) */}
        <p
          title={humanReasons.length > 0 ? fullReasonsTitle : preset.summary[state.locale]}
          className={`mt-2.5 truncate text-[12.5px] ${
            humanReasons.length > 0
              ? "text-[var(--secondary-foreground)]"
              : "text-[var(--muted-foreground)]"
          }`}
        >
          {humanReasons.length > 0 ? visibleReasonsText : preset.summary[state.locale]}
        </p>
      </div>

      {/* Zone C: Borderless live transcript + compact cue step-director */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        {state.call.transcript.length > 0 && (
          <div
            ref={transcriptRef}
            className={`mirage-scroll mb-3 space-y-1.5 overflow-y-auto pr-1 ${
              showOutcomeBlock ? "max-h-[144px]" : "max-h-[168px]"
            }`}
          >
            {state.call.transcript.map((entry) => {
              const speakerName =
                entry.speaker === "caller"
                  ? copy.speakerCaller
                  : entry.speaker === "victim"
                    ? copy.speakerCustomer
                    : copy.speakerAiDecoy;
              return (
                <div
                  key={entry.id}
                  className="animate-mirage-rise flex items-baseline gap-2.5 text-[13.5px] leading-[1.4]"
                >
                  <b className="w-[68px] flex-none text-[12px] font-semibold text-[var(--muted-foreground)]">
                    {speakerName}
                  </b>
                  <span
                    className={`min-w-0 flex-1 ${
                      entry.speaker === "caller"
                        ? "text-[var(--foreground)]"
                        : "text-[var(--secondary-foreground)]"
                    }`}
                  >
                    “{entry.text}”
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Compact step director row */}
        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            disabled={allCuesPlayed || isBusy}
            onClick={() => void onPlayNextChunk()}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 text-[12px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] disabled:opacity-40"
          >
            {allCuesPlayed ? copy.linesDoneBtn : copy.nextLineBtn}
            {!allCuesPlayed && <ArrowRight className="h-3.5 w-3.5 text-[var(--primary)]" />}
          </button>

          <div className="flex items-center gap-1.5">
            {preset.scriptedChunks.map((chunk, idx) => {
              const isPlayed = playedTexts.has(chunk.text);
              const isNext = idx === state.scriptedChunkIndex;
              const speakerLabel =
                chunk.speaker === "caller" ? copy.speakerCaller : copy.speakerCustomer;
              return (
                <button
                  key={chunk.id}
                  type="button"
                  disabled={isBusy}
                  onClick={() => void onPlayCue(chunk)}
                  title={`${speakerLabel}: “${chunk.text}”`}
                  aria-label={`${idx + 1}. ${speakerLabel}: ${chunk.text}`}
                  className={`mono inline-flex h-[28px] w-[28px] items-center justify-center rounded-full border text-[11.5px] font-semibold transition ${
                    isPlayed
                      ? "border-[var(--border)] bg-[var(--card)]/60 text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
                      : isNext
                        ? "border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_18%,var(--card))] text-[var(--foreground)]"
                        : "border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]"
                  }`}
                >
                  {isPlayed ? <Check className="h-3 w-3 stroke-[2.5]" /> : idx + 1}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowCustomInput((prev) => !prev)}
            aria-expanded={showCustomInput}
            className={`ml-auto text-[12px] font-medium transition ${
              showCustomInput
                ? "text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {copy.customLineBtn}
          </button>
        </div>

        {/* Optional expandable custom phrase input */}
        {showCustomInput && (
          <form onSubmit={handleInjectSubmit} className="animate-mirage-fade mt-2.5 flex gap-2">
            <input
              ref={customInputRef}
              type="text"
              value={customLine}
              onChange={(event) => setCustomLine(event.target.value)}
              placeholder={copy.cueLivePlaceholder}
              className="h-[34px] min-w-0 flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 text-[12.5px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isBusy || customLine.trim().length === 0}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--secondary)] px-3 text-[12px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] disabled:opacity-45"
            >
              <Send className="h-3 w-3" />
              {copy.injectSend}
            </button>
          </form>
        )}

        {/* Quiet clickable preview of next scripted line while no outcome block yet */}
        {!showOutcomeBlock && !showCustomInput && nextChunk && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onPlayCue(nextChunk)}
            title={nextChunk.text}
            className="mt-2.5 flex w-full items-baseline gap-1.5 text-left text-[12px] text-[var(--muted-foreground)] transition hover:text-[var(--secondary-foreground)] disabled:opacity-45"
          >
            <span className="flex-none font-semibold">{copy.nextPreviewPrefix}</span>
            <span className="min-w-0 truncate">“{nextChunk.text}”</span>
          </button>
        )}
      </div>

      {/* Zone D: Borderless AED 0 punchline + SINGLE accented verdict card */}
      {showOutcomeBlock && (
        <div className="animate-mirage-fade mt-auto flex-none pt-3">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              {copy.actuallyTransferred}
            </div>
            <div
              className={`mono mt-1.5 text-[48px] leading-none font-bold tracking-[-0.04em] ${transferredValueColor}`}
            >
              {formatAed(actuallyTransferred, preset.currency, 0)}
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[13.5px] text-[var(--secondary-foreground)]">
              <span>
                {copy.realBalancePrefix}{" "}
                <b className="mono font-semibold text-[var(--foreground)]">
                  {formatAed(currentRealTotal, preset.currency, 0)}
                </b>
              </span>
              {hasDecoyBalanceDiff && (
                <span className="text-[var(--muted-foreground)]">
                  · {copy.phoneShowsInlinePrefix}{" "}
                  <span className="mono text-[var(--secondary-foreground)]">
                    {formatAed(phoneDisplayedTotal, preset.currency, 0)}
                  </span>
                </span>
              )}
            </div>

            {(isMirage || state.capturedMules.length > 0 || state.trustedAlertSent) && (
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px]">
                <div
                  title={state.capturedMules.map((m) => `${m.label}: ${m.value}`).join(" | ")}
                  className="min-w-0 truncate text-[var(--muted-foreground)]"
                >
                  {state.capturedMules.length > 0 ? (
                    <>
                      <span>{copy.capturedMulesPrefix} </span>
                      <span className="mono font-medium text-[var(--foreground)]">
                        {state.capturedMules
                          .map(
                            (mule) =>
                              `#${mule.attemptNumber} ${
                                mule.attemptNumber === 1
                                  ? copy.guardianMuleCb412
                                  : copy.guardianMuleDecoy
                              } ${shortIban(mule.value)}`,
                          )
                          .join(" · ")}
                      </span>
                    </>
                  ) : (
                    <span>{copy.honeytrapReadyInline}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onToggleGuardianView}
                  aria-pressed={phonePersona === "guardian"}
                  title={
                    phonePersona === "guardian" ? copy.familyAlertBackTip : copy.familyAlertOpenTip
                  }
                  className="flex-none font-semibold whitespace-nowrap text-[var(--primary)] transition hover:underline"
                >
                  {copy.familyGuardianLink}
                </button>
              </div>
            )}
          </div>

          {/* The ONE accented verdict card on the left panel */}
          <div
            className={`mt-3.5 rounded-[var(--radius-sm)] border px-4 py-3 ${
              isMirage
                ? "border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_14%,var(--card))] shadow-[var(--shadow-sm)]"
                : "border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <i
                aria-hidden="true"
                className={`h-[9px] w-[9px] flex-none rounded-full ${
                  isMirage
                    ? "bg-[var(--primary)] shadow-[0_0_0_5px_color-mix(in_oklch,var(--primary)_25%,transparent)]"
                    : "bg-[var(--call-green)]"
                }`}
              />
              <span className="text-[16px] font-bold tracking-[-0.01em] text-[var(--foreground)]">
                {isMirage ? copy.verdictActive : copy.verdictLegitTitle}
              </span>
              <span className="ml-auto text-[10.5px] font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
                {verdictEngineLabel}
              </span>
            </div>

            <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.4] text-[var(--secondary-foreground)]">
              {verdictReason}
            </p>

            {customerNotTold && (
              <div className="mt-1.5 text-[11.5px] font-semibold text-[var(--primary)]">
                {copy.signalCustomerNotTold}
              </div>
            )}

            {isRevealed && (
              <div className="mt-1.5 text-[11.5px] font-semibold text-[var(--primary)]">
                {copy.customerNotifiedNote}
                {isCallerBlocked ? ` ${copy.callerBlockedNote}` : ""}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
