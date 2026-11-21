import { Shield } from "lucide-react";
import type {
  DetectionSignals,
  MirageState,
  ScenarioPreset,
  TranscriptSpeaker,
} from "../../../shared/mirage-types.ts";
import { getUiCopy } from "../../lib/ui-copy.ts";
import { CallSimulator } from "./call-simulator.tsx";
import { MuleGraph } from "./mule-graph.tsx";
import { VaultComparison } from "./vault-comparison.tsx";

export type XRayPanelProps = {
  state: MirageState;
  preset: ScenarioPreset;
  isBusy: boolean;
  onStartCall: () => Promise<void>;
  onEndCall: () => Promise<void>;
  onUpdateSignals: (patch: Partial<DetectionSignals>) => Promise<void>;
  onPlayNextChunk: (analyzeWithAi: boolean) => Promise<void>;
  onInjectTranscript: (
    speaker: TranscriptSpeaker,
    text: string,
    analyzeWithAi: boolean,
  ) => Promise<void>;
};

export function XRayPanel({
  state,
  preset,
  isBusy,
  onStartCall,
  onEndCall,
  onUpdateSignals,
  onPlayNextChunk,
  onInjectTranscript,
}: XRayPanelProps) {
  const copy = getUiCopy(state.locale);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sky-400" />
            <h1 className="text-lg font-bold tracking-tight text-white">{copy.xrayTitle}</h1>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{copy.xraySubtitle}</p>
        </div>

        <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-300">
          {preset.scenarioTitle[state.locale]}
        </span>
      </div>

      <CallSimulator
        state={state}
        preset={preset}
        isBusy={isBusy}
        onStartCall={onStartCall}
        onEndCall={onEndCall}
        onUpdateSignals={onUpdateSignals}
        onPlayNextChunk={onPlayNextChunk}
        onInjectTranscript={onInjectTranscript}
      />

      <VaultComparison state={state} />

      <MuleGraph state={state} />
    </div>
  );
}
