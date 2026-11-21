import { useCallback, useEffect, useRef, useState } from "react";
import { UAE_DU_KYC_PRESET, createInitialState } from "../../core/mirage/index.ts";
import type {
  DecoyReceipt,
  Locale,
  MirageState,
  MuleArtifact,
  ScenarioPreset,
  TranscriptSpeaker,
  TransferOutcome,
} from "../../core/mirage/types.ts";

interface StateSnapshotResponse {
  type?: string;
  state: MirageState;
  preset: ScenarioPreset;
}

export interface TransferActionResponse {
  outcome: TransferOutcome;
  errorMessage?: string;
  receipt?: DecoyReceipt;
  capturedMule?: MuleArtifact;
  state: MirageState;
  preset: ScenarioPreset;
}

export interface UseMirageSyncResult {
  state: MirageState;
  preset: ScenarioPreset;
  connected: boolean;
  busy: boolean;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
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
}

function isSnapshot(value: unknown): value is StateSnapshotResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return "state" in value && "preset" in value;
}

export function useMirageSync(): UseMirageSyncResult {
  const [state, setState] = useState<MirageState>(() => createInitialState(UAE_DU_KYC_PRESET));
  const [preset, setPreset] = useState<ScenarioPreset>(UAE_DU_KYC_PRESET);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const reconnectTimerRef = useRef<number | null>(null);

  const applySnapshot = useCallback((snapshot: StateSnapshotResponse) => {
    setState(snapshot.state);
    setPreset(snapshot.preset);
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const res = await fetch("/api/state");
        if (!res.ok) {
          return;
        }
        const data: unknown = await res.json();
        if (active && isSnapshot(data)) {
          applySnapshot(data);
        }
      } catch {
        // WS reconnect will keep syncing when server becomes reachable
      }
    }

    void hydrate();

    let socket: WebSocket | null = null;

    function connect() {
      if (!active) {
        return;
      }
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      socket = new WebSocket(wsUrl);

      socket.addEventListener("open", () => {
        if (active) {
          setConnected(true);
        }
      });

      socket.addEventListener("message", (event) => {
        if (!active || typeof event.data !== "string") {
          return;
        }
        try {
          const parsed: unknown = JSON.parse(event.data);
          if (isSnapshot(parsed)) {
            applySnapshot(parsed);
          }
        } catch {
          // Ignore non-JSON frames
        }
      });

      socket.addEventListener("close", () => {
        if (!active) {
          return;
        }
        setConnected(false);
        reconnectTimerRef.current = window.setTimeout(connect, 1500);
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      socket?.close();
    };
  }, [applySnapshot]);

  const postAction = useCallback(
    async <T extends StateSnapshotResponse>(path: string, body?: unknown): Promise<T | null> => {
      setBusy(true);
      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!res.ok) {
          return null;
        }
        const data: unknown = await res.json();
        if (isSnapshot(data)) {
          applySnapshot(data);
          return data as T;
        }
        return null;
      } catch {
        return null;
      } finally {
        setBusy(false);
      }
    },
    [applySnapshot],
  );

  const startCall = useCallback(async () => {
    await postAction("/api/call/start");
  }, [postAction]);

  const endCall = useCallback(async () => {
    await postAction("/api/call/end");
  }, [postAction]);

  const playNextChunk = useCallback(
    async (analyzeWithAi: boolean) => {
      await postAction("/api/call/next-chunk", { analyzeWithAi });
    },
    [postAction],
  );

  const injectTranscript = useCallback(
    async (speaker: TranscriptSpeaker, text: string, analyzeWithAi: boolean) => {
      await postAction("/api/call/transcript", { speaker, text, analyzeWithAi });
    },
    [postAction],
  );

  const submitTransfer = useCallback(
    async (input: {
      fromAccountId: string;
      recipientValue: string;
      recipientLabel?: string;
      amount: number;
    }) => postAction<TransferActionResponse>("/api/transfer", input),
    [postAction],
  );

  const sendSupportMessage = useCallback(
    async (text: string) => {
      await postAction("/api/support", { text });
    },
    [postAction],
  );

  const switchLocale = useCallback(
    async (locale: Locale) => {
      await postAction("/api/locale", { locale });
    },
    [postAction],
  );

  const resetDemo = useCallback(async () => {
    await postAction("/api/reset");
  }, [postAction]);

  return {
    state,
    preset,
    connected,
    busy,
    startCall,
    endCall,
    playNextChunk,
    injectTranscript,
    submitTransfer,
    sendSupportMessage,
    switchLocale,
    resetDemo,
  };
}
