import { useState, useCallback, useRef, useEffect } from "react";
import type { ExperimentDefinition } from "./registry.js";
import { judge } from "../oracle/judge.js";
import type { Verdict, TraceStats, BudgetTerm, ExperimentResult } from "../oracle/types.js";
import { InputsForm } from "./InputsForm.js";
import { LiveChart } from "./LiveChart.js";
import { OraclePanel } from "./OraclePanel.js";
import { UncertaintyBudget } from "./UncertaintyBudget.js";
import { ExportMenu } from "./ExportMenu.js";
import { NotebookView } from "../features/notebook/index.js";
import { diagnoseDiscrepancies, type SpiritDiagnosis } from "../oracle/explain.js";
import { AskTheSpiritModal } from "../oracle/AskTheSpiritModal.js";

type RunnerState = "SETUP" | "READY_CHECK" | "RECORDING" | "ANALYZING" | "RESULT" | "ERROR";

const RECORD_DURATION_MS = 10_000;

interface ChannelBuffer {
  name: string;
  unit: string;
  samples: { t: number; v: readonly number[] }[];
}

export function ExperimentRunner({ experiment }: { experiment: ExperimentDefinition }) {
  const [state, setState] = useState<RunnerState>("SETUP");
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [expResult, setExpResult] = useState<ExperimentResult | null>(null);
  const [expStats, setExpStats] = useState<TraceStats | null>(null);
  const [budget, setBudget] = useState<readonly BudgetTerm[]>([]);
  const [chartData, setChartData] = useState<{ t: number; v: number }[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [showNotebook, setShowNotebook] = useState(false);
  const [showSpirit, setShowSpirit] = useState(false);
  const [diagnoses, setDiagnoses] = useState<readonly SpiritDiagnosis[]>([]);
  const [progress, setProgress] = useState(0);
  const channelsRef = useRef<Map<string, ChannelBuffer>>(new Map());
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputsSubmit = useCallback((vals: Record<string, number>) => {
    setInputs(vals);
    setState("READY_CHECK");
  }, []);

  const handleStartRecording = useCallback(() => {
    setState("RECORDING");
    channelsRef.current = new Map();
    for (const ch of experiment.channels) {
      channelsRef.current.set(ch, { name: ch, unit: "SI", samples: [] });
    }
    setChartData([]);
    setProgress(0);

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(elapsed / RECORD_DURATION_MS, 1));
    }, 100);

    recordTimerRef.current = setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(1);
      setState("ANALYZING");
    }, RECORD_DURATION_MS);

    return () => {
      clearInterval(progressInterval);
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    };
  }, [experiment.channels]);

  useEffect(() => {
    if (state !== "ANALYZING") return;

    try {
      const channelData: Record<string, readonly { t: number; v: readonly number[] }[]> = {};
      for (const [name, buf] of channelsRef.current) {
        channelData[name] = buf.samples;
      }

      const result = experiment.analyze(channelData, inputs);

      const stats: TraceStats = {
        rateHz: 50,
        jitterPct: 5,
        dropouts: 0,
        dropoutPct: 0,
        durationS: RECORD_DURATION_MS / 1000,
        calibrated: true,
        noiseFloor: 0.01,
      };

      const pendUncBudget: BudgetTerm[] = [
        { name: "measurement", share: 0.7, value: result.measured, uncertainty: result.uncertainty, unit: result.unit },
        { name: "reference", share: 0.3, value: result.reference, uncertainty: result.referenceUncertainty, unit: result.unit },
      ];

      const v = judge(result, stats, [], pendUncBudget);
      setVerdict(v);
      setExpResult(result);
      setExpStats(stats);
      setBudget(pendUncBudget);
      setState("RESULT");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Analysis failed.");
      setState("ERROR");
    }
  }, [state, experiment, inputs]);

  const handleReset = useCallback(() => {
    setState("SETUP");
    setVerdict(null);
    setExpResult(null);
    setExpStats(null);
    setBudget([]);
    setChartData([]);
    setProgress(0);
    setErrorMsg("");
    setShowNotebook(false);
    setShowSpirit(false);
    setDiagnoses([]);
  }, []);

  const channelList = [...channelsRef.current.values()].map((ch) => ({
    name: ch.name,
    unit: ch.unit,
    samples: ch.samples,
  }));

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
      <h2 style={{ fontSize: 22, fontWeight: 300, marginBottom: 4 }}>{experiment.name}</h2>
      <p style={{ fontSize: 13, color: "#889", marginBottom: 20 }}>{experiment.plain}</p>

      {experiment.safetyNote && state === "SETUP" && (
        <div style={{
          padding: "10px 14px", background: "rgba(200,160,50,0.08)",
          border: "1px solid rgba(200,160,50,0.2)", borderRadius: 6,
          fontSize: 13, color: "#ca8", marginBottom: 16,
        }}>
          ⚠ {experiment.safetyNote}
        </div>
      )}

      {state === "SETUP" && (
        <InputsForm specs={experiment.inputs} onSubmit={handleInputsSubmit} />
      )}

      {state === "READY_CHECK" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, marginBottom: 16 }}>Ready to record?</p>
          <p style={{ fontSize: 13, color: "#889", marginBottom: 20 }}>
            Recording lasts {RECORD_DURATION_MS / 1000} seconds. Hold the phone steady or perform the experiment motion.
          </p>
          <button onClick={handleStartRecording} style={{
            padding: "12px 32px", background: "#223355", border: "1px solid #446",
            color: "#ccd", borderRadius: 6, cursor: "pointer", fontSize: 16,
          }}>Begin Recording</button>
        </div>
      )}

      {state === "RECORDING" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, marginBottom: 12, color: "#aabbff" }}>Recording...</p>
          <div style={{ width: "100%", height: 6, background: "#1a1a2e", borderRadius: 3, marginBottom: 16 }}>
            <div style={{
              width: `${progress * 100}%`, height: "100%",
              background: "#6688ff", borderRadius: 3, transition: "width 0.1s",
            }} />
          </div>
          <LiveChart data={chartData} label="signal" unit="SI" />
        </div>
      )}

      {state === "ANALYZING" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, color: "#889" }}>The oracle deliberates...</p>
        </div>
      )}

      {showSpirit && (
        <AskTheSpiritModal diagnoses={diagnoses} onClose={() => setShowSpirit(false)} />
      )}

      {showNotebook && verdict && (
        <NotebookView
          experimentId={experiment.id}
          experimentName={experiment.name}
          spookyTitle={experiment.spooky}
          plainDescription={experiment.plain}
          safetyNote={experiment.safetyNote}
          inputs={inputs}
          inputSpecs={experiment.inputs}
          channels={channelList}
          verdict={verdict}
          budget={budget}
          onClose={() => setShowNotebook(false)}
        />
      )}

      {state === "RESULT" && verdict && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <OraclePanel verdict={verdict} />
          {expResult && expStats && (
            <button onClick={() => {
              const facts = {
                experimentId: experiment.id,
                result: expResult,
                stats: expStats,
                verdict,
                budget,
                inputs,
              };
              setDiagnoses(diagnoseDiscrepancies(facts));
              setShowSpirit(true);
            }} style={{
              padding: "10px 24px", background: "#1a1a3e", border: "1px solid #558",
              color: "#aabbff", borderRadius: 6, cursor: "pointer", fontSize: 14,
              alignSelf: "flex-start",
            }}>Ask the Spirit</button>
          )}
          <button onClick={() => setShowNotebook(true)} style={{
            padding: "10px 24px", background: "#1a1a3e", border: "1px solid #446",
            color: "#aabbdd", borderRadius: 6, cursor: "pointer", fontSize: 14,
            alignSelf: "flex-start",
          }}>Write it up (Lab Report)</button>
          <UncertaintyBudget budget={budget} dominantName={verdict.dominantTerm.name} />
          <ExportMenu
            experimentId={experiment.id}
            channels={channelList}
            verdict={verdict}
            inputs={inputs}
          />
          <button onClick={handleReset} style={{
            padding: "10px 24px", background: "#1a1a2e", border: "1px solid #334",
            color: "#aab", borderRadius: 6, cursor: "pointer", fontSize: 14,
          }}>Run Again</button>
        </div>
      )}

      {state === "ERROR" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#f66", marginBottom: 12 }}>{errorMsg}</p>
          <button onClick={handleReset} style={{
            padding: "10px 24px", background: "#223", border: "1px solid #446",
            color: "#ccd", borderRadius: 6, cursor: "pointer",
          }}>Try Again</button>
        </div>
      )}
    </div>
  );
}
