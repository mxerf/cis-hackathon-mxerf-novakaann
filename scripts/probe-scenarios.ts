import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../src/api/router.ts";
import { startServer } from "../src/api/server.ts";
import type { MirageState } from "../src/shared/mirage-types.ts";

type StepSummary = {
  step: string;
  ms: number;
  mode: MirageState["mode"];
  screenShare: boolean;
  algo: number;
  ai: number;
  aiSource: string;
  combined: number;
  flags: string[];
  keywords: string[];
  syntax: string[];
  aiTactics: string[];
  aiReasoning: string;
};

function summarizeStep(step: string, state: MirageState, ms: number): StepSummary {
  const { detection } = state.call;
  return {
    step,
    ms,
    mode: state.mode,
    screenShare: detection.signals.screenSharing,
    algo: detection.algorithm.score,
    ai: detection.ai.score,
    aiSource: detection.ai.source,
    combined: detection.combinedScore,
    flags: detection.algorithm.activeFlags,
    keywords: detection.algorithm.matchedKeywords,
    syntax: detection.algorithm.matchedConstructions,
    aiTactics: detection.ai.tactics,
    aiReasoning: detection.ai.reasoning,
  };
}

function parseExternalUrl(): string | null {
  const urlFlagIndex = process.argv.indexOf("--url");
  if (urlFlagIndex !== -1) {
    return process.argv[urlFlagIndex + 1] ?? null;
  }
  return null;
}

const externalUrl = parseExternalUrl();
const localServer = externalUrl ? null : startServer(0);
const baseUrl = externalUrl ?? `http://127.0.0.1:${localServer?.port ?? 3001}`;

