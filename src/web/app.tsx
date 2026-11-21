import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScriptedTranscriptChunk, TranscriptSpeaker } from "../shared/mirage-types.ts";
import { MiragePanel } from "./features/mirage/mirage-panel.tsx";
import { MobileWallet } from "./features/mirage/mobile-wallet.tsx";
import { PhoneFrame } from "./features/mirage/phone-frame.tsx";
import { PresenterBar } from "./features/mirage/presenter-bar.tsx";
import { useMirageSync } from "./features/mirage/use-mirage-sync.ts";
import { WalletGuardian } from "./features/mirage/wallet-guardian.tsx";
import { getUiCopy } from "./lib/ui-copy.ts";

export type PhonePersona = "victim" | "guardian";

function computeStageScale(): number {
  return Math.max(
    0.45,
    Math.min(1, (window.innerHeight - 56 - 32) / 780, (window.innerWidth - 40) / 1040),
  );
}

export function App() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const isMobileRoute = pathname === "/mobile";

  const {
    state,
    preset,
    presets,
    isConnected,
    isBusy,
    isAiPending,
    startCall,
    endCall,
    updateSignals,
    playNextChunk,
    injectTranscript,
    submitTransfer,
    sendSupportMessage,
    switchLocale,
    resetDemo,
    selectPreset,
  } = useMirageSync();

  const [stageScale, setStageScale] = useState<number>(() => computeStageScale());
  const [useLiveAi, setUseLiveAi] = useState(true);
  const [callerVoice, setCallerVoice] = useState(false);
  const [phonePersona, setPhonePersona] = useState<PhonePersona>("victim");
  const [revealedSessionId, setRevealedSessionId] = useState<string | null>(null);
  const [blockedSessionId, setBlockedSessionId] = useState<string | null>(null);

  const spokenIdsRef = useRef<Set<string>>(new Set());
  const lastSessionIdRef = useRef<string>("");

  useEffect(() => {
    function handleResize() {
      setStageScale(computeStageScale());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!state) {
      return;
    }
    if (lastSessionIdRef.current !== state.sessionId) {
      lastSessionIdRef.current = state.sessionId;
      spokenIdsRef.current = new Set(state.call.transcript.map((entry) => entry.id));
      setPhonePersona("victim");
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    for (const entry of state.call.transcript) {
      if (spokenIdsRef.current.has(entry.id)) {
        continue;
      }
      spokenIdsRef.current.add(entry.id);
      if (callerVoice && entry.speaker === "caller" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(entry.text);
        utterance.rate = 1.02;
        utterance.lang = /[А-Яа-яЁё]/.test(entry.text) ? "ru-RU" : "en-US";
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [callerVoice, state]);

  const handleToggleCallerVoice = useCallback((enabled: boolean) => {
    setCallerVoice(enabled);
    if (!enabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handleEndCall = useCallback(async () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    await endCall();
  }, [endCall]);

  const handleReset = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPhonePersona("victim");
    setRevealedSessionId(null);
    setBlockedSessionId(null);
    void resetDemo();
  }, [resetDemo]);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setPhonePersona("victim");
      setRevealedSessionId(null);
      setBlockedSessionId(null);
      void selectPreset(presetId);
    },
    [selectPreset],
  );

  const handleToggleGuardianView = useCallback(() => {
    setPhonePersona((prev) => (prev === "guardian" ? "victim" : "guardian"));
  }, []);

  const handleInjectTranscript = useCallback(
    async (speaker: TranscriptSpeaker, text: string) => {
      await injectTranscript(speaker, text, useLiveAi);
    },
    [injectTranscript, useLiveAi],
  );

  const handlePlayCue = useCallback(
    async (chunk: ScriptedTranscriptChunk) => {
      if (state && preset && preset.scriptedChunks[state.scriptedChunkIndex]?.id === chunk.id) {
        await playNextChunk(useLiveAi);
        return;
      }
      await injectTranscript(chunk.speaker, chunk.text, useLiveAi, {
        enableScreenShare: chunk.autoEnableScreenShare,
      });
    },
    [injectTranscript, playNextChunk, preset, state, useLiveAi],
  );

  if (!state || !preset) {
    const fallbackCopy = getUiCopy("en");
    return (
      <div
        className={`flex h-full w-full items-center justify-center ${
          isMobileRoute
            ? "dark bg-black text-[var(--foreground)]"
            : "bg-[var(--background)] text-[var(--foreground)]"
        }`}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--primary)]" />
        <span className="text-xs font-semibold">{fallbackCopy.connectingLabel}</span>
      </div>
    );
  }

  const isRevealed = revealedSessionId === state.sessionId;
  const isCallerBlocked = blockedSessionId === state.sessionId;

  if (isMobileRoute) {
    return (
      <div className="dark flex h-[100dvh] w-full justify-center overflow-hidden bg-black">
        <div className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-black text-[var(--foreground)]">
          <MobileWallet
            key={state.sessionId}
            state={state}
            preset={preset}
            isBusy={isBusy}
            startUnlocked
            onEndCall={handleEndCall}
            onUpdateSignals={updateSignals}
            onSubmitTransfer={submitTransfer}
            onSendSupport={sendSupportMessage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <PresenterBar
        state={state}
        preset={preset}
        presets={presets}
        isConnected={isConnected}
        isBusy={isBusy}
        useLiveAi={useLiveAi}
        callerVoice={callerVoice}
        phonePersona={phonePersona}
        onSelectPreset={handleSelectPreset}
        onStartCall={() => void startCall()}
        onEndCall={() => void handleEndCall()}
        onReset={handleReset}
        onToggleLiveAi={setUseLiveAi}
        onToggleCallerVoice={handleToggleCallerVoice}
        onChangePhonePersona={setPhonePersona}
        onSwitchLocale={(locale) => void switchLocale(locale)}
      />

      <main className="flex h-[calc(100%-56px)] w-full items-center justify-center overflow-hidden">
        <div
          className="flex h-[780px] w-[1040px] flex-none origin-center gap-[60px]"
          style={{ transform: `scale(${stageScale})` }}
        >
          <MiragePanel
            state={state}
            preset={preset}
            isBusy={isBusy}
            isAiPending={isAiPending}
            isRevealed={isRevealed}
            isCallerBlocked={isCallerBlocked}
            phonePersona={phonePersona}
            onStartCall={startCall}
            onEndCall={handleEndCall}
            onUpdateSignals={updateSignals}
            onPlayNextChunk={() => playNextChunk(useLiveAi)}
            onPlayCue={handlePlayCue}
            onInjectTranscript={handleInjectTranscript}
            onToggleGuardianView={handleToggleGuardianView}
          />

          <PhoneFrame>
            <div
              className={phonePersona === "guardian" ? "hidden" : "flex min-h-0 flex-1 flex-col"}
            >
              <MobileWallet
                key={state.sessionId}
                state={state}
                preset={preset}
                isBusy={isBusy}
                startUnlocked
                onEndCall={handleEndCall}
                onUpdateSignals={updateSignals}
                onSubmitTransfer={submitTransfer}
                onSendSupport={sendSupportMessage}
                onRevealChange={(revealed) =>
                  setRevealedSessionId(revealed ? state.sessionId : null)
                }
                onCallerBlockedChange={(blocked) =>
                  setBlockedSessionId(blocked ? state.sessionId : null)
                }
              />
            </div>

            <div
              className={phonePersona === "guardian" ? "flex min-h-0 flex-1 flex-col" : "hidden"}
            >
              <WalletGuardian
                key={state.sessionId}
                state={state}
                preset={preset}
                onBackToVictim={() => setPhonePersona("victim")}
              />
            </div>
          </PhoneFrame>
        </div>
      </main>
    </div>
  );
}
