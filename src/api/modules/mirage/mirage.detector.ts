import type { AlgorithmDetection, DetectionSignals, TranscriptEntry } from "./mirage.types.ts";

type RuleEntry = {
  tag: string;
  weight: number;
  pattern: RegExp;
};

const CORROBORATION_FACTOR = 0.62;
export const YOUNG_SIM_DAYS_THRESHOLD = 14;
export const HIGH_VALUE_DRAIN_THRESHOLD = 0.45;
export const VAULT_DRAIN_THRESHOLD = 0.25;

const KEYWORD_RULES: readonly RuleEntry[] = [
  {
    tag: "kw:suspicious_debit",
    weight: 10,
    pattern:
      /(?:^|[^\p{L}\p{N}_])(suspicious debit|unauthorized transaction|unauthorized debit|unusual charge|pending charge|подозрительн\p{L}+\s+(?:операц\p{L}*|списан\p{L}*|перевод\p{L}*)|несанкционирован\p{L}+|оформляют\s+кредит)/iu,
  },
  {
    tag: "kw:screen_share",
    weight: 10,
    pattern:
      /(?:^|[^\p{L}\p{N}_])(screen\s*shar\p{L}*|share your screen|show your screen|broadcast screen|демонстрац\p{L}+\s+экран\p{L}*|покаж\p{L}+\s+экран|показ\p{L}*\s+экран\p{L}*)/iu,
  },
  {
    tag: "kw:safe_or_transit_account",
    weight: 16,
    pattern:
      /(?:^|[^\p{L}\p{N}_])(safe[- ]?custody|safe account|transit account|reversal account|mirror transfer|clearing account|escrow|безопасн\p{L}+\s+сч[её]т|транзитн\p{L}+\s+сч[её]т|техническ\p{L}+\s+сч[её]т|зеркальн\p{L}+)/iu,
  },
  {
    tag: "kw:authority_claim",
    weight: 8,
    pattern:
      /(?:^|[^\p{L}\p{N}_])(fraud prevention|security desk|central bank|compliance officer|regulatory|служб\p{L}\s+безопасности|отдел\p{L}*\s+мониторинга|финмониторинг\p{L}*|центробанк\p{L}*)/iu,
  },
  {
    tag: "kw:call_isolation",
    weight: 14,
    pattern:
      /(?:^|[^\p{L}\p{N}_])(do not hang up|don't hang up|stay on (?:this|the) line|do not call anyone|keep me on speaker|не кладите трубку|оставайтесь на линии|никому не говор\p{L}+|никому не сообщ\p{L}+)/iu,
  },
  {
    tag: "kw:iban_or_account_dictation",
    weight: 10,
    pattern:
      /(?:^|[^\p{L}\p{N}_])(AE\d{2}(?:[\s-]?[A-Z0-9]){10,25}|(?:\d{4}[\s-]?){3}\d{4}|iban|beneficiary account|backup clearing|резервн\p{L}+\s+сч[её]т|резервн\p{L}+\s+карт\p{L}*)/iu,
  },
];

const CONSTRUCTION_RULES: readonly RuleEntry[] = [
  {
    tag: "SYNTAX:SCREEN_ASSIST_PRETEXT",
    weight: 12,
    pattern:
      /(?:(?:share|show|turn on).{0,35}screen.{0,45}(?:cancel|stop|help|verify|guide)|(?:cancel|stop|reverse).{0,45}(?:share|show).{0,25}screen|(?:включ|покаж)\p{L}*.{0,30}экран.{0,45}(?:отмен|помог|останов))/iu,
  },
  {
    tag: "SYNTAX:FAKE_REVERSAL_PARADOX",
    weight: 24,
    pattern:
      /(?:(?:cancel|reverse|stop|block|clear).{0,80}(?:transfer|submit|send|confirm|move).{0,60}(?:iban|account|aed|balance)|(?:transfer|send|submit).{0,70}(?:to cancel|for cancellation|reversal|mirror)|(?:отмен|останов|верн|аннулир)\p{L}*.{0,70}(?:перевед|перевод|подтверд|отправ)|(?:перевед|перевод|отправ)\p{L}*.{0,70}(?:для отмен|чтобы отмен|зеркальн|аннулир))/iu,
  },
  {
    tag: "SYNTAX:TIME_CUTOFF_PRESSURE",
    weight: 10,
    pattern:
      /(?:(?:within|in|before).{0,20}\d+\s*(?:min|minute|sec)|immediately|right now.{0,35}(?:or|before|unless)|прямо сейчас|в течение\s+\d+\s*мин|через\s+\d+\s*мин)/iu,
  },
];

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function evaluateAlgorithmLevel(params: {
  callActive: boolean;
  signals: DetectionSignals;
  transcript: readonly TranscriptEntry[];
  simAgeDays?: number;
  pendingTransferDrainRatio?: number;
  isTransferAttempt?: boolean;
  isVaultWithdrawal?: boolean;
}): AlgorithmDetection {
  const {
    callActive,
    signals,
    transcript,
    simAgeDays,
    pendingTransferDrainRatio,
    isTransferAttempt,
    isVaultWithdrawal,
  } = params;

  const activeFlags: string[] = [];
  let score = 0;

  if (callActive && signals.unverifiedCaller) {
    activeFlags.push("FLAG:UNVERIFIED_INBOUND_CALL");
    score += 10;
  }

  if (
    callActive &&
    signals.unverifiedCaller &&
    simAgeDays !== undefined &&
    simAgeDays <= YOUNG_SIM_DAYS_THRESHOLD
  ) {
    activeFlags.push("FLAG:YOUNG_SIM_CALLER");
    score += 8;
  }

  if (callActive && signals.screenSharing) {
    activeFlags.push("FLAG:SCREEN_CAPTURE_ACTIVE");
    score += 26;
  }

  if (callActive && signals.unverifiedCaller && signals.screenSharing && isTransferAttempt) {
    activeFlags.push("FLAG:TRANSFER_UNDER_SCREEN_SHARE");
    score += 22;
  }

  if (signals.clipboardPasteDetected) {
    activeFlags.push("FLAG:EXTERNAL_RECIPIENT_INJECTED");
    score += 12;
  }

  const effectiveDrainThreshold = isVaultWithdrawal
    ? VAULT_DRAIN_THRESHOLD
    : HIGH_VALUE_DRAIN_THRESHOLD;

  if (
    callActive &&
    signals.unverifiedCaller &&
    pendingTransferDrainRatio !== undefined &&
    pendingTransferDrainRatio >= effectiveDrainThreshold
  ) {
    activeFlags.push("FLAG:HIGH_VALUE_DRAIN_RATIO");
    score += 24;
  }

  if (callActive && signals.unverifiedCaller && isVaultWithdrawal) {
    activeFlags.push("FLAG:VAULT_WITHDRAWAL_ON_CALL");
    score += 32;
  }

  const callerCorpus = transcript
    .filter((entry) => entry.speaker === "caller")
    .map((entry) => entry.text)
    .join(" ");

  const matchedKeywords: string[] = [];
  const matchedConstructions: string[] = [];

  if (callerCorpus) {
    for (const rule of KEYWORD_RULES) {
      if (rule.pattern.test(callerCorpus)) {
        matchedKeywords.push(rule.tag);
        score += rule.weight;
      }
    }
    for (const rule of CONSTRUCTION_RULES) {
      if (rule.pattern.test(callerCorpus)) {
        matchedConstructions.push(rule.tag);
        score += rule.weight;
      }
    }
  }

  return {
    score: clampScore(score),
    activeFlags,
    matchedKeywords,
    matchedConstructions,
  };
}

export function combineDetectionScores(algorithmScore: number, aiScore: number): number {
  const algo = clampScore(algorithmScore);
  const ai = clampScore(aiScore);
  if (algo === 0) {
    return ai;
  }
  if (ai === 0) {
    return algo;
  }
  const corroborated = Math.round((algo + ai) * CORROBORATION_FACTOR);
  return clampScore(Math.max(algo, ai, corroborated));
}
