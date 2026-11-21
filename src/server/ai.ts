import { z } from "zod";
import type { HoneytrapStage, Locale, MirageMode } from "../core/mirage/types.ts";

const DEFAULT_AI_MODEL = "anthropic/claude-haiku-5-5";
const REQUEST_TIMEOUT_MS = 12_000;

const gatewayResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
});

const callChunkAnalysisPayloadSchema = z.object({
  coercionScoreDelta: z.number().min(0).max(100),
  tactics: z.array(z.string().min(1)).max(8),
  summary: z.string().min(1).max(300),
});

const coverSupportPayloadSchema = z.object({
  reply: z.string().min(1).max(600),
});

export interface CallChunkAnalysis {
  coercionScoreDelta: number;
  tactics: string[];
  summary: string;
  source: "ai" | "fallback";
}

export interface SupportStateSummary {
  mode: MirageMode;
  locale: Locale;
  honeytrapStage: HoneytrapStage;
  callActive: boolean;
  coercionScore: number;
  capturedMulesCount: number;
  latestReceiptRef?: string;
}

export interface CoverSupportReply {
  reply: string;
  source: "ai" | "fallback";
}

export function stripJsonCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/i.exec(trimmed);
  if (fenced && fenced[1] !== undefined) {
    return fenced[1].trim();
  }
  return trimmed;
}

function getGatewayConfig(): { url: string; token: string; model: string } | null {
  const url = process.env.AI_GATEWAY_URL?.trim();
  const token = process.env.AI_GATEWAY_TOKEN?.trim();
  if (!url || !token) {
    return null;
  }
  const model = process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL;
  return { url: url.replace(/\/+$/, ""), token, model };
}

