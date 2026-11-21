import type { MirageSnapshot, MirageState } from "../shared/mirage-types.ts";

export type MirageStore = {
  getState: () => MirageState;
  setState: (next: MirageState) => MirageSnapshot;
  getSnapshot: () => MirageSnapshot;
};

export type Context = {
  store: MirageStore;
};
