import type { MirageSnapshot, MirageState } from "../shared/mirage-types.ts";

export type PendingAiWaitResult = {
  waitedMs: number;
  timedOut: boolean;
  hadPending: boolean;
};

export type MirageStore = {
  getState: () => MirageState;
  setState: (next: MirageState) => MirageSnapshot;
  getSnapshot: () => MirageSnapshot;
  trackAiTask: (sessionId: string, task: Promise<void>) => void;
  waitForPendingAi: (sessionId: string, timeoutMs: number) => Promise<PendingAiWaitResult>;
};

export type Context = {
  store: MirageStore;
};
