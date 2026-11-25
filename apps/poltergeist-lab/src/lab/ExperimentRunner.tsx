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
import { computeTimingStats } from "seance-core";
import { useLiveRoom, useLiveBatches } from "../live/LiveRoom.js";
import { HowTo } from "./HowTo.js";
import { GUIDES } from "./guides.js";
import { Link } from "react-router-dom";
import { toTimeSamples } from "seance-core/transports/phone-bridge";

type LiveStatus = "connecting" | "waiting-phone" | "live" | "error";

type RunnerState = "SETUP" | "READY_CHECK" | "RECORDING" | "ANALYZING" | "RESULT" | "ERROR";

const DEFAULT_RECORD_MS = 10_000;

interface ChannelBuffer {
  name: string;
  unit: string;
  samples: { t: number; v: readonly number[] }[];
}

export function ExperimentRunner({ experiment }: { experiment: ExperimentDefinition }) {
  const [state, setState] = useState<RunnerState>("SETUP");
  /** Where this experiment's data comes from: only phone experiments can record here. */
  const source = GUIDES[experiment.id]?.source ?? "phone";
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
  const room = useLiveRoom();
  const liveStatus: LiveStatus =
    room.status === "error" ? "error"
    : room.status !== "ready" ? "connecting"
    : room.phones.length > 0 ? "live"
    : "waiting-phone";
  const recordingRef = useRef(false);
  useEffect(() => {
    recordingRef.current = state === "RECORDING";
  }, [state]);

  // Live phone data from the app-wide séance room: buffer every batch while recording.
  useLiveBatches((_peerId, batch) => {
    if (!recordingRef.current) return;
    for (const name of experiment.channels) {
      const ch = batch.channels[name];
      const buf = channelsRef.current.get(name);
      if (ch && buf) buf.samples.push(...toTimeSamples(ch));
    }
    const chartChannel = experiment.channels[0];
    const shown = chartChannel ? batch.channels[chartChannel] : undefined;
    if (shown && shown.t.length > 0) {
      const points = toTimeSamples(shown).map((s) => ({ t: s.t, v: Math.hypot(...s.v) }));
      setChartData((prev) => [...prev, ...points].slice(-600));
    }
  });
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputsSubmit = useCallback((vals: Record<string, number>) => {
    setInputs(vals);
    setState("READY_CHECK");
  }, []);

  const recordMs = (experiment.recordSeconds ?? DEFAULT_RECORD_MS / 1000) * 1000;

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
      setProgress(Math.min(elapsed / recordMs, 1));
    }, 100);

    recordTimerRef.current = setTimeout(() => {
      clearInterval(progressInterval);
      setProgress(1);
      setState("ANALYZING");
    }, recordMs);

    return () => {
      clearInterval(progressInterval);
      if (recordTimerRef.current) clearTimeout(recordTimerRef.current);
    };
  }, [experiment.channels, recordMs]);

  useEffect(() => {
    if (state !== "ANALYZING") return;

    try {
      const channelData: Record<string, readonly { t: number; v: readonly number[] }[]> = {};
      for (const [name, buf] of channelsRef.current) {
        channelData[name] = buf.samples;
      }

      const primary = channelData[experiment.channels[0] ?? ""] ?? [];
      if (primary.length < 10) {
        throw new Error(
          primary.length === 0
            ? "No phone data arrived during recording. Keep the phone's join page open with the screen on, then try again."
            : `Only ${primary.length} samples arrived — too few to analyse. Keep the phone screen on and retry.`,
        );
      }

      const result = experiment.analyze(channelData, inputs);

      // Real timing statistics of what actually arrived (previously hard-coded placeholders).
      const times = primary.map((s) => s.t);
      const first = computeTimingStats(times);
      const timing = computeTimingStats(times, Math.max(3 * first.medianIntervalMs, 1));
      const stats: TraceStats = {
        rateHz: timing.meanHz,
        jitterPct: timing.jitterCv,
        dropouts: timing.dropouts,
        dropoutPct: timing.count > 1 ? (100 * timing.dropouts) / (timing.count - 1) : 0,
        durationS: times.length > 1 ? (times[times.length - 1]! - times[0]!) / 1000 : 0,
        calibrated: false,
        noiseFloor: 0,
      };

      if (!Number.isFinite(result.measured) || !Number.isFinite(result.uncertainty)) {
        throw new Error("The analysis could not produce a number from this recording. Check the setup steps and try again.");
      }
      // Shares are each term's fraction of the total variance (not fixed numbers).
      const terms = [
        { name: "measurement", value: result.measured, uncertainty: result.uncertainty, unit: result.unit },
        ...(result.reference !== null
          ? [{ name: "reference", value: result.reference, uncertainty: result.referenceUncertainty, unit: result.unit }]
          : []),
      ];
      const totalVar = terms.reduce((s, t) => s + t.uncertainty ** 2, 0);
      const pendUncBudget: BudgetTerm[] = terms.map((t) => ({
        ...t,
        share: totalVar > 0 ? t.uncertainty ** 2 / totalVar : 1 / terms.length,
      }));

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
      <p style={{ fontSize: 13, color: "#b4a9d6", marginBottom: 20 }}>{experiment.plain}</p>

      {experiment.safetyNote && state === "SETUP" && (
        <div style={{
          padding: "10px 14px", background: "rgba(200,160,50,0.08)",
          border: "1px solid rgba(200,160,50,0.2)", borderRadius: 6,
          fontSize: 13, color: "#ffe066", marginBottom: 16,
        }}>
          ⚠ {experiment.safetyNote}
        </div>
      )}

      {(state === "SETUP" || state === "READY_CHECK") && (
        <HowTo experimentId={experiment.id} compact={state === "READY_CHECK"} />
      )}

      {state === "SETUP" && source === "camera" && (
        <div className="sx-box" style={{ padding: 16, marginBottom: 16 }}>
          <p style={{ marginBottom: 12 }}>This experiment uses the laptop camera, so it runs on the Apparition Gate page — not with the phone.</p>
          <Link to="/gate" className="sx-btn sx-btn--cyan sx-btn--small">Open the Apparition Gate &rarr;</Link>
        </div>
      )}
      {state === "SETUP" && source === "mic" && (
        <div className="sx-box" style={{ padding: 16, marginBottom: 16 }}>
          <p>Live microphone capture isn&apos;t connected to the Lab yet, so this experiment can&apos;t record right now.</p>
        </div>
      )}
      {state === "SETUP" && source === "phone" && (
        <InputsForm specs={experiment.inputs} onSubmit={handleInputsSubmit} />
      )}

      {state === "READY_CHECK" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, marginBottom: 16 }}>Ready to record?</p>
          <p style={{ fontSize: 13, color: "#b4a9d6", marginBottom: 12 }}>
            Recording lasts {recordMs / 1000} seconds. Hold the phone steady or perform the experiment motion.
          </p>
          <p role="status" style={{ fontSize: 13, marginBottom: 20, color: liveStatus === "live" ? "#00ff99" : "#ffe066" }}>
            {liveStatus === "live" && "Phone connected — live data is streaming."}
            {liveStatus === "waiting-phone" && `No phone yet — scan the QR on the home page (room ${room.code ?? "…"}), or use Replay.`}
            {liveStatus === "connecting" && "Connecting to the séance…"}
            {liveStatus === "error" && "Can't reach the séance server — retrying… (Replay works offline.)"}
          </p>
          <button onClick={handleStartRecording} disabled={liveStatus !== "live"} style={{
            padding: "12px 32px", background: "#2a0a4a", border: "1px solid #5a2d8c",
            color: "#e6e0ff", borderRadius: 6, cursor: liveStatus === "live" ? "pointer" : "not-allowed", fontSize: 16,
            opacity: liveStatus === "live" ? 1 : 0.5,
          }}>Begin Recording</button>
        </div>
      )}

      {state === "RECORDING" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, marginBottom: 12, color: "#00ffff" }}>Recording...</p>
          <div style={{ width: "100%", height: 6, background: "#1a0a2e", borderRadius: 3, marginBottom: 16 }}>
            <div style={{
              width: `${progress * 100}%`, height: "100%",
              background: "#ff00ff", borderRadius: 3, transition: "width 0.1s",
            }} />
          </div>
          <LiveChart data={chartData} label="signal" unit="SI" />
        </div>
      )}

      {state === "ANALYZING" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 18, color: "#b4a9d6" }}>The oracle deliberates...</p>
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
          <OraclePanel verdict={verdict} result={expResult} />
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
              padding: "10px 24px", background: "#1f0a35", border: "1px solid #558",
              color: "#00ffff", borderRadius: 6, cursor: "pointer", fontSize: 14,
              alignSelf: "flex-start",
            }}>Ask the Spirit</button>
          )}
          <button onClick={() => setShowNotebook(true)} style={{
            padding: "10px 24px", background: "#1f0a35", border: "1px solid #5a2d8c",
            color: "#c9bfe6", borderRadius: 6, cursor: "pointer", fontSize: 14,
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
            padding: "10px 24px", background: "#1a0a2e", border: "1px solid #3d2466",
            color: "#c9bfe6", borderRadius: 6, cursor: "pointer", fontSize: 14,
          }}>Run Again</button>
        </div>
      )}

      {state === "ERROR" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#f66", marginBottom: 12 }}>{errorMsg}</p>
          <button onClick={handleReset} style={{
            padding: "10px 24px", background: "#2d1b4e", border: "1px solid #5a2d8c",
            color: "#e6e0ff", borderRadius: 6, cursor: "pointer",
          }}>Try Again</button>
        </div>
      )}
    </div>
  );
}
