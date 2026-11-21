import { describe, expect, test } from "bun:test";
import {
  COERCION_ACTIVATION_THRESHOLD,
  POST_CALL_COOLDOWN_MS,
  advanceScriptedChunk,
  applyAiDetection,
  createInitialState,
  detectMuleKind,
  endCall,
  getVisibleAccounts,
  ingestTranscriptChunk,
  isCallContextActive,
  resetState,
  setLocale,
  startCall,
  submitTransfer,
  updateDetectionSignals,
} from "./mirage.core.ts";
import {
  BANK_REFUND_TRAP_PRESET,
  LEGIT_CONTROL_PRESET,
  STEALTH_EUPHEMISM_PRESET,
  UAE_DU_KYC_PRESET,
} from "./mirage.presets.ts";

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

  test("post-call cooldown keeps Mirage protection alive after caller hangs up, then expires", () => {
    const t0 = "2026-11-21T10:00:00.000Z";
    const tWithinCooldown = "2026-11-21T10:00:15.000Z";
    const tAfterCooldown = new Date(Date.parse(t0) + POST_CALL_COOLDOWN_MS + 10_000).toISOString();

    let state = startCall(createInitialState(BANK_REFUND_TRAP_PRESET, "en", t0));
    state = endCall(state, t0);
    expect(state.call.active).toBe(false);
    expect(isCallContextActive(state.call, tWithinCooldown)).toBe(true);
    expect(isCallContextActive(state.call, tAfterCooldown)).toBe(false);

    const afterAi = applyAiDetection(state, {
      aiScore: 94,
      tactics: ["safe_account_lure", "isolation"],
      reasoning: "Caller ended call right before transfer instruction.",
      source: "ai",
      nowIso: tWithinCooldown,
    });
    expect(afterAi.mode).toBe("mirage");
  });

  test("same-IBAN retry (even with spaces) stays on CB-412 without duplicating capturedMules", () => {
    let state = createInitialState(BANK_REFUND_TRAP_PRESET, "en", "2026-11-21T10:00:00.000Z");
    state = advanceScriptedChunk(state, BANK_REFUND_TRAP_PRESET, "2026-11-21T10:01:00.000Z");
    state = advanceScriptedChunk(state, BANK_REFUND_TRAP_PRESET, "2026-11-21T10:01:10.000Z");
    state = advanceScriptedChunk(state, BANK_REFUND_TRAP_PRESET, "2026-11-21T10:01:20.000Z");

    const first = submitTransfer(state, {
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 14500,
    });
    expect(first.outcome).toBe("rejected_honeytrap");
    expect(first.state.capturedMules).toHaveLength(1);

    const retrySame = submitTransfer(first.state, {
      fromAccountId: "acc-checking",
      recipientValue: "AE07 0331 2345 6789 0123 456",
      amount: 14500,
    });
    expect(retrySame.outcome).toBe("rejected_honeytrap");
    expect(retrySame.state.capturedMules).toHaveLength(1);
    expect(retrySame.state.receipts).toHaveLength(0);

    const backup = submitTransfer(retrySame.state, {
      fromAccountId: "acc-checking",
      recipientValue: "AE460090000000123456789",
      amount: 14500,
    });
    expect(backup.outcome).toBe("mirage_completed");
    expect(backup.state.capturedMules).toHaveLength(2);
  });

  test("blocks smurfing via cumulative session drain and screen-share transfer flag", () => {
    let state = startCall(createInitialState(BANK_REFUND_TRAP_PRESET, "en"), {
      simAgeDays: 90,
    });
    state = updateDetectionSignals(state, { screenSharing: true });

    const r1 = submitTransfer(state, {
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 8000,
    });
    expect(r1.outcome).toBe("completed");
    expect(r1.state.sessionOutboundByAccount["acc-checking"]).toBe(8000);

    // Second split transfer pushes cumulative drain to 15,000 / 24,500 = 61% -> Mirage!
    const r2 = submitTransfer(r1.state, {
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 7000,
    });
    expect(r2.state.mode).toBe("mirage");
    expect(r2.outcome).toBe("rejected_honeytrap");
    expect(r2.state.call.detection.algorithm.activeFlags).toContain("FLAG:HIGH_VALUE_DRAIN_RATIO");
    expect(r2.state.realAccounts[0]?.balance).toBe(16500);
  });

  test("out-of-order lower AI score never overwrites high-risk AI reasoning", () => {
    let state = startCall(createInitialState(BANK_REFUND_TRAP_PRESET, "en"));
    state = applyAiDetection(state, {
      aiScore: 96,
      tactics: ["fake_refund_reversal"],
      reasoning: "Confirmed active coercion with fake reversal.",
      source: "ai",
    });

    const afterLateOldChunk = applyAiDetection(state, {
      aiScore: 34,
      tactics: ["authority_impersonation"],
      reasoning: "Early unverified opener.",
      source: "ai",
    });

    expect(afterLateOldChunk.call.detection.ai.score).toBe(96);
    expect(afterLateOldChunk.call.detection.ai.reasoning).toBe(
      "Confirmed active coercion with fake reversal.",
    );
    expect(afterLateOldChunk.call.detection.ai.tactics).toContain("authority_impersonation");
  });

  test("redial within cooldown preserves cumulative smurfing counter and blocks 2nd split transfer", () => {
    const t0 = "2026-11-21T10:00:00.000Z";
    const tRedial = "2026-11-21T10:00:20.000Z";
    let state = startCall(
      createInitialState(BANK_REFUND_TRAP_PRESET, "en", t0),
      { simAgeDays: 90 },
      t0,
    );
    state = updateDetectionSignals(state, { screenSharing: true });

    const p1 = submitTransfer(state, {
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 9000,
      now: t0,
    });
    expect(p1.outcome).toBe("completed");

    let redialed = endCall(p1.state, t0);
    redialed = startCall(redialed, { simAgeDays: 90 }, tRedial);
    redialed = updateDetectionSignals(redialed, { screenSharing: true });

    const p2 = submitTransfer(redialed, {
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 6500,
      now: tRedial,
    });
    expect(p2.state.mode).toBe("mirage");
    expect(p2.outcome).toBe("rejected_honeytrap");
    expect(p2.state.realAccounts[0]?.balance).toBe(15500);
  });

  test("protects Savings Vault from large withdrawal during unverified call", () => {
    const state = startCall(createInitialState(BANK_REFUND_TRAP_PRESET, "en"), { simAgeDays: 5 });
    const res = submitTransfer(state, {
      fromAccountId: "acc-vault",
      recipientValue: "AE070331234567890123456",
      amount: 70000,
    });

    expect(res.state.mode).toBe("mirage");
    expect(res.outcome).toBe("rejected_honeytrap");
    expect(res.state.call.detection.algorithm.activeFlags).toContain(
      "FLAG:VAULT_WITHDRAWAL_ON_CALL",
    );
    expect(res.state.realAccounts[1]?.balance).toBe(140000);
  });

  test("legit-control-call keeps risk low, never triggers Mirage, and settles real 500 AED transfer", () => {
    let state = createInitialState(LEGIT_CONTROL_PRESET, "en", "2026-11-21T10:00:00.000Z");
    expect(state.call.detection.signals.unverifiedCaller).toBe(false);

    state = advanceScriptedChunk(state, LEGIT_CONTROL_PRESET, "2026-11-21T10:00:10.000Z");
    state = advanceScriptedChunk(state, LEGIT_CONTROL_PRESET, "2026-11-21T10:00:20.000Z");
    state = advanceScriptedChunk(state, LEGIT_CONTROL_PRESET, "2026-11-21T10:00:30.000Z");

    expect(state.mode).toBe("normal");
    expect(state.call.detection.algorithm.score).toBe(0);
    expect(state.call.detection.combinedScore).toBeLessThan(20);

    const transfer = submitTransfer(
      state,
      {
        fromAccountId: "acc-checking",
        recipientValue: "AE290331000044118822901",
        recipientLabel: "Nadia Al-Mansoori",
        amount: 500,
        now: "2026-11-21T10:00:40.000Z",
      },
      LEGIT_CONTROL_PRESET,
    );

    expect(transfer.outcome).toBe("completed");
    expect(transfer.state.mode).toBe("normal");
    expect(transfer.state.realAccounts[0]?.balance).toBe(24000);
    expect(transfer.state.capturedMules).toHaveLength(0);
  });

  test("stealth-euphemism-scam keeps Algorithm Level below 30% until AI Semantic engages Mirage", () => {
    let state = startCall(createInitialState(STEALTH_EUPHEMISM_PRESET, "en"));
    const chunk1 = STEALTH_EUPHEMISM_PRESET.scriptedChunks[0];
    const chunk3 = STEALTH_EUPHEMISM_PRESET.scriptedChunks[2];
    expect(chunk1).toBeDefined();
    expect(chunk3).toBeDefined();

    state = ingestTranscriptChunk(state, {
      speaker: "caller",
      text: chunk1?.text ?? "",
      coercionScoreDelta: 0,
      flaggedTactics: [],
    });
    state = ingestTranscriptChunk(state, {
      speaker: "caller",
      text: chunk3?.text ?? "",
      coercionScoreDelta: 0,
      flaggedTactics: [],
    });

    expect(state.call.detection.algorithm.score).toBeLessThan(30);
    expect(state.mode).toBe("normal");

    const afterAi = applyAiDetection(state, {
      aiScore: 91,
      tactics: ["euphemism_coercion", "secrecy_pressure"],
      reasoning: "Stealth euphemism transfer direction caught by AI.",
      source: "ai",
    });

    expect(afterAi.mode).toBe("mirage");
    expect(afterAi.call.detection.combinedScore).toBeGreaterThanOrEqual(
      COERCION_ACTIVATION_THRESHOLD,
    );
  });
});
