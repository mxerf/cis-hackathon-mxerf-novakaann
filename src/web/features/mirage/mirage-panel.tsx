import {
  BellRing,
  Check,
  ClipboardPaste,
  MonitorUp,
  PhoneCall,
  Play,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  COERCION_ACTIVATION_THRESHOLD,
  type AiAssessmentSource,
  type DetectionSignals,
  type MirageState,
  type ScenarioPreset,
  type ScriptedTranscriptChunk,
  type TranscriptSpeaker,
} from "../../../shared/mirage-types.ts";
import { formatAed, formatNumber, getUiCopy, shortIban } from "../../lib/ui-copy.ts";

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

function getSourceLabel(
  source: AiAssessmentSource,
  isAiPending: boolean,
  copy: ReturnType<typeof getUiCopy>,
): string {
  if (isAiPending) {
    return copy.aiAnalyzingBadge;
  }
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

function getRiskBarColor(score: number, isMirage: boolean): string {
  if (isMirage || score >= COERCION_ACTIVATION_THRESHOLD) {
    return "var(--primary)";
  }
  if (score >= 35) {
    return "#f59e0b";
  }
  return "var(--call-green)";
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
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [riskDelta, setRiskDelta] = useState<number | null>(null);

  const prevScoreRef = useRef(state.call.detection.combinedScore);
  const prevSessionRef = useRef(state.sessionId);
  const deltaTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const combinedScore = state.call.detection.combinedScore;

  useEffect(() => {
    if (prevSessionRef.current !== state.sessionId) {
      prevSessionRef.current = state.sessionId;
      prevScoreRef.current = combinedScore;
      setRiskDelta(null);
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
  const modeBadgeLabel = isMirage
    ? copy.panelModeMirage
    : isActivityLive
      ? copy.panelModeMonitoring
      : copy.panelModeStandby;

  const algo = state.call.detection.algorithm;
  const ai = state.call.detection.ai;

  const algoTags = [...algo.matchedConstructions, ...algo.activeFlags, ...algo.matchedKeywords];
  const visibleAlgoTags = algoTags.slice(0, 3);
  const hiddenAlgoCount = Math.max(0, algoTags.length - visibleAlgoTags.length);

  const riskBarColor = getRiskBarColor(combinedScore, isMirage);
  const riskStatusLabel =
    isMirage || combinedScore >= COERCION_ACTIVATION_THRESHOLD
      ? copy.riskMirageEngaged
      : combinedScore >= 35
        ? copy.riskElevated
        : copy.riskLow;

  const playedTexts = new Set(state.call.transcript.map((entry) => entry.text));
  const playedCueCount = preset.scriptedChunks.filter((chunk) =>
    playedTexts.has(chunk.text),
  ).length;
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
  const decoyDelta = Math.max(0, currentRealTotal - currentMirageTotal);

  const realEveryday = state.realAccounts.find((a) => a.kind === "checking");
  const realVault = state.realAccounts.find((a) => a.kind === "vault");

  const transferredValueColor =
    actuallyTransferred === 0
      ? isMirage
        ? "text-[var(--primary)]"
        : "text-[var(--foreground)]"
      : isSafeCase
        ? "text-[var(--call-green)]"
        : "text-[var(--destructive)]";

  return (
    <section
      aria-label="Mirage private bank panel"
      className="dark relative flex h-[780px] w-[560px] flex-none flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--background)] px-5 py-4 shadow-[var(--shadow-xl)]"
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-[19px] font-bold tracking-[-0.01em] text-[var(--foreground)]">
          {copy.panelBrand}
          <small className="ml-2 text-[11.5px] font-medium tracking-[0.02em] text-[var(--muted-foreground)]">
            {copy.panelSubtitle}
          </small>
        </div>

        <div className="flex flex-none items-center gap-1.5">
          <span
            className={`mono rounded-full border px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.08em] uppercase ${
              isSafeCase
                ? "border-[var(--call-green)]/50 bg-[color-mix(in_srgb,var(--call-green)_14%,var(--card))] text-[var(--call-green)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--secondary-foreground)]"
            }`}
          >
            {isSafeCase ? copy.caseBadgeSafe : copy.caseBadgeScam}
          </span>

          <span
            className={`mono inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9.5px] font-semibold tracking-[0.08em] uppercase ${
              isMirage
                ? "border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_20%,var(--card))] text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isMirage
                  ? "bg-[var(--primary)]"
                  : isActivityLive
                    ? "bg-[var(--call-green)]"
                    : "bg-[var(--muted-foreground)]"
              }`}
            />
            {modeBadgeLabel}
          </span>
        </div>
      </div>

      {/* 2. HERO: Interactive Fraud Probability Scale + 2-Tier Sync Cards */}
      <div
        className={`mt-2.5 rounded-[var(--radius-sm)] border px-3.5 py-2.5 shadow-[var(--shadow-xs)] transition-colors ${
          isMirage
            ? "border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_14%,var(--card))]"
            : "border-[var(--border)] bg-[var(--card)]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[10.5px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              {copy.fraudProbabilityLabel}
            </span>
            <span
              className="mono text-[28px] leading-none font-bold tracking-[-0.03em]"
              style={{ color: riskBarColor }}
            >
              {combinedScore}%
            </span>
            {riskDelta !== null && (
              <motion.span
                key={`${combinedScore}-${riskDelta}`}
                initial={{ opacity: 0, y: 4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`mono rounded-full px-1.5 py-0.5 text-[10.5px] font-bold ${
                  riskDelta > 0
                    ? "bg-[color-mix(in_oklch,var(--primary)_24%,var(--background))] text-[var(--primary)]"
                    : "bg-[var(--secondary)] text-[var(--muted-foreground)]"
                }`}
              >
                {riskDelta > 0 ? `+${riskDelta}%` : `${riskDelta}%`}
              </motion.span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isAiPending && (
              <span className="mono inline-flex items-center gap-1 rounded-full border border-[var(--primary)]/50 bg-[var(--background)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
                <Sparkles className="animate-mirage-blink h-3 w-3" />
                {copy.aiAnalyzingBadge}
              </span>
            )}
            <span
              className="mono rounded-[6px] border border-[var(--border)] bg-[var(--background)]/70 px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase"
              style={{ color: riskBarColor }}
            >
              {riskStatusLabel}
            </span>
          </div>
        </div>

        {/* Live Probability Track with 65% Threshold Notch */}
        <div className="relative mt-2">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--background)]">
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{
                width: `${combinedScore}%`,
                backgroundColor: riskBarColor,
              }}
              transition={{ type: "spring", stiffness: 240, damping: 28 }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-[var(--foreground)]/75"
              style={{ left: `${COERCION_ACTIVATION_THRESHOLD}%` }}
            />
          </div>

          <div className="mono relative mt-1 flex items-center justify-between text-[9.5px] font-semibold text-[var(--muted-foreground)]">
            <span>0%</span>
            <span
              style={{ left: `${COERCION_ACTIVATION_THRESHOLD}%` }}
              className={`absolute -translate-x-1/2 whitespace-nowrap ${
                combinedScore >= COERCION_ACTIVATION_THRESHOLD
                  ? "text-[var(--primary)]"
                  : "text-[var(--secondary-foreground)]"
              }`}
            >
              ▲ {copy.thresholdNotchLabel}
            </span>
            <span>100%</span>
          </div>
        </div>

        <p className="mt-1 truncate text-[11px] text-[var(--secondary-foreground)]">
          {preset.summary[state.locale]}
        </p>
      </div>

      {/* 2-Tier Synchronized Cards */}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-[var(--shadow-xs)]">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
              {copy.tier1Title}
            </span>
            <span
              className={`mono text-[16px] leading-none font-bold ${
                algo.score >= COERCION_ACTIVATION_THRESHOLD
                  ? "text-[var(--primary)]"
                  : "text-[var(--foreground)]"
              }`}
            >
              {algo.score}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--background)]">
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{
                width: `${algo.score}%`,
                backgroundColor: getRiskBarColor(
                  algo.score,
                  algo.score >= COERCION_ACTIVATION_THRESHOLD,
                ),
              }}
              transition={{ duration: 0.25 }}
            />
          </div>
          <div className="mt-1.5 flex h-[34px] flex-wrap content-start gap-1 overflow-hidden">
            {visibleAlgoTags.length > 0 ? (
              <>
                {visibleAlgoTags.map((tag) => (
                  <span
                    key={tag}
                    title={tag}
                    className="mono max-w-[215px] truncate rounded-[5px] bg-[var(--secondary)] px-1.5 py-px text-[9.5px] font-medium text-[var(--foreground)]"
                  >
                    {tag}
                  </span>
                ))}
                {hiddenAlgoCount > 0 && (
                  <span className="mono rounded-[5px] border border-[var(--border)] px-1.5 py-px text-[9.5px] font-semibold text-[var(--muted-foreground)]">
                    +{hiddenAlgoCount}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[10.5px] leading-tight text-[var(--muted-foreground)]">
                {copy.tier1Waiting}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-[var(--shadow-xs)]">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
              {copy.tier2Title}
            </span>
            <div className="flex flex-none items-center gap-1.5">
              <span
                className={`mono rounded-[4px] border px-1 py-px text-[8.5px] font-semibold whitespace-nowrap uppercase ${
                  isAiPending
                    ? "animate-mirage-blink border-[var(--primary)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]"
                }`}
              >
                {getSourceLabel(ai.source, isAiPending, copy)}
              </span>
              <span
                className={`mono text-[16px] leading-none font-bold ${
                  ai.score >= COERCION_ACTIVATION_THRESHOLD
                    ? "text-[var(--primary)]"
                    : "text-[var(--foreground)]"
                }`}
              >
                {ai.score}%
              </span>
            </div>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--background)]">
            <motion.div
              className="h-full rounded-full"
              initial={false}
              animate={{
                width: `${ai.score}%`,
                backgroundColor: getRiskBarColor(
                  ai.score,
                  ai.score >= COERCION_ACTIVATION_THRESHOLD,
                ),
              }}
              transition={{ duration: 0.35 }}
            />
          </div>
          <p
            title={ai.reasoning}
            className="mt-1.5 line-clamp-2 max-h-[29px] overflow-hidden text-[10.5px] leading-[1.35] text-[var(--secondary-foreground)]"
          >
            {ai.reasoning}
          </p>
        </div>
      </div>

      {/* 3. Interactive OS Signal Toggles */}
      <div className="mt-2 flex flex-nowrap items-center justify-between gap-1.5">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void (state.call.active ? onEndCall() : onStartCall())}
          aria-pressed={state.call.active}
          className={`inline-flex h-[27px] flex-auto items-center justify-center gap-1 rounded-full border px-2 text-[10.5px] font-semibold whitespace-nowrap transition ${
            state.call.active
              ? "border-[var(--call-green)]/70 bg-[color-mix(in_srgb,var(--call-green)_16%,var(--card))] text-[var(--foreground)]"
              : inCooldown
                ? "border-[var(--primary)]/50 bg-[var(--card)] text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <PhoneCall className="h-3 w-3 flex-none" />
          {inCooldown ? copy.toggleCallCooldown : copy.toggleCallActive}
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleToggleUnverifiedCaller()}
          aria-pressed={signals.unverifiedCaller}
          className={`inline-flex h-[27px] flex-auto items-center justify-center gap-1 rounded-full border px-2 text-[10.5px] font-semibold whitespace-nowrap transition ${
            signals.unverifiedCaller
              ? "border-[var(--primary)]/70 bg-[color-mix(in_oklch,var(--primary)_16%,var(--card))] text-[var(--foreground)]"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <ShieldAlert className="h-3 w-3 flex-none" />
          {copy.toggleUnverifiedCaller}
          <span className="mono text-[9.5px] opacity-75">+10%</span>
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleToggleScreenShare()}
          aria-pressed={isScreenSharing}
          className={`inline-flex h-[27px] flex-auto items-center justify-center gap-1 rounded-full border px-2 text-[10.5px] font-semibold whitespace-nowrap transition ${
            isScreenSharing
              ? "border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_22%,var(--card))] text-[var(--foreground)]"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <MonitorUp className="h-3 w-3 flex-none" />
          {copy.toggleScreenShare}
          <span className="mono text-[9.5px] opacity-75">+26%</span>
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => void handleToggleIbanPasted()}
          aria-pressed={signals.clipboardPasteDetected}
          className={`inline-flex h-[27px] flex-auto items-center justify-center gap-1 rounded-full border px-2 text-[10.5px] font-semibold whitespace-nowrap transition ${
            signals.clipboardPasteDetected
              ? "border-[var(--primary)]/70 bg-[color-mix(in_oklch,var(--primary)_16%,var(--card))] text-[var(--foreground)]"
              : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <ClipboardPaste className="h-3 w-3 flex-none" />
          {copy.toggleIbanPasted}
          <span className="mono text-[9.5px] opacity-75">+12%</span>
        </button>
      </div>

      {/* 4. Interactive Cue Deck + Custom Input + Compact Live Transcript */}
      <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              {copy.cueDeckTitle}
            </span>
            <span className="mono text-[10px] font-semibold text-[var(--muted-foreground)]">
              {playedCueCount}/{preset.scriptedChunks.length}
            </span>
          </div>

          <button
            type="button"
            disabled={allCuesPlayed || isBusy}
            onClick={() => void onPlayNextChunk()}
            className="inline-flex h-[24px] items-center gap-1 rounded-full border border-[var(--primary)]/70 bg-[color-mix(in_oklch,var(--primary)_16%,var(--card))] px-2.5 text-[11px] font-semibold text-[var(--foreground)] transition hover:brightness-110 disabled:opacity-40"
          >
            <Play className="h-2.5 w-2.5 fill-current" />
            {allCuesPlayed ? copy.cueAllPlayed : copy.cuePlayNext}
          </button>
        </div>

        <div className="mirage-scroll mt-1.5 max-h-[144px] flex-none space-y-1 overflow-y-auto pr-0.5">
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
                title={chunk.text}
                className={`flex w-full items-center gap-2 rounded-[10px] border px-2.5 py-1.5 text-left transition ${
                  isPlayed
                    ? "border-[var(--border)] bg-[var(--card)]/55 text-[var(--muted-foreground)] hover:border-[var(--primary)]/40"
                    : isNext
                      ? "border-[var(--primary)]/60 bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--primary)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--primary)]/60"
                }`}
              >
                <span
                  className={`mono flex h-4 w-4 flex-none items-center justify-center rounded-full text-[9.5px] font-bold ${
                    isPlayed
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : isNext
                        ? "bg-[color-mix(in_oklch,var(--primary)_22%,var(--secondary))] text-[var(--primary)]"
                        : "bg-[var(--secondary)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {isPlayed ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : idx + 1}
                </span>

                <span className="w-[54px] flex-none text-[10.5px] font-semibold text-[var(--muted-foreground)]">
                  {speakerLabel}
                </span>

                <span className="min-w-0 flex-1 truncate text-[11.5px]">“{chunk.text}”</span>

                {chunk.autoEnableScreenShare && (
                  <span className="mono flex-none rounded-[5px] bg-[var(--secondary)] px-1.5 py-px text-[9.5px] font-semibold text-[var(--primary)]">
                    {copy.cueScreenTag}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleInjectSubmit} className="mt-1.5 flex gap-1.5">
          <input
            type="text"
            value={customLine}
            onChange={(event) => setCustomLine(event.target.value)}
            placeholder={copy.cueLivePlaceholder}
            className="h-8 min-w-0 flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-[11.5px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isBusy || customLine.trim().length === 0}
            className="inline-flex h-8 items-center gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--secondary)] px-2.5 text-[11.5px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] disabled:opacity-45"
          >
            <Send className="h-3 w-3" />
            {copy.injectSend}
          </button>
        </form>

        <div
          ref={transcriptRef}
          className="mirage-scroll mt-1.5 min-h-0 flex-1 overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--card)]/60 px-2.5 py-1.5"
        >
          {state.call.transcript.length === 0 ? (
            <p className="text-[11px] text-[var(--muted-foreground)]">{copy.transcriptIdleHint}</p>
          ) : (
            <div className="space-y-1">
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
                    className="animate-mirage-rise flex items-baseline gap-2 text-[11px] leading-[1.3]"
                  >
                    <b className="w-[54px] flex-none font-semibold text-[var(--muted-foreground)]">
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
                    {entry.flaggedTactics.length > 0 && (
                      <span className="mono flex-none rounded bg-[var(--secondary)] px-1 py-px text-[9px] text-[var(--primary)]">
                        {entry.flaggedTactics[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Bottom Outcome & Protection Block (Real vs Mirage + Honeytrap) */}
      <div className="mt-auto pt-2">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              {copy.actuallyTransferred}
            </div>
            <div
              className={`mono mt-0.5 text-[34px] leading-none font-bold tracking-[-0.04em] ${transferredValueColor}`}
            >
              {formatAed(actuallyTransferred, preset.currency, 0)}
            </div>
          </div>

          <div className="flex flex-nowrap items-center justify-end gap-1.5">
            {customerNotTold && (
              <span className="inline-flex items-center rounded-full border border-[var(--primary)]/60 bg-[var(--card)] px-2 py-1 text-[10px] font-semibold whitespace-nowrap text-[var(--primary)]">
                {copy.signalCustomerNotTold}
              </span>
            )}
            <button
              type="button"
              onClick={onToggleGuardianView}
              aria-pressed={phonePersona === "guardian"}
              title={
                phonePersona === "guardian" ? copy.familyAlertBackTip : copy.familyAlertOpenTip
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold whitespace-nowrap transition hover:brightness-110 ${
                phonePersona === "guardian"
                  ? "border-[var(--primary)] bg-[color-mix(in_oklch,var(--primary)_24%,var(--card))] text-[var(--foreground)] ring-1 ring-[var(--primary)]/50"
                  : state.trustedAlertSent
                    ? "border-[var(--primary)]/60 bg-[color-mix(in_oklch,var(--primary)_14%,var(--card))] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {state.trustedAlertSent ? (
                <BellRing className="h-3.5 w-3.5" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              {state.trustedAlertSent ? copy.familyAlertSent : copy.familyAlertStandby}
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-[var(--shadow-xs)]">
            <div className="text-[9.5px] font-semibold tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
              {isMirage ? copy.realBalanceLocked : copy.realBalanceLive}
            </div>
            <div className="mono mt-0.5 text-[15.5px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              {formatAed(currentRealTotal, preset.currency, 0)}
            </div>
            {realEveryday && realVault && (
              <div className="mono mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                {copy.checkingShort} {formatNumber(realEveryday.balance, 0)} · {copy.vaultShort}{" "}
                {formatNumber(realVault.balance, 0)}
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-[var(--shadow-xs)]">
            <div className="text-[9.5px] font-semibold tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
              {isMirage ? copy.phoneShowsMirage : copy.phoneShowsLive}
            </div>
            <div className="mono mt-0.5 text-[15.5px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              {formatAed(phoneDisplayedTotal, preset.currency, 0)}
            </div>
            <div className="mono mt-0.5 text-[10px] text-[var(--muted-foreground)]">
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

        <div className="mt-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 shadow-[var(--shadow-xs)]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9.5px] font-semibold tracking-[0.12em] text-[var(--muted-foreground)] uppercase">
              {copy.honeytrapLabel}
            </span>
            <span
              className={`mono rounded-[5px] border border-[var(--border)] bg-[var(--background)] px-1.5 py-px text-[9.5px] font-semibold ${
                isSafeCase && !isMirage ? "text-[var(--call-green)]" : "text-[var(--primary)]"
              }`}
            >
              {isSafeCase && !isMirage
                ? copy.caseBadgeSafe
                : getStageLabel(state.honeytrapStage, copy)}
            </span>
          </div>

          {state.capturedMules.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {state.capturedMules.map((mule) => (
                <span
                  key={mule.id}
                  title={`${mule.label} · ${mule.value}`}
                  className="mono inline-flex items-center gap-1 rounded-[6px] border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--foreground)]"
                >
                  <span className="font-bold text-[var(--primary)]">#{mule.attemptNumber}</span>
                  <span className="text-[var(--muted-foreground)]">
                    {mule.attemptNumber === 1 ? copy.muleAttempt1Tag : copy.muleAttempt2Tag}
                  </span>
                  <span>· {shortIban(mule.value)}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
              {isSafeCase && !isMirage ? copy.safeControlLedgerNote : copy.honeytrapArmedHint}
            </p>
          )}
        </div>

        {isRevealed && (
          <div className="animate-mirage-rise mt-1 text-[11.5px] font-semibold text-[var(--primary)]">
            {copy.customerNotifiedNote}
            {isCallerBlocked ? ` ${copy.callerBlockedNote}` : ""}
          </div>
        )}
      </div>
    </section>
  );
}
