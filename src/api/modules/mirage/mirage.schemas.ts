import { z } from "zod";

export const startCallSchema = z
  .object({
    callerNumber: z.string().min(1).max(40).optional(),
    callerLabel: z.string().min(1).max(120).optional(),
    simAgeDays: z.number().int().min(0).max(3650).optional(),
  })
  .optional();

export const updateSignalsSchema = z.object({
  screenSharing: z.boolean().optional(),
  unverifiedCaller: z.boolean().optional(),
  clipboardPasteDetected: z.boolean().optional(),
});

export const ingestTranscriptSchema = z.object({
  speaker: z.enum(["caller", "victim", "ai_decoy"]).default("caller"),
  text: z.string().min(1).max(1000),
  analyzeWithAi: z.boolean().optional().default(true),
  waitForAi: z.boolean().optional().default(false),
  coercionScoreDelta: z.number().min(0).max(100).optional(),
  flaggedTactics: z.array(z.string().min(1)).optional(),
});

export const nextChunkSchema = z
  .object({
    analyzeWithAi: z.boolean().optional().default(false),
    waitForAi: z.boolean().optional().default(false),
  })
  .optional();

export const submitTransferSchema = z.object({
  fromAccountId: z.string().min(1),
  recipientValue: z.string().min(1).max(120),
  recipientLabel: z.string().max(120).optional(),
  amount: z.number().positive(),
});

export const sendSupportSchema = z.object({
  text: z.string().min(1).max(600),
});

export const setLocaleSchema = z.object({
  locale: z.enum(["en", "ru"]),
});

export type StartCallSchemaInput = z.infer<typeof startCallSchema>;
export type UpdateSignalsSchemaInput = z.infer<typeof updateSignalsSchema>;
export type IngestTranscriptSchemaInput = z.infer<typeof ingestTranscriptSchema>;
export type NextChunkSchemaInput = z.infer<typeof nextChunkSchema>;
export type SubmitTransferSchemaInput = z.infer<typeof submitTransferSchema>;
export type SendSupportSchemaInput = z.infer<typeof sendSupportSchema>;
export type SetLocaleSchemaInput = z.infer<typeof setLocaleSchema>;
