import { ChevronDown, ExternalLink, PhoneCall, PhoneOff, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [controlsOpen, setControlsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!controlsOpen) {
      return;
    }
    function handleOutsideClick(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setControlsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setControlsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [controlsOpen]);

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
    <header className="relative z-40 flex h-[56px] w-full flex-none items-center gap-2.5 border-b border-[var(--border)] bg-[var(--card)] px-5">
      <div
        role="tablist"
        aria-label="Demo scenario presets"
        className="flex flex-none overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)]/45"
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
              className={`inline-flex h-[32px] items-center gap-1.5 border-r border-[var(--border)] px-3 text-[12px] font-semibold whitespace-nowrap transition last:border-r-0 ${
                isSelected
                  ? "bg-[var(--secondary)] text-[var(--foreground)]"
                  : "bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className={`h-1.5 w-1.5 flex-none rounded-full ${getPresetDotClass(item)}`} />
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
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--destructive)] bg-[var(--destructive)] px-3.5 text-[12.5px] font-semibold whitespace-nowrap text-white transition hover:brightness-105 disabled:opacity-40"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          {copy.endCall}
        </button>
      ) : (
        <button
          type="button"
          disabled={isBusy}
          onClick={onStartCall}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--primary)] bg-[var(--primary)] px-3.5 text-[12.5px] font-semibold whitespace-nowrap text-[var(--primary-foreground)] transition hover:brightness-105 disabled:opacity-40"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          {copy.startCall}
        </button>
      )}

      <button
        type="button"
        disabled={isBusy}
        onClick={onReset}
        className="inline-flex h-[34px] items-center gap-1.5 rounded-[var(--radius-sm)] border border-transparent bg-transparent px-2.5 text-[12.5px] font-medium whitespace-nowrap text-[var(--secondary-foreground)] transition hover:border-[var(--border)] hover:bg-[var(--secondary)]/60 disabled:opacity-40"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        {copy.reset}
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        <div
          role="group"
          aria-label={copy.personaAriaLabel}
          className="flex flex-none overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)]/45"
        >
          <button
            type="button"
            aria-pressed={phonePersona === "victim"}
            onClick={() => onChangePhonePersona("victim")}
            className={`inline-flex h-[32px] items-center px-3 text-[12px] font-semibold whitespace-nowrap transition ${
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
            className={`inline-flex h-[32px] items-center gap-1.5 border-l border-[var(--border)] px-3 text-[12px] font-semibold whitespace-nowrap transition ${
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

        <div ref={popoverRef} className="relative">
          <button
            type="button"
            aria-expanded={controlsOpen}
            aria-haspopup="dialog"
            onClick={() => setControlsOpen((prev) => !prev)}
            className={`inline-flex h-[34px] items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 text-[12.5px] font-medium whitespace-nowrap transition ${
              controlsOpen
                ? "border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)]"
                : "border-[var(--border)] bg-transparent text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/60"
            }`}
          >
            {copy.controlsLabel}
            <ChevronDown
              className={`h-3.5 w-3.5 opacity-75 transition-transform ${
                controlsOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {controlsOpen && (
            <div
              role="dialog"
              aria-label={copy.controlsLabel}
              className="animate-mirage-fade absolute top-[44px] right-0 z-50 flex w-[260px] flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[var(--shadow-xl)]"
            >
              <label className="flex cursor-pointer items-center justify-between gap-2 text-[13px] font-medium text-[var(--foreground)] select-none">
                <span>{copy.liveHaikuLabel}</span>
                <input
                  type="checkbox"
                  checked={useLiveAi}
                  onChange={(event) => onToggleLiveAi(event.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between gap-2 text-[13px] font-medium text-[var(--foreground)] select-none">
                <span>{copy.callerVoiceLabel}</span>
                <input
                  type="checkbox"
                  checked={callerVoice}
                  onChange={(event) => onToggleCallerVoice(event.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
              </label>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium text-[var(--muted-foreground)]">
                  {copy.languageLabel}
                </span>
                <div className="flex overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => onSwitchLocale("en")}
                    className={`h-[28px] px-2.5 text-[11.5px] font-semibold transition ${
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
                    className={`h-[28px] border-l border-[var(--border)] px-2.5 text-[11.5px] font-semibold transition ${
                      state.locale === "ru"
                        ? "bg-[var(--secondary)] text-[var(--foreground)]"
                        : "bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    RU
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                <a
                  href="/mobile"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--primary)] hover:underline"
                >
                  {copy.openMobileLabel}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                <span
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--muted-foreground)]"
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
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
