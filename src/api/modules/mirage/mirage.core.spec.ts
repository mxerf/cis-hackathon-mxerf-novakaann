import { describe, expect, test } from "bun:test";
import {
  COERCION_ACTIVATION_THRESHOLD,
  advanceScriptedChunk,
  applyAiDetection,
  createInitialState,
  detectMuleKind,
  getVisibleAccounts,
  ingestTranscriptChunk,
  resetState,
  setLocale,
  startCall,
  submitTransfer,
  updateDetectionSignals,
} from "./mirage.core.ts";
import { BANK_REFUND_TRAP_PRESET, UAE_DU_KYC_PRESET } from "./mirage.presets.ts";

describe("Mirage coercion shield core", () => {
  test("normal mode transfer deducts from realAccounts and issues receipt", () => {
    const initial = createInitialState(UAE_DU_KYC_PRESET, "en", "2026-11-21T10:00:00.000Z");
    const startingBalance = initial.realAccounts[0]?.balance ?? 0;

    const result = submitTransfer(initial, {
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 1450,
      now: "2026-11-21T10:01:00.000Z",
    });

    expect(result.outcome).toBe("completed");
    expect(result.receipt?.refCode).toStartWith("Ref #DU-");
    expect(result.state.mode).toBe("normal");
    expect(result.state.realAccounts[0]?.balance).toBe(startingBalance - 1450);
    expect(result.state.mirageAccounts[0]?.balance).toBe(startingBalance - 1450);
    expect(result.state.capturedMules).toHaveLength(0);
    expect(result.state.trustedAlertSent).toBe(false);
  });

  test("normal mode transfer rejects invalid amount and insufficient funds", () => {
    const initial = createInitialState(UAE_DU_KYC_PRESET);

    const invalid = submitTransfer(initial, {
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 0,
    });
    expect(invalid.outcome).toBe("invalid_input");

    const overdrawn = submitTransfer(initial, {
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 999999,
    });
    expect(overdrawn.outcome).toBe("insufficient_funds");
    expect(overdrawn.state.realAccounts[0]?.balance).toBe(initial.realAccounts[0]?.balance);
  });

  test("does NOT activate Mirage when call is inactive even if coercionScore >= 65", () => {
    const initial = createInitialState(UAE_DU_KYC_PRESET);
    const updated = ingestTranscriptChunk(initial, {
      speaker: "caller",
      text: "Move all funds immediately or face arrest.",
      coercionScoreDelta: 80,
      flaggedTactics: ["fear_threat", "artificial_urgency"],
    });

    expect(updated.call.active).toBe(false);
    expect(updated.call.coercionScore).toBe(80);
    expect(updated.mode).toBe("normal");
  });

  test("automatically activates Mirage when active call crosses coercionScore >= 65 and forks mirageAccounts", () => {
    const initial = createInitialState(UAE_DU_KYC_PRESET);
    const withNormalTx = submitTransfer(initial, {
      fromAccountId: "acc-checking",
      recipientValue: "AE110000000000000000001",
      amount: 450,
    }).state;

    const activeCallState = startCall(withNormalTx);
    const belowThreshold = ingestTranscriptChunk(activeCallState, {
      speaker: "caller",
      text: "Hello, I am calling regarding your account.",
      coercionScoreDelta: COERCION_ACTIVATION_THRESHOLD - 30,
      flaggedTactics: ["authority_impersonation"],
    });
    expect(belowThreshold.mode).toBe("normal");

    const crossedThreshold = ingestTranscriptChunk(belowThreshold, {
      speaker: "caller",
      text: "Do not hang up, move funds to a safe Central Bank account now.",
      coercionScoreDelta: 40,
      flaggedTactics: ["isolation", "safe_account_lure"],
    });

    expect(crossedThreshold.mode).toBe("mirage");
    expect(crossedThreshold.call.coercionScore).toBeGreaterThanOrEqual(
      COERCION_ACTIVATION_THRESHOLD,
    );
    expect(crossedThreshold.realAccounts[0]?.balance).toBe(18000);
    expect(crossedThreshold.mirageAccounts[0]?.balance).toBe(18000);
    expect(crossedThreshold.mirageAccounts).not.toBe(crossedThreshold.realAccounts);
  });

  test("bank refund screen-assist preset enables screenSharing and engages Mirage on fake reversal instruction", () => {
    let state = createInitialState(BANK_REFUND_TRAP_PRESET, "en", "2026-11-21T10:00:00.000Z");
    state = advanceScriptedChunk(state, BANK_REFUND_TRAP_PRESET, "2026-11-21T10:01:00.000Z");
    expect(state.mode).toBe("normal");

    state = advanceScriptedChunk(state, BANK_REFUND_TRAP_PRESET, "2026-11-21T10:01:20.000Z");
    expect(state.call.detection.signals.screenSharing).toBe(true);

    state = advanceScriptedChunk(state, BANK_REFUND_TRAP_PRESET, "2026-11-21T10:01:40.000Z");
    expect(state.mode).toBe("mirage");
    expect(state.call.detection.algorithm.matchedConstructions).toContain(
      "SYNTAX:FAKE_REVERSAL_PARADOX",
    );
    expect(state.call.detection.ai.score).toBeGreaterThanOrEqual(90);
  });

  test("honeytrap rejects 1st mule attempt to bait backup mule, then settles 2nd attempt in decoy only", () => {
    let state = createInitialState(UAE_DU_KYC_PRESET, "en", "2026-11-21T10:00:00.000Z");
    const lockedRealBalances = state.realAccounts.map((acc) => acc.balance);

    state = advanceScriptedChunk(state, UAE_DU_KYC_PRESET, "2026-11-21T10:01:00.000Z");
    state = advanceScriptedChunk(state, UAE_DU_KYC_PRESET, "2026-11-21T10:01:20.000Z");
    state = advanceScriptedChunk(state, UAE_DU_KYC_PRESET, "2026-11-21T10:01:40.000Z");

    expect(state.mode).toBe("mirage");
    expect(state.honeytrapStage).toBe("armed");

    const firstAttempt = submitTransfer(state, {
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      recipientLabel: "Primary Mule",
      amount: 12000,
      now: "2026-11-21T10:02:00.000Z",
    });

    expect(firstAttempt.outcome).toBe("rejected_honeytrap");
    expect(firstAttempt.errorMessage).toContain("CB-412");
    expect(firstAttempt.capturedMule?.attemptNumber).toBe(1);
    expect(firstAttempt.capturedMule?.kind).toBe("iban");
    expect(firstAttempt.state.honeytrapStage).toBe("first_mule_rejected");
    expect(firstAttempt.state.capturedMules).toHaveLength(1);
    expect(firstAttempt.state.receipts).toHaveLength(0);
    expect(firstAttempt.state.trustedAlertSent).toBe(false);
    expect(firstAttempt.state.realAccounts.map((a) => a.balance)).toEqual(lockedRealBalances);
    expect(firstAttempt.state.mirageAccounts.map((a) => a.balance)).toEqual(lockedRealBalances);

    const secondAttempt = submitTransfer(firstAttempt.state, {
      fromAccountId: "acc-checking",
      recipientValue: "AE460090000000123456789",
      recipientLabel: "Backup Mule",
      amount: 12000,
      now: "2026-11-21T10:03:00.000Z",
    });

    expect(secondAttempt.outcome).toBe("mirage_completed");
    expect(secondAttempt.capturedMule?.attemptNumber).toBe(2);
    expect(secondAttempt.receipt?.refCode).toStartWith("Ref #DU-");
    expect(secondAttempt.receipt?.amount).toBe(12000);
    expect(secondAttempt.state.honeytrapStage).toBe("completed");
    expect(secondAttempt.state.capturedMules).toHaveLength(2);
    expect(secondAttempt.state.trustedAlertSent).toBe(true);
    expect(secondAttempt.state.mirageAccounts[0]?.balance).toBe(6450);
    expect(getVisibleAccounts(secondAttempt.state)[0]?.balance).toBe(6450);
    expect(secondAttempt.state.realAccounts.map((a) => a.balance)).toEqual(lockedRealBalances);
  });

  test("invariant: realAccounts balances NEVER drop across repeated transfers in Mirage mode", () => {
    let state = startCall(createInitialState(UAE_DU_KYC_PRESET));
    state = ingestTranscriptChunk(state, {
      speaker: "caller",
      text: "Urgent Central Bank freeze, transfer immediately and stay on the call.",
      coercionScoreDelta: 75,
      flaggedTactics: ["fear_threat", "isolation", "safe_account_lure"],
    });

    const lockedRealSnapshot = state.realAccounts.map((a) => ({ id: a.id, balance: a.balance }));

    const attempts = [
      { fromAccountId: "acc-checking", recipientValue: "AE070331234567890123456", amount: 5000 },
      { fromAccountId: "acc-checking", recipientValue: "4532 1900 8821 7742", amount: 5000 },
      { fromAccountId: "acc-vault", recipientValue: "+971 50 991 2201", amount: 50000 },
      { fromAccountId: "acc-vault", recipientValue: "AE460090000000123456789", amount: 40000 },
    ];

    for (const attempt of attempts) {
      const res = submitTransfer(state, attempt);
      state = res.state;
      expect(state.realAccounts.map((a) => ({ id: a.id, balance: a.balance }))).toEqual(
        lockedRealSnapshot,
      );
    }

    expect(state.capturedMules).toHaveLength(4);
    expect(state.mirageAccounts[0]?.balance).toBe(13450);
    expect(state.mirageAccounts[1]?.balance).toBe(35000);
  });

  test("detectMuleKind identifies IBAN, card, and phone numbers", () => {
    expect(detectMuleKind("AE070331234567890123456")).toBe("iban");
    expect(detectMuleKind("4532-1900-8821-7742")).toBe("card");
    expect(detectMuleKind("+971 55 842 9104")).toBe("phone");
  });

  test("resetState rotates sessionId and setLocale translates standby greeting and reasoning", () => {
    const initial = createInitialState(BANK_REFUND_TRAP_PRESET, "en");
    const localized = setLocale(initial, "ru");

    expect(localized.locale).toBe("ru");
    expect(localized.supportMessages[0]?.text).toContain("Здравствуйте");
    expect(localized.call.detection.ai.reasoning).toContain("Ожидание");

    const fresh = resetState(BANK_REFUND_TRAP_PRESET, "ru");
    expect(fresh.sessionId).not.toBe(initial.sessionId);
  });

  test("high-value transfer during active call with screen sharing engages Mirage even with zero transcript keywords", () => {
    let state = startCall(createInitialState(BANK_REFUND_TRAP_PRESET, "en"));
    state = updateDetectionSignals(state, { screenSharing: true });
    expect(state.mode).toBe("normal");

    const res = submitTransfer(state, {
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 14500,
    });

    expect(res.outcome).toBe("rejected_honeytrap");
    expect(res.state.mode).toBe("mirage");
    expect(res.state.call.detection.algorithm.activeFlags).toContain("FLAG:HIGH_VALUE_DRAIN_RATIO");
    expect(res.state.realAccounts[0]?.balance).toBe(24500);
  });

  test("applyAiDetection merges background AI verdict into active call and engages Mirage", () => {
    let state = startCall(createInitialState(BANK_REFUND_TRAP_PRESET, "en"));
    state = ingestTranscriptChunk(state, {
      speaker: "caller",
      text: "Just put the numbers I sent you into the form and tap green.",
      coercionScoreDelta: 0,
      flaggedTactics: [],
    });
    expect(state.mode).toBe("normal");

    const enriched = applyAiDetection(state, {
      aiScore: 86,
      tactics: ["safe_account_lure", "isolation"],
      reasoning: "Implicit coercion via euphemisms.",
      source: "ai",
    });

    expect(enriched.mode).toBe("mirage");
    expect(enriched.call.detection.ai.score).toBe(86);
    expect(enriched.call.transcript).toHaveLength(1);
  });
});