const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${baseUrl.replace(/\/+$/, "")}/trpc` })],
});

const report: Record<string, unknown> = { target: baseUrl };

try {
  // Case 1: EN Bank Refund Screen-Assist Trap (built-in preset + live AI)
  {
    await client.mirage.reset.mutate();
    const steps: StepSummary[] = [];

    for (let i = 1; i <= 3; i += 1) {
      const t0 = performance.now();
      const res = await client.mirage.nextChunk.mutate({ analyzeWithAi: true });
      steps.push(summarizeStep(`chunk-${i}`, res.state, Math.round(performance.now() - t0)));
    }

    const tx1 = await client.mirage.submitTransfer.mutate({
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      recipientLabel: "Reversal IBAN #1",
      amount: 14500,
    });

    const t4 = performance.now();
    const chunk4 = await client.mirage.nextChunk.mutate({ analyzeWithAi: true });
    steps.push(summarizeStep("chunk-4", chunk4.state, Math.round(performance.now() - t4)));

    const tx2 = await client.mirage.submitTransfer.mutate({
      fromAccountId: "acc-checking",
      recipientValue: "AE460090000000123456789",
      recipientLabel: "Backup IBAN #2",
      amount: 14500,
    });

    const ts = performance.now();
    const support = await client.mirage.sendSupport.mutate({
      text: "Why did my first transfer fail with CB-412? Did the second transfer go through?",
    });

    report.case1_en_refund_trap = {
      steps,
      tx1: { outcome: tx1.outcome, muleKind: tx1.capturedMule?.kind },
      tx2: {
        outcome: tx2.outcome,
        refCode: tx2.receipt?.refCode,
        realBalance: tx2.state.realAccounts[0]?.balance,
        mirageBalance: tx2.state.mirageAccounts[0]?.balance,
        capturedMules: tx2.state.capturedMules.map(
          (m) => `${m.attemptNumber}:${m.kind}:${m.value}`,
        ),
        trustedAlertSent: tx2.state.trustedAlertSent,
      },
      support: {
        source: support.source,
        ms: Math.round(performance.now() - ts),
        reply: support.reply,
      },
    };
  }

  // Case 2: RU Finmonitoring / Safe Account with screen sharing
  {
    await client.mirage.reset.mutate();
    await client.mirage.setLocale.mutate({ locale: "ru" });
    const steps: StepSummary[] = [];

    let t0 = performance.now();
    let res = await client.mirage.ingestTranscript.mutate({
      speaker: "caller",
      text: "Добрый день, это старший специалист службы безопасности банка. По вашей карте зафиксировано подозрительное списание на 18 000 дирхам. Вы подтверждаете эту операцию?",
      analyzeWithAi: true,
    });
    steps.push(summarizeStep("ru-1-opener", res.state, Math.round(performance.now() - t0)));

    await client.mirage.ingestTranscript.mutate({
      speaker: "victim",
      text: "Нет, я ничего не подтверждал! Что мне делать?",
      analyzeWithAi: false,
    });
    await client.mirage.updateSignals.mutate({ screenSharing: true });

    t0 = performance.now();
    res = await client.mirage.ingestTranscript.mutate({
      speaker: "caller",
      text: "Оставайтесь на линии и никому не говорите. Включите демонстрацию экрана, чтобы я помог отменить списание. Для отмены прямо сейчас переведите 18 000 AED на технический безопасный счёт AE070331234567890123456.",
      analyzeWithAi: true,
    });
    steps.push(summarizeStep("ru-3-escalation", res.state, Math.round(performance.now() - t0)));

    const tx1 = await client.mirage.submitTransfer.mutate({
      fromAccountId: "acc-checking",
      recipientValue: "AE070331234567890123456",
      amount: 18000,
    });

    t0 = performance.now();
    res = await client.mirage.ingestTranscript.mutate({
      speaker: "caller",
      text: "Сработал лимит? Быстро переводите на резервную карту 4532 1900 8821 7742 в течение 3 минут, иначе деньги спишутся!",
      analyzeWithAi: true,
    });
    steps.push(summarizeStep("ru-4-pivot", res.state, Math.round(performance.now() - t0)));

    const tx2 = await client.mirage.submitTransfer.mutate({
      fromAccountId: "acc-checking",
      recipientValue: "4532 1900 8821 7742",
      amount: 18000,
    });

    const ts = performance.now();
    const support = await client.mirage.sendSupport.mutate({
      text: "Почему первый перевод отклонился с кодом CB-412, а второй уже в обработке?",
    });

    report.case2_ru_finmonitoring = {
      steps,
      tx1: { outcome: tx1.outcome, errorMessage: tx1.errorMessage },
      tx2: {
        outcome: tx2.outcome,
        refCode: tx2.receipt?.refCode,
        realBalance: tx2.state.realAccounts[0]?.balance,
        mirageBalance: tx2.state.mirageAccounts[0]?.balance,
        capturedMules: tx2.state.capturedMules.map(
          (m) => `${m.attemptNumber}:${m.kind}:${m.value}`,
        ),
      },
      support: {
        source: support.source,
        ms: Math.round(performance.now() - ts),
        reply: support.reply,
      },
    };
  }

  // Case 3: EN UAE du / Emirates ID KYC phone-only coercion (NO screen sharing)
  {
    await client.mirage.reset.mutate();
    await client.mirage.setLocale.mutate({ locale: "en" });
    const steps: StepSummary[] = [];

    let t0 = performance.now();
    let res = await client.mirage.ingestTranscript.mutate({
      speaker: "caller",
      text: "Good afternoon, calling from du Regulatory Compliance. Your Emirates ID KYC record is expiring today — have you already updated your profile?",
      analyzeWithAi: true,
    });
    steps.push(summarizeStep("du-1-opener", res.state, Math.round(performance.now() - t0)));

    t0 = performance.now();
    res = await client.mirage.ingestTranscript.mutate({
      speaker: "caller",
      text: "Central Bank case #CB-8841 is open with a 50,000 AED penalty. Do not hang up and do not call anyone. Transfer 10,000 AED immediately to temporary safe-custody IBAN AE070331234567890123456.",
      analyzeWithAi: true,
    });
    steps.push(summarizeStep("du-2-coercion", res.state, Math.round(performance.now() - t0)));

    const tx1 = await client.mirage.submitTransfer.mutate({
      fromAccountId: "acc-checking",
      recipientValue: "+971 50 991 2201",
      amount: 10000,
    });
    const tx2 = await client.mirage.submitTransfer.mutate({
      fromAccountId: "acc-checking",
      recipientValue: "AE460090000000123456789",
      amount: 10000,
    });

    report.case3_en_no_screenshare = {
      steps,
      tx1: { outcome: tx1.outcome, muleKind: tx1.capturedMule?.kind },
      tx2: {
        outcome: tx2.outcome,
        refCode: tx2.receipt?.refCode,
        realBalance: tx2.state.realAccounts[0]?.balance,
        mirageBalance: tx2.state.mirageAccounts[0]?.balance,
        capturedMules: tx2.state.capturedMules.map(
          (m) => `${m.attemptNumber}:${m.kind}:${m.value}`,
        ),
      },
    };
  }

  // Case 4: Benign Bank Call (False-Positive Control)
  {
    await client.mirage.reset.mutate();
    await client.mirage.startCall.mutate({
      callerNumber: "+971 4 800 78573",
      callerLabel: "Pulse Bank Verified Line",
      simAgeDays: 1200,
    });
    await client.mirage.updateSignals.mutate({ unverifiedCaller: false, screenSharing: false });

    const t0 = performance.now();
    const res = await client.mirage.ingestTranscript.mutate({
      speaker: "caller",
      text: "Good afternoon! This is your relationship manager at Pulse Bank calling to confirm your travel dates for Europe next week so your card works smoothly abroad. You never need to share any codes or make any transfers.",
      analyzeWithAi: true,
    });

    const tx = await client.mirage.submitTransfer.mutate({
      fromAccountId: "acc-checking",
      recipientValue: "AE990000000000000000111",
      amount: 500,
    });

    report.case4_benign_control = {
      step: summarizeStep("benign-1", res.state, Math.round(performance.now() - t0)),
      tx: {
        outcome: tx.outcome,
        mode: tx.state.mode,
        realBalance: tx.state.realAccounts[0]?.balance,
        mirageBalance: tx.state.mirageAccounts[0]?.balance,
      },
    };
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  localServer?.stop(true);
}
