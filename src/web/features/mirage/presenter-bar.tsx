import { ExternalLink, PhoneCall, PhoneOff, RotateCcw } from "lucide-react";
import type {
  Locale,
  MirageState,
  PresetSummary,
  ScenarioPreset,
} from "../../../shared/mirage-types.ts";
import { getUiCopy } from "../../lib/ui-copy.ts";

export type PresenterBarProps = {
  state: MirageState;
  preset: ScenarioPreset;
  presets: PresetSummary[];
  isConnected: boolean;
  isBusy: boolean;
  useLiveAi: boolean;
  callerVoice: boolean;
  phonePersona: "victim" | "guardian";
  onSelectPreset: (presetId: string) => void;
  onStartCall: () => void;
  onEndCall: () => void;
  onReset: () => void;
  onToggleLiveAi: (enabled: boolean) => void;
  onToggleCallerVoice: (enabled: boolean) => void;
  onChangePhonePersona: (persona: "victim" | "guardian") => void;
  onSwitchLocale: (locale: Locale) => void;
};

function getPresetDotClass(item: PresetSummary): string {
  if (item.category === "safe") {
    return "bg-[var(--call-green)]";
  }
  if (item.id === "bank-refund-trap") {
    return "bg-[var(--destructive)]";
  }
  return "bg-[var(--primary)]";
}

export function PresenterBar({
  state,
  preset,
  presets,
  isConnected,
  isBusy,
  useLiveAi,
  callerVoice,
  phonePersona,
  onSelectPreset,
  onStartCall,
  onEndCall,
  onReset,
  onToggleLiveAi,
  onToggleCallerVoice,
  onChangePhonePersona,
  onSwitchLocale,
}: PresenterBarProps) {
  const copy = getUiCopy(state.locale);
  const hasGuardianAlert = state.trustedAlertSent || state.mode === "mirage";
  const effectivePresets: PresetSummary[] =
    presets.length > 0
      ? presets
      : [
          {
            id: preset.id,
            shortLabel: preset.shortLabel,
            category: preset.category,
            summary: preset.summary,
            scenarioTitle: preset.scenarioTitle,
          },
        ];

  return (
    <header className="flex h-[56px] w-full flex-none items-center gap-2 overflow-x-auto border-b border-[var(--border)] bg-[var(--card)] px-3">
      <span className="text-[11px] font-semibold tracking-[0.14em] whitespace-nowrap text-[var(--muted-foreground)] uppercase">
        {copy.caseTag}
      </span>

      <div
        role="tablist"
        aria-label="Demo scenario presets"
        className="flex flex-none overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)]/50"
      >
        {effectivePresets.map((item) => {
          const isSelected = item.id === preset.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              disabled={isBusy}
              onClick={() => onSelectPreset(item.id)}
              title={item.summary[state.locale]}
              className={`inline-flex h-[32px] items-center gap-1.5 border-r border-[var(--border)] px-2.5 text-[12px] font-semibold whitespace-nowrap transition last:border-r-0 ${
                isSelected
                  ? "bg-[var(--secondary)] text-[var(--foreground)]"
                  : "bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className={`h-2 w-2 flex-none rounded-full ${getPresetDotClass(item)}`} />
              {item.shortLabel[state.locale]}
            </button>
          );
        })}
      </div>

      {state.call.active ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={onEndCall}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--destructive)] bg-[var(--destructive)] px-3 text-[12.5px] font-semibold whitespace-nowrap text-white transition hover:brightness-105 disabled:opacity-40"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          {copy.endCall}
        </button>
      ) : (
        <button
          type="button"
          disabled={isBusy}
          onClick={onStartCall}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--primary)] bg-[var(--primary)] px-3 text-[12.5px] font-semibold whitespace-nowrap text-[var(--primary-foreground)] transition hover:brightness-105 disabled:opacity-40"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          {copy.startCall}
        </button>
      )}

      <button
        type="button"
        disabled={isBusy}
        onClick={onReset}
        className="inline-flex h-[34px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-2.5 text-[12.5px] font-medium whitespace-nowrap text-[var(--secondary-foreground)] transition hover:bg-[var(--secondary)] disabled:opacity-40"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {copy.reset}
      </button>

      <div className="ml-auto flex items-center gap-2 pl-1">
        <label className="flex cursor-pointer items-center gap-1 text-[11.5px] font-medium whitespace-nowrap text-[var(--muted-foreground)] select-none">
          <input
            type="checkbox"
            checked={useLiveAi}
            onChange={(event) => onToggleLiveAi(event.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--primary)]"
          />
          {copy.liveHaikuLabel}
        </label>

        <label className="flex cursor-pointer items-center gap-1 text-[11.5px] font-medium whitespace-nowrap text-[var(--muted-foreground)] select-none">
          <input
            type="checkbox"
            checked={callerVoice}
            onChange={(event) => onToggleCallerVoice(event.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--primary)]"
          />
          {copy.callerVoiceLabel}
        </label>

        <div
          role="group"
          aria-label={copy.personaAriaLabel}
          className="flex flex-none overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)]/50"
        >
          <button
            type="button"
            aria-pressed={phonePersona === "victim"}
            onClick={() => onChangePhonePersona("victim")}
            className={`inline-flex h-[30px] items-center px-2 text-[11.5px] font-semibold whitespace-nowrap transition ${
              phonePersona === "victim"
                ? "bg-[var(--secondary)] text-[var(--foreground)]"
                : "bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {copy.personaVictim}
          </button>
          <button
            type="button"
            aria-pressed={phonePersona === "guardian"}
            onClick={() => onChangePhonePersona("guardian")}
            className={`inline-flex h-[30px] items-center gap-1 border-l border-[var(--border)] px-2 text-[11.5px] font-semibold whitespace-nowrap transition ${
              phonePersona === "guardian"
                ? "bg-[var(--secondary)] text-[var(--foreground)]"
                : "bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {copy.personaGuardian}
            {hasGuardianAlert && (
              <span className="mono inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[9.5px] leading-none font-bold text-[var(--primary-foreground)]">
                1
              </span>
            )}
          </button>
        </div>

        <div className="flex overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
          <button
            type="button"
            onClick={() => onSwitchLocale("en")}
            className={`h-[30px] px-2 text-[11.5px] font-semibold transition ${
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
            className={`h-[30px] px-2 text-[11.5px] font-semibold transition ${
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
          className="inline-flex h-[30px] items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] px-2 text-[11.5px] font-semibold whitespace-nowrap text-[var(--foreground)] transition hover:bg-[var(--secondary)]"
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
