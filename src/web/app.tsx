import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptSpeaker } from "../shared/mirage-types.ts";
import { MiragePanel } from "./features/mirage/mirage-panel.tsx";
import { MobileWallet } from "./features/mirage/mobile-wallet.tsx";
import { PhoneFrame } from "./features/mirage/phone-frame.tsx";
import { PresenterBar } from "./features/mirage/presenter-bar.tsx";
import { useMirageSync } from "./features/mirage/use-mirage-sync.ts";
import { getUiCopy } from "./lib/ui-copy.ts";

const INTRO_CHUNK_DELAY_MS = 1400;

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

  const [stageScale, setStageScale] = useState<number>(() => computeStageScale());
  const [useLiveAi, setUseLiveAi] = useState(true);
  const [callerVoice, setCallerVoice] = useState(false);
  const [isStartingDemo, setIsStartingDemo] = useState(false);
  const [revealedSessionId, setRevealedSessionId] = useState<string | null>(null);
  const [blockedSessionId, setBlockedSessionId] = useState<string | null>(null);

  const introTimerRef = useRef<number | null>(null);
  const demoRunIdRef = useRef(0);
  const spokenIdsRef = useRef<Set<string>>(new Set());
  const lastSessionIdRef = useRef<string>("");

  const cancelIntroSequence = useCallback(() => {
    demoRunIdRef.current += 1;
    if (introTimerRef.current !== null) {
      window.clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
    setIsStartingDemo(false);
  }, []);

  useEffect(() => {
    function handleResize() {
      setStageScale(computeStageScale());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (introTimerRef.current !== null) {
        window.clearTimeout(introTimerRef.current);
      }
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

  const handleStartDemo = useCallback(() => {
    if (isStartingDemo) {
      return;
    }
    cancelIntroSequence();
    const runId = demoRunIdRef.current;
    setIsStartingDemo(true);

    void (async () => {
      try {
        await startCall();
        if (demoRunIdRef.current !== runId) {
          return;
        }
        await playNextChunk(useLiveAi);
        if (demoRunIdRef.current !== runId) {
          return;
        }

        introTimerRef.current = window.setTimeout(() => {
          introTimerRef.current = null;
          if (demoRunIdRef.current !== runId) {
            return;
          }
          void playNextChunk(useLiveAi).finally(() => {
            if (demoRunIdRef.current === runId) {
              setIsStartingDemo(false);
            }
          });
        }, INTRO_CHUNK_DELAY_MS);
      } catch {
        if (demoRunIdRef.current === runId) {
          setIsStartingDemo(false);
        }
      }
    })();
  }, [cancelIntroSequence, isStartingDemo, playNextChunk, startCall, useLiveAi]);

  const handleEndCall = useCallback(async () => {
    cancelIntroSequence();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    await endCall();
  }, [cancelIntroSequence, endCall]);

  const handleReset = useCallback(() => {
    cancelIntroSequence();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setRevealedSessionId(null);
    setBlockedSessionId(null);
    void resetDemo();
  }, [cancelIntroSequence, resetDemo]);

  const handleInjectTranscript = useCallback(
    async (speaker: TranscriptSpeaker, text: string) => {
      await injectTranscript(speaker, text, useLiveAi);
    },
    [injectTranscript, useLiveAi],
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

  const isScreenSharing = state.call.detection.signals.screenSharing;
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
        isConnected={isConnected}
        isBusy={isBusy}
        isStartingDemo={isStartingDemo}
        useLiveAi={useLiveAi}
        callerVoice={callerVoice}
        onStartDemo={handleStartDemo}
        onPlayNextChunk={() => void playNextChunk(useLiveAi)}
        onEndCall={() => void handleEndCall()}
        onToggleSharing={() => void updateSignals({ screenSharing: !isScreenSharing })}
        onReset={handleReset}
        onToggleLiveAi={setUseLiveAi}
        onToggleCallerVoice={handleToggleCallerVoice}
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
            isRevealed={isRevealed}
            isCallerBlocked={isCallerBlocked}
            onInjectTranscript={handleInjectTranscript}
          />

          <PhoneFrame>
            <MobileWallet
              key={state.sessionId}
              state={state}
              preset={preset}
              isBusy={isBusy}
              onEndCall={handleEndCall}
              onUpdateSignals={updateSignals}
              onSubmitTransfer={submitTransfer}
              onSendSupport={sendSupportMessage}
              onRevealChange={(revealed) => setRevealedSessionId(revealed ? state.sessionId : null)}
              onCallerBlockedChange={(blocked) =>
                setBlockedSessionId(blocked ? state.sessionId : null)
              }
            />
          </PhoneFrame>
        </div>
      </main>
    </div>
  );
}
