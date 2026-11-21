import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type {
  DecoyReceipt,
  DetectionSignals,
  Locale,
  MirageSnapshot,
  MirageState,
  MuleArtifact,
  ScenarioPreset,
  TranscriptSpeaker,
  TransferOutcome,
} from "../../../shared/mirage-types.ts";
import { trpcClient } from "../../lib/trpc-client.ts";

const RECONNECT_DELAY_MS = 1500;

export type TransferActionResponse = MirageSnapshot & {
  outcome: TransferOutcome;
  errorMessage?: string;
  receipt?: DecoyReceipt;
  capturedMule?: MuleArtifact;
};

export type UseMirageSyncResult = {
  state: MirageState | null;
  preset: ScenarioPreset | null;
  isConnected: boolean;
  isBusy: boolean;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  updateSignals: (patch: Partial<DetectionSignals>) => Promise<void>;
  playNextChunk: (analyzeWithAi: boolean) => Promise<void>;
  injectTranscript: (
    speaker: TranscriptSpeaker,
    text: string,
    analyzeWithAi: boolean,
  ) => Promise<void>;
  submitTransfer: (input: {
    fromAccountId: string;
    recipientValue: string;
    recipientLabel?: string;
    amount: number;
  }) => Promise<TransferActionResponse | null>;
  sendSupportMessage: (text: string) => Promise<void>;
  switchLocale: (locale: Locale) => Promise<void>;
  resetDemo: () => Promise<void>;
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
    // WebSocket broadcasts serialize MirageSnapshot produced directly by server store
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
  const [isConnected, setIsConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const reconnectTimerRef = useRef<number | null>(null);

  const applySnapshot = useCallback((next: MirageSnapshot) => {
    setSnapshot(next);
  }, []);

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
      await runMutation(() => trpcClient.mirage.nextChunk.mutate({ analyzeWithAi }));
    },
    [runMutation],
  );

  const injectTranscript = useCallback(
    async (speaker: TranscriptSpeaker, text: string, analyzeWithAi: boolean) => {
      await runMutation(() =>
        trpcClient.mirage.ingestTranscript.mutate({ speaker, text, analyzeWithAi }),
      );
    },
    [runMutation],
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

  const resetDemo = useCallback(async () => {
    await runMutation(() => trpcClient.mirage.reset.mutate());
  }, [runMutation]);

  return {
    state: snapshot?.state ?? null,
    preset: snapshot?.preset ?? null,
    isConnected,
    isBusy: pendingCount > 0,
    startCall,
    endCall,
    updateSignals,
    playNextChunk,
    injectTranscript,
    submitTransfer,
    sendSupportMessage,
    switchLocale,
    resetDemo,
  };
}
