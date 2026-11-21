import { ExternalLink } from "lucide-react";
import type { Locale, MirageState, ScenarioPreset } from "../../../shared/mirage-types.ts";
import { getUiCopy } from "../../lib/ui-copy.ts";

export type PresenterBarProps = {
  state: MirageState;
  preset: ScenarioPreset;
  isConnected: boolean;
  isBusy: boolean;
  isStartingDemo: boolean;
  useLiveAi: boolean;
  callerVoice: boolean;
  onStartDemo: () => void;
  onPlayNextChunk: () => void;
  onEndCall: () => void;
  onToggleSharing: () => void;
  onReset: () => void;
  onToggleLiveAi: (enabled: boolean) => void;
  onToggleCallerVoice: (enabled: boolean) => void;
  onSwitchLocale: (locale: Locale) => void;
};

export function PresenterBar({
  state,
  preset,
  isConnected,
  isBusy,
  isStartingDemo,
  useLiveAi,
  callerVoice,
  onStartDemo,
  onPlayNextChunk,
  onEndCall,
  onToggleSharing,
  onReset,
  onToggleLiveAi,
  onToggleCallerVoice,
  onSwitchLocale,
}: PresenterBarProps) {
  const copy = getUiCopy(state.locale);
  const isScreenSharing = state.call.detection.signals.screenSharing;
  const totalChunks = preset.scriptedChunks.length;
  const playedChunks = state.scriptedChunkIndex;
  const isLive =
    state.call.active ||
    state.call.transcript.length > 0 ||
    state.receipts.length > 0 ||
    Boolean(state.call.endedAt);
  const canPlayNext = isLive && playedChunks < totalChunks && !isBusy && !isStartingDemo;
  const canToggleShare = (state.call.active || isScreenSharing) && !isBusy;

  return (
    <header className="flex h-[56px] w-full flex-none items-center gap-2 overflow-x-auto border-b border-[var(--border)] bg-[var(--card)] px-4">
      <span className="mr-1 text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap text-[var(--muted-foreground)] uppercase">
        {copy.presenterTag}
      </span>

      <button
        type="button"
        disabled={isLive || isStartingDemo || isBusy}
        onClick={onStartDemo}
        className="h-[34px] rounded-[var(--radius-sm)] border border-[var(--primary)] bg-[var(--primary)] px-3.5 text-[13px] font-semibold whitespace-nowrap text-[var(--primary-foreground)] transition hover:brightness-105 disabled:opacity-40"
      >
        {isStartingDemo ? copy.startingDemo : copy.startDemo}
      </button>

      <button
        type="button"
        disabled={!canPlayNext}
        onClick={onPlayNextChunk}
        className="h-[34px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 text-[13px] font-semibold whitespace-nowrap text-[var(--foreground)] transition hover:bg-[var(--secondary)] disabled:opacity-40"
      >
        {playedChunks >= totalChunks
          ? `${copy.allLinesPlayed} (${totalChunks}/${totalChunks})`
          : `${copy.nextScamLine} (${playedChunks}/${totalChunks})`}
      </button>

      <button
        type="button"
        disabled={!state.call.active || isBusy}
        onClick={onEndCall}
        className="h-[34px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 text-[13px] font-semibold whitespace-nowrap text-[var(--foreground)] transition hover:bg-[var(--secondary)] disabled:opacity-40"
      >
        {copy.endCall}
      </button>

      <button
        type="button"
        disabled={!canToggleShare}
        onClick={onToggleSharing}
        className="h-[34px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-3 text-[13px] font-semibold whitespace-nowrap text-[var(--foreground)] transition hover:bg-[var(--secondary)] disabled:opacity-40"
      >
        {isScreenSharing ? copy.stopSharing : copy.shareScreen}
      </button>

      <button
        type="button"
        disabled={isBusy}
        onClick={onReset}
        className="h-[34px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 text-[13px] font-medium whitespace-nowrap text-[var(--secondary-foreground)] transition hover:bg-[var(--secondary)] disabled:opacity-40"
      >
        {copy.reset}
      </button>

      <div className="ml-auto flex items-center gap-3 pl-2">
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium whitespace-nowrap text-[var(--muted-foreground)] select-none">
          <input
            type="checkbox"
            checked={useLiveAi}
            onChange={(event) => onToggleLiveAi(event.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--primary)]"
          />
          {copy.liveHaikuLabel}
        </label>

        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium whitespace-nowrap text-[var(--muted-foreground)] select-none">
          <input
            type="checkbox"
            checked={callerVoice}
            onChange={(event) => onToggleCallerVoice(event.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--primary)]"
          />
          {copy.callerVoiceLabel}
        </label>

        <div className="flex overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => onSwitchLocale("en")}
            className={`h-[30px] px-2.5 text-[12px] font-semibold transition ${
              state.locale === "en"
                ? "bg-[var(--secondary)] text-[var(--foreground)]"
                : "bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onSwitchLocale("ru")}
            className={`h-[30px] px-2.5 text-[12px] font-semibold transition ${
              state.locale === "ru"
                ? "bg-[var(--secondary)] text-[var(--foreground)]"
                : "bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            RU
          </button>
        </div>

        <a
          href="/mobile"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-[30px] items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-2.5 text-[12px] font-semibold whitespace-nowrap text-[var(--foreground)] transition hover:bg-[var(--secondary)]"
        >
          {copy.mobileLink}
          <ExternalLink className="h-3 w-3 text-[var(--muted-foreground)]" />
        </a>

        <span
          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold whitespace-nowrap text-[var(--muted-foreground)]"
          title={isConnected ? copy.wsLive : copy.wsOffline}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-[var(--call-green)]" : "bg-amber-500"
            }`}
          />
          {isConnected ? copy.wsLive : copy.wsOffline}
        </span>
      </div>
    </header>
  );
}
