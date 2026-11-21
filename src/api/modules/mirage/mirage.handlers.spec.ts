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
  };
}

describe("Pre-Transfer Gate — awaiting in-flight AI before debiting real funds", () => {
  test("holds transfer until background AI finishes and diverts it into Mirage honeytrap", async () => {
    const store = createTestStore();
    const createCaller = createCallerFactory(appRouter);
    const caller = createCaller({ store });

    await caller.mirage.startCall();
    const sessionId = store.getState().sessionId;

    // Simulate a slow background AI task (~120ms) catching a subtle euphemism scam
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

    // Victim taps Confirm immediately (before 120ms AI finishes), for a small amount (below 45% drain ratio)
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
});
