import {
  PhoneCall,
  PhoneOff,
  Play,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { COERCION_ACTIVATION_THRESHOLD } from "../../../core/mirage/index.ts";
import type { MirageState, ScenarioPreset, TranscriptSpeaker } from "../../../core/mirage/types.ts";
import { getUiCopy } from "../../../i18n/index.ts";

export interface CallSimulatorProps {
  state: MirageState;
  preset: ScenarioPreset;
  busy: boolean;
  onStartCall: () => Promise<void>;
  onEndCall: () => Promise<void>;
  onPlayNextChunk: (analyzeWithAi: boolean) => Promise<void>;
  onInjectTranscript: (
    speaker: TranscriptSpeaker,
    text: string,
    analyzeWithAi: boolean,
  ) => Promise<void>;
}

export function CallSimulator({
  state,
  preset,
  busy,
  onStartCall,
  onEndCall,
  onPlayNextChunk,
  onInjectTranscript,
}: CallSimulatorProps) {
  const copy = getUiCopy(state.locale);
  const [customText, setCustomText] = useState("");
  const [useAi, setUseAi] = useState(true);

  const remainingChunks = Math.max(0, preset.scriptedChunks.length - state.scriptedChunkIndex);
  const score = state.call.coercionScore;
  const barColor =
    score >= COERCION_ACTIVATION_THRESHOLD
      ? "bg-rose-500"
      : score >= 35
        ? "bg-amber-400"
        : "bg-emerald-400";

  const uniqueTactics = [
    ...new Set(state.call.transcript.flatMap((entry) => entry.flaggedTactics)),
  ];

  async function handleInject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = customText.trim();
    if (!trimmed) {
      return;
    }
    setCustomText("");
    await onInjectTranscript("caller", trimmed, useAi);
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio
            className={`h-4 w-4 ${state.call.active ? "animate-pulse text-rose-400" : "text-slate-500"}`}
          />
          <h2 className="text-sm font-semibold text-slate-100">{copy.callSimulatorTitle}</h2>
        </div>

        <div className="flex items-center gap-2">
          {!state.call.active ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onStartCall()}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              {copy.startCall}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onEndCall()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-600 disabled:opacity-50"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              {copy.endCall}
            </button>
          )}

          <button
            type="button"
            disabled={busy || remainingChunks === 0}
            onClick={() => void onPlayNextChunk(useAi)}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" />
            {remainingChunks > 0
              ? `${copy.nextScriptedLine} (${state.scriptedChunkIndex + 1}/${preset.scriptedChunks.length})`
              : copy.scriptFinished}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono">
          {state.call.callerNumber}
        </span>
        <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1">
          {state.call.callerLabel}
        </span>
        <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-medium text-amber-300">
          {copy.simAgeBadge}: {state.call.simAgeDays}d
        </span>
        <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-400">
          {preset.telecomCarrier}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-300">{copy.coercionMeterLabel}</span>
          <span className="font-mono font-bold text-slate-100 tabular-nums">
            {score}/100 · <span className="font-normal text-slate-400">{copy.thresholdHint}</span>
          </span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={false}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.35 }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/70"
            style={{ left: `${COERCION_ACTIVATION_THRESHOLD}%` }}
            title={`Threshold ${COERCION_ACTIVATION_THRESHOLD}`}
          />
        </div>

        {uniqueTactics.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {uniqueTactics.map((tactic) => (
              <span
                key={tactic}
                className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 font-mono text-[11px] text-rose-200"
              >
                <ShieldAlert className="h-3 w-3" />
                {tactic}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3">
        {state.call.transcript.length === 0 ? (
          <p className="text-xs text-slate-500">{copy.transcriptEmpty}</p>
        ) : (
          state.call.transcript.map((entry) => (
            <div key={entry.id} className="text-xs leading-relaxed">
              <span
                className={`mr-2 inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                  entry.speaker === "caller"
                    ? "bg-rose-500/20 text-rose-300"
                    : entry.speaker === "victim"
                      ? "bg-sky-500/20 text-sky-300"
                      : "bg-violet-500/20 text-violet-300"
                }`}
              >
                {entry.speaker}
              </span>
              <span className="text-slate-200">{entry.text}</span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleInject} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder={copy.customLinePlaceholder}
          className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-300">
          <input
            type="checkbox"
            checked={useAi}
            onChange={(e) => setUseAi(e.target.checked)}
            className="accent-sky-500"
          />
          <Sparkles className="h-3 w-3 text-sky-400" />
          {copy.useAiAnalysis}
        </label>
        <button
          type="submit"
          disabled={busy || !customText.trim()}
          className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-slate-700 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          {copy.sendCustomLine}
        </button>
      </form>
    </section>
  );
}
