import type { Server, ServerWebSocket } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import {
  UAE_DU_KYC_PRESET,
  advanceScriptedChunk,
  appendSupportMessage,
  createInitialState,
  endCall,
  getPresetById,
  ingestTranscriptChunk,
  resetState,
  setLocale,
  startCall,
  submitTransfer,
} from "../core/mirage/index.ts";
import type { MirageState, ScenarioPreset } from "../core/mirage/types.ts";
import { analyzeCallChunk, replyAsCoverSupport } from "./ai.ts";
import { sendTelegramAlert } from "./telegram.ts";

interface WsClientData {
  clientId: string;
}

interface WsStateMessage {
  type: "state";
  state: MirageState;
  preset: ScenarioPreset;
}

const WS_TOPIC = "mirage-state";
const PORT = Number(process.env.PORT ?? 3001);

let currentState: MirageState = createInitialState(UAE_DU_KYC_PRESET, "en");
let connectedClients = 0;
let bunServer: Server<WsClientData> | null = null;

function buildSnapshotPayload(): WsStateMessage {
  return {
    type: "state",
    state: currentState,
    preset: getPresetById(currentState.presetId),
  };
}

function broadcastState(): void {
  if (!bunServer) {
    return;
  }
  bunServer.publish(WS_TOPIC, JSON.stringify(buildSnapshotPayload()));
}

const startCallBodySchema = z
  .object({
    callerNumber: z.string().min(1).max(40).optional(),
    callerLabel: z.string().min(1).max(120).optional(),
    simAgeDays: z.number().int().min(0).max(3650).optional(),
  })
  .optional();

const transcriptBodySchema = z.object({
  speaker: z.enum(["caller", "victim", "ai_decoy"]).default("caller"),
  text: z.string().min(1).max(1000),
  analyzeWithAi: z.boolean().optional().default(true),
  coercionScoreDelta: z.number().min(0).max(100).optional(),
  flaggedTactics: z.array(z.string().min(1)).optional(),
});

const nextChunkBodySchema = z
  .object({
    analyzeWithAi: z.boolean().optional().default(false),
  })
  .optional();

const transferBodySchema = z.object({
  fromAccountId: z.string().min(1),
  recipientValue: z.string().min(1).max(120),
  recipientLabel: z.string().max(120).optional(),
  amount: z.number().positive(),
});

const supportBodySchema = z.object({
  text: z.string().min(1).max(600),
});

const localeBodySchema = z.object({
  locale: z.enum(["en", "ru"]),
});

const analyzeBodySchema = z.object({
  text: z.string().min(1).max(1000),
});

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export const app = new Hono();

app.use("/api/*", cors());

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    mode: currentState.mode,
    honeytrapStage: currentState.honeytrapStage,
    clients: connectedClients,
  }),
);

app.get("/api/state", (c) => c.json(buildSnapshotPayload()));

app.post("/api/call/start", async (c) => {
  const raw = await parseJsonBody(c.req.raw);
  const parsed = startCallBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid call start payload" }, 400);
  }
  currentState = startCall(currentState, parsed.data);
  broadcastState();
  return c.json(buildSnapshotPayload());
});

app.post("/api/call/end", (c) => {
  currentState = endCall(currentState);
  broadcastState();
  return c.json(buildSnapshotPayload());
});

app.post("/api/call/transcript", async (c) => {
  const raw = await parseJsonBody(c.req.raw);
  const parsed = transcriptBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid transcript payload" }, 400);
  }

  const { speaker, text, analyzeWithAi } = parsed.data;
  let delta = parsed.data.coercionScoreDelta;
  let tactics = parsed.data.flaggedTactics;
  let analysisSummary: string | undefined;
  let analysisSource: "ai" | "fallback" | "manual" = "manual";

  if (delta === undefined || tactics === undefined) {
    if (speaker === "caller" && analyzeWithAi) {
      const analysis = await analyzeCallChunk(text);
      delta = delta ?? analysis.coercionScoreDelta;
      tactics = tactics ?? analysis.tactics;
      analysisSummary = analysis.summary;
      analysisSource = analysis.source;
    } else {
      delta = delta ?? 0;
      tactics = tactics ?? [];
    }
  }

  if (!currentState.call.active) {
    currentState = startCall(currentState);
  }

  currentState = ingestTranscriptChunk(currentState, {
    speaker,
    text,
    coercionScoreDelta: delta,
    flaggedTactics: tactics,
  });

  broadcastState();
  return c.json({
    ...buildSnapshotPayload(),
    analysis: {
      coercionScoreDelta: delta,
      tactics,
      summary: analysisSummary,
      source: analysisSource,
    },
  });
});

