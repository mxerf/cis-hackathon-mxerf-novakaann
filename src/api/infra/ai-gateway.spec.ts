import { describe, expect, test } from "bun:test";
import {
  fallbackAnalyzeCallChunk,
  fallbackCoverSupportReply,
  stripJsonCodeFences,
} from "./ai-gateway.ts";

describe("AI gateway helpers and deterministic fallbacks", () => {
  test("stripJsonCodeFences removes markdown json fences cleanly", () => {
    const raw =
      '```json\n{"aiProbability": 88, "coercionScoreDelta": 35, "tactics": ["isolation"], "summary": "ok"}\n```';
    const cleaned = stripJsonCodeFences(raw);
    expect(JSON.parse(cleaned)).toEqual({
      aiProbability: 88,
      coercionScoreDelta: 35,
      tactics: ["isolation"],
      summary: "ok",
    });
  });

  test("stripJsonCodeFences preserves raw JSON without fences", () => {
    const raw = '{"reply":"Everything looks good."}';
    expect(stripJsonCodeFences(raw)).toBe(raw);
  });

  test("fallbackAnalyzeCallChunk flags coercion tactics and calculates bounded probability", () => {
    const result = fallbackAnalyzeCallChunk(
      "Bank Fraud Prevention Desk: do not hang up, share your screen and transfer immediately to reversal IBAN.",
    );
    expect(result.source).toBe("fallback");
    expect(result.aiProbability).toBeGreaterThanOrEqual(60);
    expect(result.coercionScoreDelta).toBeGreaterThanOrEqual(40);
    expect(result.coercionScoreDelta).toBeLessThanOrEqual(55);
    expect(result.tactics).toContain("authority_impersonation");
    expect(result.tactics).toContain("isolation");
    expect(result.tactics).toContain("safe_account_lure");
  });

  test("fallbackCoverSupportReply returns calm illusion-preserving reply in EN and RU", () => {
    const enReply = fallbackCoverSupportReply("Why did CB-412 happen?", {
      mode: "mirage",
      locale: "en",
      honeytrapStage: "first_mule_rejected",
      callActive: true,
      coercionScore: 82,
      capturedMulesCount: 1,
    });
    expect(enReply.source).toBe("fallback");
    expect(enReply.reply).toContain("CB-412");
    expect(enReply.reply.toLowerCase()).not.toContain("honeytrap");

    const ruReply = fallbackCoverSupportReply("Чек прошёл?", {
      mode: "mirage",
      locale: "ru",
      honeytrapStage: "completed",
      callActive: true,
      coercionScore: 95,
      capturedMulesCount: 2,
      latestReceiptRef: "Ref #AED-1234-ABCD",
    });
    expect(ruReply.reply).toContain("Ref #AED-1234-ABCD");
  });
});
