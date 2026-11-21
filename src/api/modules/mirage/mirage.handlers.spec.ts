import { describe, expect, test } from "bun:test";
import type { MirageStore, PendingAiWaitResult } from "../../context.ts";
import { appRouter } from "../../router.ts";
import { createCallerFactory } from "../../trpc.ts";
import { applyAiDetection, createInitialState } from "./mirage.core.ts";
import { BANK_REFUND_TRAP_PRESET, getPresetById } from "./mirage.presets.ts";
import type { MirageSnapshot, MirageState } from "./mirage.types.ts";

function createTestStore(): MirageStore {
  let current: MirageState = createInitialState(BANK_REFUND_TRAP_PRESET, "en");
  const pendingBySession = new Map<string, Set<Promise<void>>>();
  let lockTail: Promise<void> = Promise.resolve();

  function buildSnapshot(): MirageSnapshot {
    return {
      state: current,
      preset: getPresetById(current.presetId),
    };
  }

  return {
    getState: () => current,
    getSnapshot: buildSnapshot,
    setState(next: MirageState): MirageSnapshot {
      current = next;
      return buildSnapshot();
    },
    trackAiTask(sessionId: string, task: Promise<void>): void {
      let bucket = pendingBySession.get(sessionId);
      if (!bucket) {
        bucket = new Set();
        pendingBySession.set(sessionId, bucket);
      }
      bucket.add(task);
      void task.finally(() => {
        pendingBySession.get(sessionId)?.delete(task);
      });
    },
    async waitForPendingAi(sessionId: string, timeoutMs: number): Promise<PendingAiWaitResult> {
      const bucket = pendingBySession.get(sessionId);
      if (!bucket || bucket.size === 0) {
        return { waitedMs: 0, timedOut: false, hadPending: false };
      }
      const startedAt = performance.now();
      const timedOut = await Promise.race([
        Promise.allSettled(bucket).then(() => false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(true), timeoutMs)),
      ]);
      return {
        waitedMs: Math.round(performance.now() - startedAt),
        timedOut,
        hadPending: true,
      };
    },
    async runTransferExclusive<T>(fn: () => Promise<T>): Promise<T> {
      const prev = lockTail;
      let release: () => void = () => {};
      lockTail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await prev;
      try {
        return await fn();
      } finally {
        release();
      }
    },
  };
}

describe("Pre-Transfer Gate, Post-Call Cooldown & Double-Tap Idempotency", () => {
  test("holds transfer until background AI finishes and diverts it into Mirage honeytrap", async () => {
    const store = createTestStore();
    const caller = createCallerFactory(appRouter)({ store });

    await caller.mirage.startCall();
    const sessionId = store.getState().sessionId;

    const delayedAi = new Promise<void>((resolve) => {
      setTimeout(() => {
        const latest = store.getState();
        if (latest.sessionId === sessionId) {
          store.setState(
            applyAiDetection(latest, {
              aiScore: 91,
              tactics: ["safe_account_lure", "isolation"],
              reasoning: "Subtle coercion detected by AI.",
              source: "ai",
            }),
          );
        }
        resolve();
      }, 120);
    });

    store.trackAiTask(sessionId, delayedAi);

    const result = await caller.mirage.submitTransfer({
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 3000,
    });

    expect(result.preTransferGate.hadPending).toBe(true);
    expect(result.preTransferGate.timedOut).toBe(false);
    expect(result.preTransferGate.waitedMs).toBeGreaterThanOrEqual(80);
    expect(result.outcome).toBe("rejected_honeytrap");
    expect(result.state.mode).toBe("mirage");
    expect(result.state.realAccounts[0]?.balance).toBe(24500);
  });

  test("defeats hangup bypass: Pre-Transfer Gate still waits for in-flight AI after endCall", async () => {
    const store = createTestStore();
    const caller = createCallerFactory(appRouter)({ store });

    await caller.mirage.startCall();
    const sessionId = store.getState().sessionId;

    const delayedAi = new Promise<void>((resolve) => {
      setTimeout(() => {
        const latest = store.getState();
        if (latest.sessionId === sessionId) {
          store.setState(
            applyAiDetection(latest, {
              aiScore: 95,
              tactics: ["isolation", "safe_account_lure"],
              reasoning: "Caller hung up right before transfer.",
              source: "ai",
            }),
          );
        }
        resolve();
      }, 90);
    });
    store.trackAiTask(sessionId, delayedAi);

    await caller.mirage.endCall();

    const result = await caller.mirage.submitTransfer({
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 14500,
    });

    expect(result.preTransferGate.hadPending).toBe(true);
    expect(result.outcome).toBe("rejected_honeytrap");
    expect(result.state.mode).toBe("mirage");
    expect(result.state.realAccounts[0]?.balance).toBe(24500);
  });

  test("prevents concurrent double-tap double debit during Pre-Transfer Gate", async () => {
    const store = createTestStore();
    const caller = createCallerFactory(appRouter)({ store });

    await caller.mirage.startCall({ simAgeDays: 1000 });
    await caller.mirage.updateSignals({ unverifiedCaller: false });
    const sessionId = store.getState().sessionId;

    const benignAi = new Promise<void>((resolve) => {
      setTimeout(() => {
        const latest = store.getState();
        if (latest.sessionId === sessionId) {
          store.setState(
            applyAiDetection(latest, {
              aiScore: 10,
              tactics: [],
              reasoning: "Routine benign call.",
              source: "ai",
            }),
          );
        }
        resolve();
      }, 80);
    });
    store.trackAiTask(sessionId, benignAi);

    const [tA, tB] = await Promise.all([
      caller.mirage.submitTransfer({
        fromAccountId: "acc-checking",
        recipientValue: "AE990000000000000000111",
        amount: 500,
      }),
      caller.mirage.submitTransfer({
        fromAccountId: "acc-checking",
        recipientValue: "AE990000000000000000111",
        amount: 500,
      }),
    ]);

    expect(tA.outcome).toBe("completed");
    expect(tB.outcome).toBe("completed");
    expect(tA.deduplicated || tB.deduplicated).toBe(true);
    expect(store.getState().realAccounts[0]?.balance).toBe(24000);
  });
});
