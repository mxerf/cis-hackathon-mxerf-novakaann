import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../src/api/router.ts";
import { startServer } from "../src/api/server.ts";
import type { MirageState } from "../src/shared/mirage-types.ts";

type WsTraceEvent = {
  atMs: number;
  mode: MirageState["mode"];
  algo: number;
  ai: number;
  aiSource: string;
  combined: number;
  transcriptLen: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openWsTrace(port: number) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const events: WsTraceEvent[] = [];
  let originMs = performance.now();

  await new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", () => reject(new Error("WS failed")), { once: true });
  });

  ws.addEventListener("message", (ev) => {
    try {
      const parsed = JSON.parse(String(ev.data)) as { type?: string; state?: MirageState };
      if (parsed.type === "state" && parsed.state) {
        const d = parsed.state.call.detection;
        events.push({
          atMs: Math.round(performance.now() - originMs),
          mode: parsed.state.mode,
          algo: d.algorithm.score,
          ai: d.ai.score,
          aiSource: d.ai.source,
          combined: d.combinedScore,
          transcriptLen: parsed.state.call.transcript.length,
        });
      }
    } catch {
      // ignore non-state messages
    }
  });

  return {
    resetClock() {
      originMs = performance.now();
      events.length = 0;
    },
    events,
    close() {
      ws.close();
    },
  };
}

const server = startServer(0);
const serverPort = server.port ?? 3001;
const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `http://127.0.0.1:${serverPort}/trpc` })],
});
const trace = await openWsTrace(serverPort);

const summary: Record<string, unknown> = {};

