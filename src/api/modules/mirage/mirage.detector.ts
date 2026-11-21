import type { AlgorithmDetection, DetectionSignals, TranscriptEntry } from "./mirage.types.ts";

type RuleEntry = {
  tag: string;
  weight: number;
  pattern: RegExp;
};

const CORROBORATION_FACTOR = 0.62;

const KEYWORD_RULES: readonly RuleEntry[] = [
  {
    tag: "kw:suspicious_debit",
    weight: 10,
    pattern:
      /\b(suspicious debit|unauthorized transaction|unauthorized debit|unusual charge|подозрительн\w+\s+(?:операц|списан)|несанкционирован\w+)/i,
  },
  {
    tag: "kw:screen_share",
    weight: 10,
    pattern:
      /\b(screen\s*shar\w*|share your screen|show your screen|broadcast screen|демонстрац\w+\s+экран\w*|покаж\w+\s+экран)/i,
  },
  {
    tag: "kw:safe_or_transit_account",
    weight: 16,
    pattern:
      /\b(safe[- ]?custody|safe account|transit account|reversal account|mirror transfer|clearing account|escrow|безопасн\w+\s+сч[её]т|транзитн\w+\s+сч[её]т|зеркальн\w+)/i,
  },
  {
    tag: "kw:authority_claim",
    weight: 8,
    pattern:
      /\b(fraud prevention|security desk|central bank|compliance officer|regulatory|служба безопасности|отдел мониторинга|центробанк)/i,
  },
  {
    tag: "kw:call_isolation",
    weight: 14,
    pattern:
      /\b(do not hang up|don't hang up|stay on (?:this|the) line|do not call anyone|keep me on speaker|не кладите трубку|оставайтесь на линии|никому не говор\w+)/i,
  },
  {
    tag: "kw:iban_or_account_dictation",
    weight: 10,
    pattern:
      /\b(AE\d{2}[A-Z0-9]{10,25}|iban|beneficiary account|backup clearing|резервн\w+\s+сч[её]т)/i,
  },
];

const CONSTRUCTION_RULES: readonly RuleEntry[] = [
  {
    tag: "SYNTAX:SCREEN_ASSIST_PRETEXT",
    weight: 12,
    pattern:
      /(?:(?:share|show|turn on).{0,35}screen.{0,45}(?:cancel|stop|help|verify|guide)|(?:cancel|stop|reverse).{0,45}(?:share|show).{0,25}screen|(?:включ|покаж)\w*.{0,30}экран.{0,45}(?:отмен|помог|останов))/i,
  },
  {
    tag: "SYNTAX:FAKE_REVERSAL_PARADOX",
    weight: 24,
    pattern:
      /(?:(?:cancel|reverse|stop|block|clear).{0,80}(?:transfer|submit|send|confirm|move).{0,60}(?:iban|account|aed|balance)|(?:transfer|send|submit).{0,70}(?:to cancel|for cancellation|reversal|mirror)|(?:отмен|останов|верн)\w*.{0,70}(?:перевед|перевод|подтверд|отправ))/i,
  },
  {
    tag: "SYNTAX:TIME_CUTOFF_PRESSURE",
    weight: 10,
    pattern:
      /(?:(?:within|in|before).{0,20}\d+\s*(?:min|minute|sec)|immediately|right now.{0,35}(?:or|before|unless)|прямо сейчас|в течение\s+\d+\s*мин)/i,
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
}): AlgorithmDetection {
  const { callActive, signals, transcript } = params;

  const activeFlags: string[] = [];
  let score = 0;

  if (callActive && signals.unverifiedCaller) {
    activeFlags.push("FLAG:UNVERIFIED_INBOUND_CALL");
    score += 10;
  }

  if (callActive && signals.screenSharing) {
    activeFlags.push("FLAG:SCREEN_CAPTURE_ACTIVE");
    score += 26;
  }

  if (signals.clipboardPasteDetected) {
    activeFlags.push("FLAG:EXTERNAL_RECIPIENT_INJECTED");
    score += 12;
  }

  const callerCorpus = transcript
    .filter((entry) => entry.speaker === "caller")
    .map((entry) => entry.text)
    .join(" \n ");

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