app.post("/api/call/next-chunk", async (c) => {
  const raw = await parseJsonBody(c.req.raw);
  const parsed = nextChunkBodySchema.safeParse(raw);
  const analyzeWithAi = parsed.success ? (parsed.data?.analyzeWithAi ?? false) : false;

  const preset = getPresetById(currentState.presetId);
  const upcomingChunk = preset.scriptedChunks[currentState.scriptedChunkIndex];
  if (!upcomingChunk) {
    return c.json({ ...buildSnapshotPayload(), exhausted: true });
  }

  let analysisOverride: { coercionScoreDelta: number; flaggedTactics: string[] } | undefined;
  if (analyzeWithAi && upcomingChunk.speaker === "caller") {
    const analysis = await analyzeCallChunk(upcomingChunk.text);
    // Keep scripted progression reliable even if AI scores slightly conservatively
    analysisOverride = {
      coercionScoreDelta: Math.max(upcomingChunk.coercionScoreDelta, analysis.coercionScoreDelta),
      flaggedTactics:
        analysis.tactics.length > 0 ? analysis.tactics : upcomingChunk.flaggedTactics,
    };
  }

  currentState = advanceScriptedChunk(
    currentState,
    preset,
    new Date().toISOString(),
    analysisOverride,
  );
  broadcastState();

  return c.json({
    ...buildSnapshotPayload(),
    exhausted: currentState.scriptedChunkIndex >= preset.scriptedChunks.length,
  });
});

app.post("/api/transfer", async (c) => {
  const raw = await parseJsonBody(c.req.raw);
  const parsed = transferBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid transfer payload" }, 400);
  }

  const wasAlertSent = currentState.trustedAlertSent;
  const preset = getPresetById(currentState.presetId);
  const result = submitTransfer(currentState, parsed.data, preset);
  currentState = result.state;
  broadcastState();

  let telegramResult: { sent: boolean; reason?: string } | undefined;
  if (!wasAlertSent && currentState.trustedAlertSent) {
    telegramResult = await sendTelegramAlert({
      callerNumber: currentState.call.callerNumber,
      coercionScore: currentState.call.coercionScore,
      capturedMules: currentState.capturedMules,
      receipt: result.receipt,
    });
  }

  return c.json({
    outcome: result.outcome,
    errorMessage: result.errorMessage,
    receipt: result.receipt,
    capturedMule: result.capturedMule,
    telegram: telegramResult,
    ...buildSnapshotPayload(),
  });
});

app.post("/api/support", async (c) => {
  const raw = await parseJsonBody(c.req.raw);
  const parsed = supportBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid support message payload" }, 400);
  }

  currentState = appendSupportMessage(currentState, "user", parsed.data.text);
  broadcastState();

  const replyResult = await replyAsCoverSupport(parsed.data.text, {
    mode: currentState.mode,
    locale: currentState.locale,
    honeytrapStage: currentState.honeytrapStage,
    callActive: currentState.call.active,
    coercionScore: currentState.call.coercionScore,
    capturedMulesCount: currentState.capturedMules.length,
    latestReceiptRef: currentState.receipts[0]?.refCode,
  });

  currentState = appendSupportMessage(currentState, "agent", replyResult.reply);
  broadcastState();

  return c.json({
    reply: replyResult.reply,
    source: replyResult.source,
    ...buildSnapshotPayload(),
  });
});

app.post("/api/locale", async (c) => {
  const raw = await parseJsonBody(c.req.raw);
  const parsed = localeBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid locale payload" }, 400);
  }

  currentState = setLocale(currentState, parsed.data.locale);
  broadcastState();
  return c.json(buildSnapshotPayload());
});

app.post("/api/reset", (c) => {
  const preset = getPresetById(currentState.presetId);
  currentState = resetState(preset, currentState.locale);
  broadcastState();
  return c.json(buildSnapshotPayload());
});

app.post("/api/ai/analyze", async (c) => {
  const raw = await parseJsonBody(c.req.raw);
  const parsed = analyzeBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "Invalid analysis payload" }, 400);
  }

  const analysis = await analyzeCallChunk(parsed.data.text);
  return c.json(analysis);
});

export function startServer(port: number = PORT): Server<WsClientData> {
  const server = Bun.serve<WsClientData>({
    port,
    fetch(req, srv) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        const upgraded = srv.upgrade(req, {
          data: { clientId: crypto.randomUUID() },
        });
        if (upgraded) {
          return undefined;
        }
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return app.fetch(req);
    },
    websocket: {
      open(ws: ServerWebSocket<WsClientData>) {
        connectedClients += 1;
        ws.subscribe(WS_TOPIC);
        ws.send(JSON.stringify(buildSnapshotPayload()));
      },
      message(ws: ServerWebSocket<WsClientData>, message) {
        if (typeof message === "string" && message === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      },
      close(ws: ServerWebSocket<WsClientData>) {
        connectedClients = Math.max(0, connectedClients - 1);
        ws.unsubscribe(WS_TOPIC);
      },
    },
  });

  bunServer = server;
  return server;
}

if (import.meta.main) {
  const server = startServer(PORT);
  console.log(`[mirage-server] listening on http://127.0.0.1:${server.port} (ws: /ws)`);
}
