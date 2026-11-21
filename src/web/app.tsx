import {
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { MobileWallet } from "./features/mirage/mobile-wallet.tsx";
import { PhoneFrame } from "./features/mirage/phone-frame.tsx";
import { useMirageSync } from "./features/mirage/use-mirage-sync.ts";
import { XRayPanel } from "./features/mirage/xray-panel.tsx";
import { getUiCopy } from "./lib/ui-copy.ts";

export function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const isMobileRoute = pathname === "/mobile";

  const {
    state,
    preset,
    isConnected,
    isBusy,
    startCall,
    endCall,
    updateSignals,
    playNextChunk,
    injectTranscript,
    submitTransfer,
    sendSupportMessage,
    switchLocale,
    resetDemo,
  } = useMirageSync();

  if (!state || !preset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-sky-400" />
        <span className="text-xs font-medium">Connecting to Mirage tRPC…</span>
      </div>
    );
  }

  const copy = getUiCopy(state.locale);

  if (isMobileRoute) {
    return (
      <div className="min-h-screen bg-white">
        <div className="mx-auto min-h-screen max-w-md shadow-sm">
          <MobileWallet
            state={state}
            preset={preset}
            isBusy={isBusy}
            onUpdateSignals={updateSignals}
            onSubmitTransfer={submitTransfer}
            onSendSupport={sendSupportMessage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold tracking-tight text-white">{copy.appTitle}</span>
            <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
              {copy.stageBadge}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                state.mode === "mirage"
                  ? "bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/40"
                  : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
              }`}
            >
              {state.mode === "mirage" ? (
                <ShieldAlert className="h-3.5 w-3.5" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              {state.mode === "mirage" ? copy.modeMirage : copy.modeNormal}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                isConnected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? copy.connected : copy.reconnecting}
            </span>

            <div className="inline-flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => void switchLocale("en")}
                className={`px-2.5 py-1 transition ${
                  state.locale === "en"
                    ? "bg-sky-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => void switchLocale("ru")}
                className={`px-2.5 py-1 transition ${
                  state.locale === "ru"
                    ? "bg-sky-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                RU
              </button>
            </div>

            <a
              href="/mobile"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
            >
              {copy.mobileViewLink}
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => void resetDemo()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:border-rose-500 hover:text-rose-200 disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" />
              {copy.resetDemo}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start">
        <XRayPanel
          state={state}
          preset={preset}
          isBusy={isBusy}
          onStartCall={startCall}
          onEndCall={endCall}
          onUpdateSignals={updateSignals}
          onPlayNextChunk={playNextChunk}
          onInjectTranscript={injectTranscript}
        />

        <div className="lg:sticky lg:top-6">
          <PhoneFrame>
            <MobileWallet
              state={state}
              preset={preset}
              isBusy={isBusy}
              onUpdateSignals={updateSignals}
              onSubmitTransfer={submitTransfer}
              onSendSupport={sendSupportMessage}
            />
          </PhoneFrame>
        </div>
      </main>
    </div>
  );
}
