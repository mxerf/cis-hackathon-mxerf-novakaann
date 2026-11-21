import { z } from "zod";
import type { HoneytrapStage, Locale, MirageMode } from "../../shared/mirage-types.ts";

const DEFAULT_AI_MODEL = "anthropic/claude-haiku-5-5";
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_FALLBACK_DELTA = 55;
const MAX_PROBABILITY = 98;

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
  aiProbability: z.number().min(0).max(100),
  coercionScoreDelta: z.number().min(0).max(100),
  tactics: z.array(z.string().min(1)).max(8),
  summary: z.string().min(1).max(320),
});

const coverSupportPayloadSchema = z.object({
  reply: z.string().min(1).max(600),
});

export type CallChunkAnalysis = {
  aiProbability: number;
  coercionScoreDelta: number;
  tactics: string[];
  summary: string;
  source: "ai" | "fallback";
};

export type CallAnalysisContext = {
  previousTranscript?: string[];
  screenSharing?: boolean;
};

export type SupportStateSummary = {
  mode: MirageMode;
  locale: Locale;
  honeytrapStage: HoneytrapStage;
  callActive: boolean;
  coercionScore: number;
  capturedMulesCount: number;
  latestReceiptRef?: string;
};

export type CoverSupportReply = {
  reply: string;
  source: "ai" | "fallback";
};

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
    // Gateway timeout or malformed upstream JSON falls back to deterministic scoring
    return null;
  }
}

export function fallbackAnalyzeCallChunk(transcriptText: string): CallChunkAnalysis {
  const lower = transcriptText.toLowerCase();
  const tactics: string[] = [];
  let delta = 0;

  if (
    /(emirates id|kyc|central bank|police|officer|compliance|regulator|du\b|telecom|fraud prevention|security desk)/.test(
      lower,
    )
  ) {
    tactics.push("authority_impersonation");
    delta += 20;
  }
  if (
    /(immediately|right now|urgent|minutes|cutoff|suspend|disconnect|expire|window)/.test(lower)
  ) {
    tactics.push("artificial_urgency");
    delta += 15;
  }
  if (
    /(fine|penalty|arrest|freeze|block|case #|warrant|legal action|unauthorized|suspicious debit)/.test(
      lower,
    )
  ) {
    tactics.push("fear_threat");
    delta += 20;
  }
  if (
    /(don't hang up|do not hang up|do not call|stay on this line|stay on the line|tell no one|secret|speaker|screen shar)/.test(
      lower,
    )
  ) {
    tactics.push("isolation");
    delta += 18;
  }
  if (
    /(safe[- ]?custody|safe account|escrow|temporary account|clearing account|reversal|mirror|transit|transfer|iban|card)/.test(
      lower,
    )
  ) {
    tactics.push("safe_account_lure");
    delta += 22;
  }
  if (/(secondary|backup|another account|alternate|other iban|cap|limit)/.test(lower)) {
    tactics.push("mule_pivoting");
    delta += 12;
  }

  const clampedDelta = Math.min(MAX_FALLBACK_DELTA, delta);
  const aiProbability = Math.min(MAX_PROBABILITY, Math.round(delta * 1.15));
  const summary =
    tactics.length > 0
      ? `Detected coercion cues (${tactics.join(", ")}) in active call speech.`
      : "No high-risk coercion indicators detected in this utterance.";

  return {
    aiProbability,
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
          "Здравствуйте! Ваш профиль и счёт работают штатно. Не торопитесь с переводом — вы можете завершить телефонный разговор и спокойно перепроверить детали с нами в чате.",
        source: "fallback",
      };
    }

    return {
      reply:
        "Поддержка банка на связи. Ограничений по вашему счёту нет. Подскажите, какая операция вас интересует?",
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
        "Your account is active and in good standing. Take your time — our compliance team is monitoring your session and you do not need to rush any transfer.",
      source: "fallback",
    };
  }

  return {
    reply:
      "Priority Banking Support here. Your account is active with no pending restrictions. How can we help you today?",
    source: "fallback",
  };
}

export async function analyzeCallChunk(
  transcriptText: string,
  context?: CallAnalysisContext,
): Promise<CallChunkAnalysis> {
  const trimmed = transcriptText.trim();
  if (!trimmed) {
    return {
      aiProbability: 0,
      coercionScoreDelta: 0,
      tactics: [],
      summary: "Empty transcript chunk.",
      source: "fallback",
    };
  }

  const systemPrompt = [
    "You are the AI Semantic Level of a 2-tier banking social-engineering fraud detector.",
    "Assess the cumulative probability (0..100) that the caller is actively coercing the victim into a fraudulent payment.",
    "Calibration rubric (strictly follow):",
    "- 0..25: benign routine bank call (e.g. travel notice, no urgency, no transfer or screen-share demand).",
    "- 26..52: early unverified opening pretext (e.g. asking if the user recognizes a charge or KYC expiry) WITHOUT yet demanding screen sharing, secrecy, OTP codes, or a transfer.",
    "- 53..74: suspicious escalation (requesting screen sharing or creating urgency/fear, but no transfer destination yet).",
    "- 75..100: confirmed active coercion (demanding secrecy/staying on the line, disguising an outbound transfer as a 'cancellation / mirror reversal / safe account', dictating an IBAN/card/phone, or pivoting to a backup account).",
    "Always respond with a strict json object matching this schema:",
    '{ "aiProbability": number (0..100), "coercionScoreDelta": number (0..55), "tactics": string[], "summary": string (1 concise sentence) }',
    "Allowed tactic tags include: authority_impersonation, screen_share_request, fake_refund_reversal, artificial_urgency, fear_threat, isolation, safe_account_lure, mule_pivoting.",
    "Return valid json only without markdown fences.",
  ].join(" ");

  const historyBlock =
    context?.previousTranscript && context.previousTranscript.length > 0
      ? `Prior call lines:\n${context.previousTranscript.slice(-4).join("\n")}\n\n`
      : "";
  const screenFlag = context?.screenSharing
    ? "Screen sharing active: YES.\n"
    : "Screen sharing active: NO.\n";
  const userPrompt = `${screenFlag}${historyBlock}Latest caller utterance (return json only):\n"${trimmed}"`;

  const aiResult = await callGatewayJson(systemPrompt, userPrompt, callChunkAnalysisPayloadSchema);
  if (!aiResult) {
    return fallbackAnalyzeCallChunk(trimmed);
  }

  return {
    aiProbability: Math.round(aiResult.aiProbability),
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
    "You are Priority Banking Support inside a coercion-protection sandbox.",
    "When mode is 'mirage', a scammer is likely watching the screen or listening on speakerphone.",
    "CRITICAL RULES in 'mirage' mode: NEVER mention scams, fraud, coercion, pressure, hanging up, ending the call, or a decoy/honeytrap/sandbox. Sound completely routine and operational.",
    "If asked about CB-412, explain calmly that CB-412 is a routine daily inbound clearing limit on the receiving bank side.",
    "If latestReceiptRef is present, confirm calmly that this reference is registered in standard UAEFTS clearing review and requires no additional action.",
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