async function callGatewayJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  const config = getGatewayConfig();
  if (!config) {
    return null;
  }

  try {
    const response = await fetch(`${config.url}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify({
        model: config.model,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    const rawBody: unknown = await response.json();
    const parsedEnvelope = gatewayResponseSchema.safeParse(rawBody);
    if (!parsedEnvelope.success) {
      return null;
    }

    const content = parsedEnvelope.data.choices[0]?.message.content;
    if (!content) {
      return null;
    }

    const cleaned = stripJsonCodeFences(content);
    const parsedJson: unknown = JSON.parse(cleaned);
    const validated = schema.safeParse(parsedJson);
    if (!validated.success) {
      return null;
    }

    return validated.data;
  } catch {
    return null;
  }
}

export function fallbackAnalyzeCallChunk(transcriptText: string): CallChunkAnalysis {
  const lower = transcriptText.toLowerCase();
  const tactics: string[] = [];
  let delta = 0;

  if (/(emirates id|kyc|central bank|police|officer|compliance|regulator|du\b|telecom)/.test(lower)) {
    tactics.push("authority_impersonation");
    delta += 20;
  }
  if (/(immediately|right now|urgent|minutes|cutoff|suspend|disconnect|expire)/.test(lower)) {
    tactics.push("artificial_urgency");
    delta += 15;
  }
  if (/(fine|penalty|arrest|freeze|block|case #|warrant|legal action)/.test(lower)) {
    tactics.push("fear_threat");
    delta += 20;
  }
  if (/(don't hang up|do not hang up|do not call|stay on this line|tell no one|secret|speaker)/.test(lower)) {
    tactics.push("isolation");
    delta += 18;
  }
  if (/(safe[- ]?custody|safe account|escrow|temporary account|clearing account|transfer|iban|card)/.test(lower)) {
    tactics.push("safe_account_lure");
    delta += 22;
  }
  if (/(secondary|backup|another account|alternate|other iban|cap|limit)/.test(lower)) {
    tactics.push("mule_pivoting");
    delta += 12;
  }

  const clampedDelta = Math.min(55, delta);
  const summary =
    tactics.length > 0
      ? `Detected coercion cues (${tactics.join(", ")}) in active call speech.`
      : "No high-risk coercion indicators detected in this utterance.";

  return {
    coercionScoreDelta: clampedDelta,
    tactics,
    summary,
    source: "fallback",
  };
}

export function fallbackCoverSupportReply(
  userMessage: string,
  stateSummary: SupportStateSummary,
): CoverSupportReply {
  const lower = userMessage.toLowerCase();

  if (stateSummary.locale === "ru") {
    if (stateSummary.mode === "mirage") {
      if (/(cb-412|лимит|отклон|ошибк|резерв)/.test(lower)) {
        return {
          reply:
            "Код CB-412 означает временное ограничение на входящий клиринг у банка получателя. Ваши средства в безопасности — если у контрагента есть альтернативные реквизиты, стандартная проверка обработает их в обычном режиме.",
          source: "fallback",
        };
      }
      if (stateSummary.latestReceiptRef) {
        return {
          reply: `Операция по референсу ${stateSummary.latestReceiptRef} зарегистрирована в очереди межбанковского клиринга UAEFTS. Специалист комплаенса уже контролирует заявку, дополнительных переводов делать не нужно.`,
          source: "fallback",
        };
      }
      return {
        reply:
          "Здравствуйте! Ваш кошелёк работает в штатном режиме, профиль Emirates ID подтверждён. Не торопитесь с переводом — вы можете завершить разговор и спокойно перепроверить детали с нами в чате.",
        source: "fallback",
      };
    }

    return {
      reply:
        "Поддержка du Pay на связи. Ваш статус Emirates ID активен, ограничений по счёту нет. Подскажите, какая операция вас интересует?",
      source: "fallback",
    };
  }

  if (stateSummary.mode === "mirage") {
    if (/(cb-412|limit|declined|error|rejected|backup|alternate)/.test(lower)) {
      return {
        reply:
          "Code CB-412 is an automated beneficiary clearing-limit notice on the receiving bank side. Your account remains in good standing — if the party provides alternate details, our compliance queue logs the update automatically.",
        source: "fallback",
      };
    }
    if (stateSummary.latestReceiptRef) {
      return {
        reply: `Reference ${stateSummary.latestReceiptRef} is queued in UAEFTS settlement review. Our priority compliance desk is already monitoring the transfer, so no further payment is required.`,
        source: "fallback",
      };
    }
    return {
      reply:
        "Your du Pay profile and Emirates ID verification are active and in good standing. Take your time — our compliance team is monitoring your session and you do not need to rush any transfer.",
      source: "fallback",
    };
  }

  return {
    reply:
      "du Pay Priority Support here. Your wallet and Emirates ID KYC are active with no pending restrictions. How can we help you today?",
    source: "fallback",
  };
}

export async function analyzeCallChunk(transcriptText: string): Promise<CallChunkAnalysis> {
  const trimmed = transcriptText.trim();
  if (!trimmed) {
    return {
      coercionScoreDelta: 0,
      tactics: [],
      summary: "Empty transcript chunk.",
      source: "fallback",
    };
  }

  const systemPrompt = [
    "You are a telecom and banking anti-coercion classifier.",
    "Evaluate a single phone call utterance for social-engineering coercion tactics.",
    "Always respond with a strict json object matching this schema:",
    '{ "coercionScoreDelta": number (0..55), "tactics": string[], "summary": string }',
    "Allowed tactic tags include: authority_impersonation, artificial_urgency, fear_threat, isolation, safe_account_lure, financial_extraction, mule_pivoting, coercion_escalation.",
    "Return valid json only without markdown fences.",
  ].join(" ");

  const userPrompt = `Analyze this call utterance and return json only:\n"${trimmed}"`;

  const aiResult = await callGatewayJson(systemPrompt, userPrompt, callChunkAnalysisPayloadSchema);
  if (!aiResult) {
    return fallbackAnalyzeCallChunk(trimmed);
  }

  return {
    coercionScoreDelta: Math.round(aiResult.coercionScoreDelta),
    tactics: aiResult.tactics,
    summary: aiResult.summary,
    source: "ai",
  };
}

export async function replyAsCoverSupport(
  userMessage: string,
  stateSummary: SupportStateSummary,
): Promise<CoverSupportReply> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return fallbackCoverSupportReply(trimmed, stateSummary);
  }

  const languageInstruction =
    stateSummary.locale === "ru"
      ? "Write the reply in calm, professional Russian."
      : "Write the reply in calm, professional English.";

  const systemPrompt = [
    "You are du Pay Priority Support inside a banking coercion-protection sandbox.",
    "When mode is 'mirage', NEVER reveal that a decoy ledger, honeytrap, or fraud trap is active — a scammer may be listening on speakerphone.",
    "Keep the tone calm, reassuring, and routine so the illusion stays intact while gently encouraging the user not to rush.",
    languageInstruction,
    'Always respond with a strict json object: { "reply": string }. Return valid json only.',
  ].join(" ");

  const userPrompt = [
    "Return json with your concise support reply (2-3 sentences max).",
    `Session json context: ${JSON.stringify(stateSummary)}`,
    `User message: "${trimmed}"`,
  ].join("\n");

  const aiResult = await callGatewayJson(systemPrompt, userPrompt, coverSupportPayloadSchema);
  if (!aiResult) {
    return fallbackCoverSupportReply(trimmed, stateSummary);
  }

  return {
    reply: aiResult.reply,
    source: "ai",
  };
}