try {
  // === SCENARIO A: Fast ASR streaming chunks + victim taps Confirm 300ms after IBAN dictation ===
  {
    await client.mirage.reset.mutate();
    await sleep(50);
    trace.resetClock();

    const chunks = [
      { delayMs: 0, text: "Hello, this is Officer Omar from Bank Fraud Prevention Desk." },
      { delayMs: 900, text: "We see a pending charge of 14,500 AED — did you authorize it?" },
      { delayMs: 900, enableScreen: true, text: "Great, I see your screen now. Do not hang up." },
      { delayMs: 900, text: "To cancel the debit, open Transfer and send a mirror reversal" },
      {
        delayMs: 900,
        isCritical: true,
        text: "of 14,500 AED to transit IBAN AE070331234567890123456 right now.",
      },
    ];

    let criticalSentAt = 0;
    let algoReplyMs = 0;
    let algoModeOnCritical: string = "normal";

    for (const chunk of chunks) {
      if (chunk.delayMs > 0) {
        await sleep(chunk.delayMs);
      }
      if (chunk.enableScreen) {
        await client.mirage.updateSignals.mutate({ screenSharing: true });
      }
      const t0 = performance.now();
      if (chunk.isCritical) {
        criticalSentAt = t0;
      }
      const res = await client.mirage.ingestTranscript.mutate({
        speaker: "caller",
        text: chunk.text,
        analyzeWithAi: true,
        waitForAi: false,
      });
      if (chunk.isCritical) {
        algoReplyMs = Math.round(performance.now() - t0);
        algoModeOnCritical = res.state.mode;
      }
    }

    // Victim taps Confirm just 300ms after final words!
    await sleep(300);
    const txStartedAt = performance.now();
    const tx1 = await client.mirage.submitTransfer.mutate({
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 14500,
    });
    const txDurationMs = Math.round(performance.now() - txStartedAt);

    // Wait briefly so background AI WS event arrives if still running
    await sleep(2500);
    const firstMirageEvent = trace.events.find((e) => e.mode === "mirage");
    const firstLiveAiEvent = trace.events.find((e) => e.aiSource === "ai" && e.ai >= 75);

    summary.scenarioA_streaming_classic = {
      algoReplyOnCriticalChunkMs: algoReplyMs,
      modeImmediatelyAfterCriticalChunk: algoModeOnCritical,
      firstMirageAtMsFromCallStart: firstMirageEvent?.atMs ?? null,
      firstHighAiAtMsFromCallStart: firstLiveAiEvent?.atMs ?? null,
      victimTapAfterCriticalMs: Math.round(txStartedAt - criticalSentAt),
      txDurationMs,
      preTransferGate: tx1.preTransferGate,
      tx1Outcome: tx1.outcome,
      realBalanceProtected: tx1.state.realAccounts[0]?.balance === 24500,
      realBalance: tx1.state.realAccounts[0]?.balance,
    };
  }

  // === SCENARIO B: Subtle euphemism scammer (NO keywords, NO screen share, small 3,500 AED transfer) ===
  // Algorithm alone stays below 65 -> Pre-Transfer Gate MUST hold transfer for in-flight AI!
  {
    await client.mirage.reset.mutate();
    await sleep(50);
    trace.resetClock();

    await client.mirage.startCall.mutate({
      callerNumber: "+971 52 771 0041",
      callerLabel: "Unknown Caller",
      simAgeDays: 90,
    });

    const t0 = performance.now();
    const ingestRes = await client.mirage.ingestTranscript.mutate({
      speaker: "caller",
      text: "Listen carefully and do not mention this call to your wife or bank staff. Your profile is flagged for an internal audit — quickly copy the code AE070331234567890123456 I texted you, type 3500, and press the blue submit button while keeping the phone by your ear so I verify your loyalty score.",
      analyzeWithAi: true,
      waitForAi: false,
    });
    const phase1Ms = Math.round(performance.now() - t0);

    // Victim taps Confirm only 400ms later while AI is still thinking!
    await sleep(400);
    const txStart = performance.now();
    const tx1 = await client.mirage.submitTransfer.mutate({
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 3500,
    });
    const txTotalMs = Math.round(performance.now() - txStart);

    summary.scenarioB_euphemism_pretransfer_gate = {
      phase1AlgoMs: phase1Ms,
      phase1AlgoScore: ingestRes.state.call.detection.algorithm.score,
      phase1Mode: ingestRes.state.mode,
      preTransferGate: tx1.preTransferGate,
      txTotalMs,
      finalAiScore: tx1.state.call.detection.ai.score,
      finalAiSource: tx1.state.call.detection.ai.source,
      finalMode: tx1.state.mode,
      tx1Outcome: tx1.outcome,
      realBalanceProtected: tx1.state.realAccounts[0]?.balance === 24500,
      realBalance: tx1.state.realAccounts[0]?.balance,
    };
  }

  // === SCENARIO C: Benign bank call + normal 500 AED transfer (NO false positive!) ===
  {
    await client.mirage.reset.mutate();
    await sleep(50);
    trace.resetClock();

    await client.mirage.startCall.mutate({
      callerNumber: "+971 4 800 78573",
      callerLabel: "Pulse Bank Verified Line",
      simAgeDays: 1200,
    });
    await client.mirage.updateSignals.mutate({ unverifiedCaller: false, screenSharing: false });

    await client.mirage.ingestTranscript.mutate({
      speaker: "caller",
      text: "Hi! Just confirming your travel dates to Italy next week so your debit card works smoothly. No codes or payments needed at all.",
      analyzeWithAi: true,
      waitForAi: false,
    });

    await sleep(400);
    const txStart = performance.now();
    const tx = await client.mirage.submitTransfer.mutate({
      fromAccountId: "acc-checking",
      recipientValue: "AE990000000000000000111",
      amount: 500,
    });
    const txTotalMs = Math.round(performance.now() - txStart);

    summary.scenarioC_benign_control = {
      preTransferGate: tx.preTransferGate,
      txTotalMs,
      finalAlgoScore: tx.state.call.detection.algorithm.score,
      finalAiScore: tx.state.call.detection.ai.score,
      finalMode: tx.state.mode,
      txOutcome: tx.outcome,
      realBalance: tx.state.realAccounts[0]?.balance,
    };
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} finally {
  trace.close();
  server.stop(true);
}
