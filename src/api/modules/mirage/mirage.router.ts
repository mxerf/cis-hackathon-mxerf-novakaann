import { publicProcedure, router } from "../../trpc.ts";
import {
  advanceCallScript,
  changeLocale,
  endCallSession,
  executeTransfer,
  ingestCallTranscript,
  listPresets,
  patchDetectionSignals,
  resetDemoSession,
  sendSupport,
  snapshot,
  startCallSession,
} from "./mirage.handlers.ts";
import {
  ingestTranscriptSchema,
  nextChunkSchema,
  resetSessionSchema,
  sendSupportSchema,
  setLocaleSchema,
  startCallSchema,
  submitTransferSchema,
  updateSignalsSchema,
} from "./mirage.schemas.ts";

export const mirageRouter = router({
  snapshot: publicProcedure.query(snapshot),
  presets: publicProcedure.query(listPresets),
  startCall: publicProcedure.input(startCallSchema).mutation(startCallSession),
  endCall: publicProcedure.mutation(endCallSession),
  updateSignals: publicProcedure.input(updateSignalsSchema).mutation(patchDetectionSignals),
  ingestTranscript: publicProcedure.input(ingestTranscriptSchema).mutation(ingestCallTranscript),
  nextChunk: publicProcedure.input(nextChunkSchema).mutation(advanceCallScript),
  submitTransfer: publicProcedure.input(submitTransferSchema).mutation(executeTransfer),
  sendSupport: publicProcedure.input(sendSupportSchema).mutation(sendSupport),
  setLocale: publicProcedure.input(setLocaleSchema).mutation(changeLocale),
  reset: publicProcedure.input(resetSessionSchema).mutation(resetDemoSession),
});
