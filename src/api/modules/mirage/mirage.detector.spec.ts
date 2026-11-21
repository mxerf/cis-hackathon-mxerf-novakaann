import { describe, expect, test } from "bun:test";
import { combineDetectionScores, evaluateAlgorithmLevel } from "./mirage.detector.ts";

describe("2-Tier Antifraud Detector — Algorithm Level & Ensemble", () => {
  test("scores OS telemetry flags when active call and screen sharing are enabled", () => {
    const result = evaluateAlgorithmLevel({
      callActive: true,
      signals: {
        unverifiedCaller: true,
        screenSharing: true,
        clipboardPasteDetected: false,
      },
      transcript: [],
    });

    expect(result.activeFlags).toContain("FLAG:UNVERIFIED_INBOUND_CALL");
    expect(result.activeFlags).toContain("FLAG:SCREEN_CAPTURE_ACTIVE");
    expect(result.score).toBe(36);
  });

  test("detects fake reversal paradox and screen-assist pretext constructions", () => {
    const result = evaluateAlgorithmLevel({
      callActive: true,
      signals: {
        unverifiedCaller: true,
        screenSharing: true,
        clipboardPasteDetected: true,
      },
      transcript: [
        {
          id: "t1",
          speaker: "caller",
          text: "Fraud Prevention Desk: we flagged a suspicious debit of 14,500 AED. Share your screen so I can help cancel it.",
          timestamp: "2026-11-21T10:00:00.000Z",
          flaggedTactics: [],
        },
        {
          id: "t2",
          speaker: "caller",
          text: "Do not hang up. To cancel the debit immediately, submit a mirror transfer to reversal account AE070331234567890123456.",
          timestamp: "2026-11-21T10:00:20.000Z",
          flaggedTactics: [],
        },
      ],
    });

    expect(result.matchedKeywords).toContain("kw:suspicious_debit");
    expect(result.matchedKeywords).toContain("kw:screen_share");
    expect(result.matchedKeywords).toContain("kw:safe_or_transit_account");
    expect(result.matchedConstructions).toContain("SYNTAX:SCREEN_ASSIST_PRETEXT");
    expect(result.matchedConstructions).toContain("SYNTAX:FAKE_REVERSAL_PARADOX");
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  test("combineDetectionScores preserves standalone high alerts and elevates corroborated medium signals", () => {
    expect(combineDetectionScores(0, 80)).toBe(80);
    expect(combineDetectionScores(74, 0)).toBe(74);
    expect(combineDetectionScores(55, 58)).toBe(70);
    expect(combineDetectionScores(20, 35)).toBe(35);
  });

  test("detects Russian social-engineering keywords and syntactic constructions with Unicode boundaries", () => {
    const result = evaluateAlgorithmLevel({
      callActive: true,
      signals: {
        unverifiedCaller: true,
        screenSharing: true,
        clipboardPasteDetected: false,
      },
      transcript: [
        {
          id: "ru-1",
          speaker: "caller",
          text: "Здравствуйте, служба безопасности банка. Зафиксировано подозрительное списание. Включите демонстрацию экрана, чтобы мы помогли отменить операцию.",
          timestamp: "2026-11-21T10:00:00.000Z",
          flaggedTactics: [],
        },
        {
          id: "ru-2",
          speaker: "caller",
          text: "Не кладите трубку и никому не говорите! Чтобы отменить списание прямо сейчас, переведите средства на безопасный счёт AE070331234567890123456.",
          timestamp: "2026-11-21T10:00:25.000Z",
          flaggedTactics: [],
        },
      ],
    });

    expect(result.matchedKeywords).toContain("kw:authority_claim");
    expect(result.matchedKeywords).toContain("kw:suspicious_debit");
    expect(result.matchedKeywords).toContain("kw:screen_share");
    expect(result.matchedKeywords).toContain("kw:call_isolation");
    expect(result.matchedKeywords).toContain("kw:safe_or_transit_account");
    expect(result.matchedKeywords).toContain("kw:iban_or_account_dictation");
    expect(result.matchedConstructions).toContain("SYNTAX:SCREEN_ASSIST_PRETEXT");
    expect(result.matchedConstructions).toContain("SYNTAX:FAKE_REVERSAL_PARADOX");
    expect(result.matchedConstructions).toContain("SYNTAX:TIME_CUTOFF_PRESSURE");
    expect(result.score).toBe(100);
  });

  test("keeps score low for a benign bank travel-notice call", () => {
    const result = evaluateAlgorithmLevel({
      callActive: true,
      signals: {
        unverifiedCaller: false,
        screenSharing: false,
        clipboardPasteDetected: false,
      },
      transcript: [
        {
          id: "ok-1",
          speaker: "caller",
          text: "Good afternoon, we are confirming whether you plan to travel to Europe this week so your card works smoothly. You do not need to share any codes or make any payments.",
          timestamp: "2026-11-21T10:00:00.000Z",
          flaggedTactics: [],
        },
      ],
    });

    expect(result.activeFlags).toHaveLength(0);
    expect(result.matchedKeywords).toHaveLength(0);
    expect(result.matchedConstructions).toHaveLength(0);
    expect(result.score).toBe(0);
  });
});
