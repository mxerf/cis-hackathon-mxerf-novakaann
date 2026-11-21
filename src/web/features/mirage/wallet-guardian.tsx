import { ArrowLeft, Lock, PhoneCall, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MirageState, ScenarioPreset } from "../../../shared/mirage-types.ts";
import { formatAed, formatNumber, getUiCopy, shortIban } from "../../lib/ui-copy.ts";

export type WalletGuardianProps = {
  state: MirageState;
  preset: ScenarioPreset;
  onBackToVictim: () => void;
};

export function WalletGuardian({ state, preset, onBackToVictim }: WalletGuardianProps) {
  const copy = getUiCopy(state.locale);
  const [isCallingMom, setIsCallingMom] = useState(false);
  const [isHold24hEnabled, setIsHold24hEnabled] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastText(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastText(null);
      toastTimerRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const isAlertActive = state.mode === "mirage" || state.trustedAlertSent;

  const initialRealTotal =
    Object.values(state.initialBalancesByAccount).reduce((sum, val) => sum + val, 0) ||
    preset.initialAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const currentRealTotal = state.realAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const actuallyTransferred = Math.max(0, initialRealTotal - currentRealTotal);

  const realEveryday = state.realAccounts.find((acc) => acc.kind === "checking");
  const realVault = state.realAccounts.find((acc) => acc.kind === "vault");

  const { combinedScore, algorithm, ai } = state.call.detection;

  return (
    <div
      aria-label="Family Guardian app"
      className="animate-mirage-fade relative flex min-h-0 flex-1 flex-col"
    >
      {/* Status Bar */}
      <div className="flex h-[54px] flex-none items-center justify-between px-[30px] pt-1.5 text-[15px] font-semibold text-[var(--foreground)]">
        <span>9:41</span>
        <span className="flex items-center gap-[5px]" aria-hidden="true">
          <span
            className="inline-block h-[11px] w-[17px] rounded-[2px] bg-current"
            style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}
          />
          <span className="inline-block h-[11px] w-[24px] rounded-[3px] bg-current" />
        </span>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-1.5 pb-4">
        {/* App Header */}
        <div className="mb-3 flex flex-none items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--accent)] text-[12.5px] font-bold text-[var(--accent-foreground)]">
              FG
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13.5px] leading-tight font-bold text-[var(--foreground)]">
                {copy.guardianAppBrand}
              </div>
              <div className="truncate text-[11.5px] leading-tight font-medium text-[var(--muted-foreground)]">
                {copy.guardianAppSubtitle}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToVictim}
            className="inline-flex h-[30px] flex-none items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--secondary)] px-2.5 text-[12px] font-semibold text-[var(--foreground)] transition hover:brightness-110"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {copy.guardianBackVictim}
          </button>
        </div>

        {isAlertActive ? (
          <>
            {/* Native-style Push Alert Card */}
            <div className="animate-mirage-rise flex flex-none items-start gap-3 rounded-[22px] border border-[var(--primary)]/50 bg-[var(--card)] p-3 shadow-[var(--shadow-lg)]">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-[var(--primary)] text-[var(--primary-foreground)]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold tracking-[0.05em] text-[var(--muted-foreground)] uppercase">
                  <span className="truncate">{copy.guardianPushMeta}</span>
                  <span className="flex-none">{copy.guardianPushNow}</span>
                </div>
                <div className="mt-0.5 text-[14.5px] leading-tight font-bold text-[var(--foreground)]">
                  {copy.guardianPushTitle}
                </div>
                <div className="mt-0.5 text-[12px] leading-[1.35] text-[var(--secondary-foreground)]">
                  {copy.guardianPushBody}
                </div>
              </div>
            </div>

            {/* Hero Protected Balance Card */}
            <div className="mt-2.5 flex-none rounded-[24px] bg-[var(--card)] px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase">
                  {copy.guardianProtectedBalance}
                </span>
                <span
                  className={`mono inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${
                    actuallyTransferred === 0
                      ? "border-[var(--call-green)]/50 bg-[color-mix(in_srgb,var(--call-green)_14%,var(--background))] text-[var(--call-green)]"
                      : "border-[var(--destructive)]/50 bg-[color-mix(in_srgb,var(--destructive)_14%,var(--background))] text-[var(--destructive)]"
                  }`}
                >
                  {formatAed(actuallyTransferred, preset.currency, 0)} {copy.guardianLeftBankBadge}
                </span>
              </div>

              <div className="mono mt-1.5 text-[30px] leading-none font-bold tracking-[-0.04em] text-[var(--foreground)]">
                {formatAed(currentRealTotal, preset.currency, 0)}
              </div>

              {realEveryday && realVault && (
                <div className="mono mt-1.5 text-[11px] text-[var(--muted-foreground)]">
                  {copy.checkingShort} {formatNumber(realEveryday.balance, 0)} · {copy.vaultShort}{" "}
                  {formatNumber(realVault.balance, 0)}
                </div>
              )}
            </div>

            {/* Live Incident Details Card */}
            <div className="mt-2.5 flex-none rounded-[24px] bg-[var(--card)] px-4 py-1.5">
              <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border)] py-2.5 text-[12.5px]">
                <span className="text-[var(--muted-foreground)]">
                  {copy.guardianRiskScoreLabel}
                </span>
                <span className="mono text-right font-bold text-[var(--primary)]">
                  {combinedScore}%{" "}
                  <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
                    ({copy.guardianAlgoPrefix} {algorithm.score}% · {copy.guardianAiPrefix}{" "}
                    {ai.score}%)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] py-2.5 text-[12.5px]">
                <span className="flex-none text-[var(--muted-foreground)]">
                  {copy.guardianStatusLabel}
                </span>
                <span className="inline-flex min-w-0 items-center gap-1.5 text-right text-[12px] font-semibold text-[var(--foreground)]">
                  <span
                    className={`h-2 w-2 flex-none rounded-full ${
                      state.call.active
                        ? "animate-mirage-blink bg-[var(--primary)]"
                        : "bg-[var(--call-green)]"
                    }`}
                  />
                  <span className="truncate">
                    {state.call.active ? copy.guardianStatusLive : copy.guardianStatusEnded}
                  </span>
                </span>
              </div>

              <div className="py-2.5">
                <div className="text-[11px] font-semibold tracking-[0.04em] text-[var(--muted-foreground)] uppercase">
                  {copy.guardianMulesLabel}
                </div>
                {state.capturedMules.length > 0 ? (
                  <div className="mt-1.5 space-y-1">
                    {state.capturedMules.slice(0, 3).map((mule) => (
                      <div
                        key={mule.id}
                        title={`${mule.label} · ${mule.value}`}
                        className="mono flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-[11.5px]"
                      >
                        <span className="font-semibold text-[var(--primary)]">
                          #{mule.attemptNumber}{" "}
                          {mule.attemptNumber === 1
                            ? copy.guardianMuleCb412
                            : copy.guardianMuleDecoy}
                        </span>
                        <span className="text-[var(--foreground)]">{shortIban(mule.value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 text-[12px] text-[var(--secondary-foreground)]">
                    {copy.guardianMulesWaiting}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex-none pt-2">
              <button
                type="button"
                onClick={() => setIsCallingMom((prev) => !prev)}
                className={`flex h-[48px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-[14.5px] font-bold shadow-[var(--shadow-xs)] transition hover:brightness-105 ${
                  isCallingMom
                    ? "border border-[var(--call-green)]/70 bg-[color-mix(in_srgb,var(--call-green)_18%,var(--card))] text-[var(--foreground)]"
                    : "bg-[var(--primary)] text-[var(--primary-foreground)]"
                }`}
              >
                {isCallingMom ? (
                  <span className="animate-mirage-blink h-2.5 w-2.5 rounded-full bg-[var(--call-green)]" />
                ) : (
                  <PhoneCall className="h-4 w-4" />
                )}
                {isCallingMom ? copy.guardianCallingMom : copy.guardianCallMom}
              </button>

              <button
                type="button"
                onClick={() => setIsHold24hEnabled((prev) => !prev)}
                className={`mt-2 flex h-[44px] w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border text-[13.5px] font-semibold transition hover:brightness-110 ${
                  isHold24hEnabled
                    ? "border-[var(--primary)]/60 bg-[color-mix(in_oklch,var(--primary)_16%,var(--card))] text-[var(--primary)]"
                    : "border-transparent bg-[var(--card)] text-[var(--foreground)]"
                }`}
              >
                {!isHold24hEnabled && (
                  <Lock className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                )}
                {isHold24hEnabled ? copy.guardianHold24hActive : copy.guardianHold24h}
              </button>

              <button
                type="button"
                onClick={() => showToast(copy.guardianFalseAlarmToast)}
                className="mt-1.5 h-[36px] w-full rounded-[var(--radius-md)] bg-transparent text-[13px] font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
              >
                {copy.guardianFalseAlarm}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Mode 1: Calm Monitoring */}
            <div className="flex flex-none items-center gap-3.5 rounded-[28px] border border-[var(--call-green)]/35 bg-[var(--card)] px-4 py-4">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-[color-mix(in_srgb,var(--call-green)_16%,var(--background))] text-[var(--call-green)]">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] leading-snug font-bold text-[var(--foreground)]">
                  {copy.guardianAllClearTitle}
                </div>
                <div className="mt-0.5 text-[12.5px] leading-snug text-[var(--muted-foreground)]">
                  {copy.guardianAllClearSub}
                </div>
              </div>
            </div>

            {/* Linked Protected Profile */}
            <div className="mt-3 flex-none rounded-[28px] bg-[var(--card)] px-5 py-4">
              <div className="text-[13px] font-semibold text-[var(--secondary-foreground)]">
                {copy.guardianLinkedProfile}
              </div>
              <div className="mono mt-2 text-[34px] leading-tight font-bold tracking-[-0.04em] text-[var(--foreground)]">
                {formatAed(currentRealTotal, preset.currency, 0)}
              </div>
              <div className="mt-1 text-[12.5px] text-[var(--muted-foreground)]">
                {copy.guardianProtectedBalance}
              </div>
              {realEveryday && realVault && (
                <div className="mono mt-3 border-t border-[var(--border)] pt-3 text-[12px] text-[var(--muted-foreground)]">
                  {copy.checkingShort} {formatNumber(realEveryday.balance, 0)} · {copy.vaultShort}{" "}
                  {formatNumber(realVault.balance, 0)}
                </div>
              )}
            </div>

            {/* Protection Rules Card */}
            <div className="mt-3 flex-none rounded-[28px] bg-[var(--card)] px-5 py-3">
              <div className="mb-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase">
                {copy.guardianRulesTitle}
              </div>
              <div className="flex items-baseline justify-between border-b border-[var(--border)] py-3 text-[13.5px]">
                <span className="text-[var(--muted-foreground)]">
                  {copy.guardianRuleAutoShield}
                </span>
                <b className="mono font-semibold text-[var(--primary)]">
                  {copy.guardianRuleAutoShieldVal}
                </b>
              </div>
              <div className="flex items-baseline justify-between border-b border-[var(--border)] py-3 text-[13.5px]">
                <span className="text-[var(--muted-foreground)]">{copy.guardianRuleMasking}</span>
                <b className="font-semibold text-[var(--call-green)]">
                  {copy.guardianRuleMaskingVal}
                </b>
              </div>
              <div className="flex items-baseline justify-between py-3 text-[13.5px]">
                <span className="text-[var(--muted-foreground)]">{copy.guardianRuleAlert}</span>
                <b className="font-semibold text-[var(--foreground)]">
                  {copy.guardianRuleAlertVal}
                </b>
              </div>
            </div>
          </>
        )}
      </div>

      {toastText && (
        <div
          role="status"
          className="animate-mirage-fade pointer-events-none absolute top-[62px] left-1/2 z-30 w-max max-w-[340px] -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 py-2 text-center text-[12px] font-semibold text-[var(--foreground)] shadow-[var(--shadow-lg)]"
        >
          {toastText}
        </div>
      )}
    </div>
  );
}
