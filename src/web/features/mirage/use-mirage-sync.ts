import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type {
  AiAssessmentSource,
  DecoyReceipt,
  DetectionSignals,
  Locale,
  MirageSnapshot,
  MirageState,
  MuleArtifact,
  PresetSummary,
  ScenarioPreset,
  TranscriptSpeaker,
  TransferOutcome,
} from "../../../shared/mirage-types.ts";
import { trpcClient } from "../../lib/trpc-client.ts";

const RECONNECT_DELAY_MS = 1500;
const AI_PENDING_FALLBACK_TIMEOUT_MS = 6000;

type AiPendingBaseline = {
  sessionId: string;
  score: number;
  reasoning: string;
  source: AiAssessmentSource;
};

export type TransferActionResponse = MirageSnapshot & {
  outcome: TransferOutcome;
  errorMessage?: string;
  receipt?: DecoyReceipt;
  capturedMule?: MuleArtifact;
};

export type UseMirageSyncResult = {
  state: MirageState | null;
  preset: ScenarioPreset | null;
  presets: PresetSummary[];
  isConnected: boolean;
  isBusy: boolean;
  isAiPending: boolean;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  updateSignals: (patch: Partial<DetectionSignals>) => Promise<void>;
  playNextChunk: (analyzeWithAi: boolean) => Promise<void>;
  injectTranscript: (
    speaker: TranscriptSpeaker,
    text: string,
    analyzeWithAi: boolean,
    options?: { enableScreenShare?: boolean },
  ) => Promise<void>;
  submitTransfer: (input: {
    fromAccountId: string;
    recipientValue: string;
    recipientLabel?: string;
    amount: number;
  }) => Promise<TransferActionResponse | null>;
  sendSupportMessage: (text: string) => Promise<void>;
  switchLocale: (locale: Locale) => Promise<void>;
  resetDemo: (presetId?: string) => Promise<void>;
  selectPreset: (presetId: string) => Promise<void>;
};

const wsEnvelopeSchema = z.object({
  type: z.literal("state"),
  state: z.unknown(),
  preset: z.unknown(),
});

function parseWsSnapshot(raw: string): MirageSnapshot | null {
  try {
    const json: unknown = JSON.parse(raw);
    const parsed = wsEnvelopeSchema.safeParse(json);
    if (!parsed.success) {
      return null;
    }
    if (
      typeof parsed.data.state !== "object" ||
      parsed.data.state === null ||
      typeof parsed.data.preset !== "object" ||
      parsed.data.preset === null
    ) {
      return null;
    }
    return {
      state: parsed.data.state as MirageState,
      preset: parsed.data.preset as ScenarioPreset,
    };
  } catch {
    return null;
  }
}

export function useMirageSync(): UseMirageSyncResult {
  const [snapshot, setSnapshot] = useState<MirageSnapshot | null>(null);
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isAiPending, setIsAiPending] = useState(false);

  const reconnectTimerRef = useRef<number | null>(null);
  const aiPendingTimerRef = useRef<number | null>(null);
  const aiBaselineRef = useRef<AiPendingBaseline | null>(null);

  const clearAiPending = useCallback(() => {
    aiBaselineRef.current = null;
    if (aiPendingTimerRef.current !== null) {
      window.clearTimeout(aiPendingTimerRef.current);
      aiPendingTimerRef.current = null;
    }
    setIsAiPending(false);
  }, []);

  const markAiPending = useCallback(
    (nextState: MirageState) => {
      aiBaselineRef.current = {
        sessionId: nextState.sessionId,
        score: nextState.call.detection.ai.score,
        reasoning: nextState.call.detection.ai.reasoning,
        source: nextState.call.detection.ai.source,
      };
      setIsAiPending(true);
      if (aiPendingTimerRef.current !== null) {
        window.clearTimeout(aiPendingTimerRef.current);
      }
      aiPendingTimerRef.current = window.setTimeout(() => {
        clearAiPending();
      }, AI_PENDING_FALLBACK_TIMEOUT_MS);
    },
    [clearAiPending],
  );

  const applySnapshot = useCallback(
    (next: MirageSnapshot) => {
      setSnapshot(next);

      const baseline = aiBaselineRef.current;
      if (baseline) {
        const ai = next.state.call.detection.ai;
        const settled =
          next.state.sessionId !== baseline.sessionId ||
          ai.score !== baseline.score ||
          ai.reasoning !== baseline.reasoning ||
          (baseline.source === "standby" && ai.source !== "standby");
        if (settled) {
          clearAiPending();
        }
      }
    },
    [clearAiPending],
  );

  useEffect(() => {
    let isActive = true;

    trpcClient.mirage.snapshot
      .query()
      .then((initial) => {
        if (isActive) {
          applySnapshot(initial);
        }
      })
      .catch(() => {
        // WebSocket reconnect handles transient startup race
      });

    trpcClient.mirage.presets
      .query()
      .then((list) => {
        if (isActive) {
          setPresets(list);
        }
      })
      .catch(() => {
        // Fallback: active preset summary still derives from snapshot
      });

    let socket: WebSocket | null = null;

    function connect() {
      if (!isActive) {
        return;
      }
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socket.addEventListener("open", () => {
        if (isActive) {
          setIsConnected(true);
        }
      });

      socket.addEventListener("message", (event) => {
        if (!isActive || typeof event.data !== "string") {
          return;
        }
        const parsed = parseWsSnapshot(event.data);
        if (parsed) {
          applySnapshot(parsed);
        }
      });

      socket.addEventListener("close", () => {
        if (!isActive) {
          return;
        }
        setIsConnected(false);
        reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS);
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    }

    connect();

    return () => {
      isActive = false;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (aiPendingTimerRef.current !== null) {
        window.clearTimeout(aiPendingTimerRef.current);
      }
      socket?.close();
    };
  }, [applySnapshot]);

  const runMutation = useCallback(
    async <T extends MirageSnapshot>(fn: () => Promise<T>): Promise<T | null> => {
      setPendingCount((count) => count + 1);
      try {
        const result = await fn();
        applySnapshot({ state: result.state, preset: result.preset });
        return result;
      } catch {
        return null;
      } finally {
        setPendingCount((count) => Math.max(0, count - 1));
      }
    },
    [applySnapshot],
  );

  const startCall = useCallback(async () => {
    await runMutation(() => trpcClient.mirage.startCall.mutate(undefined));
  }, [runMutation]);

  const endCall = useCallback(async () => {
    await runMutation(() => trpcClient.mirage.endCall.mutate());
  }, [runMutation]);

  const updateSignals = useCallback(
    async (patch: Partial<DetectionSignals>) => {
      await runMutation(() => trpcClient.mirage.updateSignals.mutate(patch));
    },
    [runMutation],
  );

  const playNextChunk = useCallback(
    async (analyzeWithAi: boolean) => {
      const result = await runMutation(() => trpcClient.mirage.nextChunk.mutate({ analyzeWithAi }));
      if (result?.aiPending) {
        markAiPending(result.state);
      }
    },
    [markAiPending, runMutation],
  );

  const injectTranscript = useCallback(
    async (
      speaker: TranscriptSpeaker,
      text: string,
      analyzeWithAi: boolean,
      options?: { enableScreenShare?: boolean },
    ) => {
      const result = await runMutation(() =>
        trpcClient.mirage.ingestTranscript.mutate({
          speaker,
          text,
          analyzeWithAi,
          enableScreenShare: options?.enableScreenShare,
        }),
      );
      if (result?.aiPending) {
        markAiPending(result.state);
      }
    },
    [markAiPending, runMutation],
  );

  const submitTransfer = useCallback(
    async (input: {
      fromAccountId: string;
      recipientValue: string;
      recipientLabel?: string;
      amount: number;
    }) => runMutation(() => trpcClient.mirage.submitTransfer.mutate(input)),
    [runMutation],
  );

  const sendSupportMessage = useCallback(
    async (text: string) => {
      await runMutation(() => trpcClient.mirage.sendSupport.mutate({ text }));
    },
    [runMutation],
  );

  const switchLocale = useCallback(
    async (locale: Locale) => {
      await runMutation(() => trpcClient.mirage.setLocale.mutate({ locale }));
    },
    [runMutation],
  );

  const resetDemo = useCallback(
    async (presetId?: string) => {
      clearAiPending();
      await runMutation(() => trpcClient.mirage.reset.mutate(presetId ? { presetId } : undefined));
    },
    [clearAiPending, runMutation],
  );

  const selectPreset = useCallback(
    async (presetId: string) => {
      await resetDemo(presetId);
    },
    [resetDemo],
  );

  return {
    state: snapshot?.state ?? null,
    preset: snapshot?.preset ?? null,
    presets,
    isConnected,
    isBusy: pendingCount > 0,
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
  };
}
