/**
 * SIGNQUEST — Developer Recognition Lab & Calibration Studio
 *
 * Diagnostic view showing the exact production real-data recognition pipeline:
 * MediaPipe -> canonicalNormalizer -> learnedASLClassifier (Random Forest on real ASL)
 * -> TemporalDecoder -> telemetry.
 *
 * Displays:
 * - Live Camera with 21 Landmarks
 * - Current Prediction & Model Score
 * - Top-5 Predictions & Probability Bars
 * - Motion State & Prediction History
 * - Decoder State & Hold Progress
 * - Hand Count, Handedness, Inference Latency, Model Version
 * - Optional "Train Your Hand" local calibration & data collection mode
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebcamHandTracker } from '../components/WebcamHandTracker';
import {
  globalRecognizerOrchestrator,
  RecognizerTelemetry,
} from '../services/recognition/recognizerState';
import { TemporalInferenceResult } from '../services/recognition/temporalRecognizer';
import { DecoderOutput, RecognitionLifecycleState } from '../services/recognition/temporalDecoder';
import { Landmark3D } from '../types';
import { ArrowLeft, FlaskConical, Info, Sparkles, Sliders, Camera, Trash2, Download } from 'lucide-react';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface RecognitionLabViewProps {
  onBack: () => void;
}

interface LabSnapshot {
  ts: number;
  top3: { letter: string; prob: number }[];
  lifecycleState: RecognitionLifecycleState;
  confirmed: boolean;
}

interface LocalCalibrationSample {
  letter: string;
  timestamp: number;
  landmarks: { x: number; y: number; z: number }[];
}

const LifecycleBadge: React.FC<{ state: RecognitionLifecycleState }> = ({ state }) => {
  const colours: Record<RecognitionLifecycleState, string> = {
    IDLE: 'bg-slate-700 text-slate-300 border-slate-600',
    OBSERVING: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    CANDIDATE: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    CONFIRMED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    RELEASED: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border tracking-wider uppercase transition-colors ${colours[state]}`}
    >
      {state}
    </span>
  );
};

const ProbBar: React.FC<{ letter: string; prob: number; highlight?: boolean }> = ({
  letter,
  prob,
  highlight = false,
}) => {
  const pct = Math.round(prob * 100);
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span
        className={`w-6 text-center font-bold text-sm ${
          highlight ? 'text-cyan-400' : 'text-slate-400'
        }`}
      >
        {letter}
      </span>
      <div className="flex-1 h-3.5 bg-slate-800 rounded overflow-hidden relative">
        <div
          className={`h-full rounded transition-all duration-100 ${
            highlight ? 'bg-cyan-400' : 'bg-slate-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-slate-400 text-xs">{pct}%</span>
    </div>
  );
};

export const RecognitionLabView: React.FC<RecognitionLabViewProps> = ({ onBack }) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'calibration'>('diagnostics');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<RecognizerTelemetry | null>(null);
  const [inferenceResult, setInferenceResult] = useState<TemporalInferenceResult | null>(null);
  const [decoderResult, setDecoderResult] = useState<DecoderOutput | null>(null);
  const [confirmLog, setConfirmLog] = useState<LabSnapshot[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [lastHandedness, setLastHandedness] = useState<'Left' | 'Right'>('Right');
  const [demoMode, setDemoMode] = useState<boolean>(false);

  // Local Calibration State
  const [calibrationLetter, setCalibrationLetter] = useState<string>('A');
  const [capturedSamples, setCapturedSamples] = useState<LocalCalibrationSample[]>(() => {
    try {
      const saved = localStorage.getItem('signquest_calibration_samples');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const latestLandmarksRef = useRef<Landmark3D[]>([]);

  // Keep orchestrator target in sync with selected letter
  useEffect(() => {
    globalRecognizerOrchestrator.setTargetLetter(selectedLetter);
    globalRecognizerOrchestrator.reset();
  }, [selectedLetter]);

  // ── Landmark handler ───────────────────────────────────────────────────────
  const handleLandmarks = useCallback(
    (landmarks: Landmark3D[], _faceData?: any, handedness?: 'Left' | 'Right') => {
      if (!landmarks || landmarks.length === 0) return;
      latestLandmarksRef.current = landmarks;
      if (handedness) setLastHandedness(handedness);

      const result = globalRecognizerOrchestrator.processFrame(landmarks, handedness);
      setTelemetry(result.telemetry);
      setInferenceResult(result.inference);
      setDecoderResult(result.decoder);

      // Track rolling prediction history
      const pred = result.inference.predictedClass;
      setHistory((prev) => [pred, ...prev.slice(0, 9)]);

      // Log confirmations
      if (result.decoder.isConfirmedThisFrame) {
        const top3 = Object.entries(result.inference.probabilities)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([letter, prob]) => ({ letter, prob }));
        setConfirmLog((prev) =>
          [
            {
              ts: Date.now(),
              top3,
              lifecycleState: result.decoder.state,
              confirmed: true,
            },
            ...prev,
          ].slice(0, 10)
        );
      }
    },
    []
  );

  const captureCalibrationSample = () => {
    if (!latestLandmarksRef.current || latestLandmarksRef.current.length < 21) {
      alert('No hand landmarks detected. Hold your hand in front of the camera first.');
      return;
    }
    const sample: LocalCalibrationSample = {
      letter: calibrationLetter,
      timestamp: Date.now(),
      landmarks: latestLandmarksRef.current.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z || 0 })),
    };
    const updated = [sample, ...capturedSamples];
    setCapturedSamples(updated);
    try {
      localStorage.setItem('signquest_calibration_samples', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const clearCalibrationSamples = () => {
    if (confirm('Clear all local calibration samples?')) {
      setCapturedSamples([]);
      localStorage.removeItem('signquest_calibration_samples');
    }
  };

  const exportCalibrationData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(capturedSamples, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `signquest_calibration_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // ── Derived display values ─────────────────────────────────────────────────
  const top5: { letter: string; probability: number }[] = inferenceResult?.topPredictions ?? [];
  const winnerLetter = inferenceResult?.predictedClass ?? '—';
  const winnerProb = inferenceResult?.confidence ?? 0;
  const isUncertain = inferenceResult?.isUncertain ?? false;
  const margin = inferenceResult?.margin ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-mono"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <FlaskConical size={18} className="text-cyan-400" />
        <h1 className="font-bold tracking-widest text-cyan-300 text-sm uppercase">
          Recognition Lab & Studio
        </h1>

        <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 ml-4">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
              activeTab === 'diagnostics' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('calibration')}
            className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
              activeTab === 'calibration' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Train Your Hand
          </button>
        </div>

        <span className="ml-auto text-xs text-emerald-400 font-mono flex items-center gap-1">
          <Sparkles size={12} />
          {telemetry?.modelVersion ?? 'Real ASL Trained Model'}
        </span>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row flex-1 gap-0 overflow-hidden">
        {/* ── LEFT: Camera & Sensor Overlay ─────────────────────────────── */}
        <div className="lg:w-[480px] flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 border-b border-slate-700 text-xs font-mono">
            <span className="text-slate-400">
              Hand: <span className="text-white font-bold">{lastHandedness}</span>
            </span>
            <button
              onClick={() => setDemoMode((v) => !v)}
              className={`px-2.5 py-0.5 rounded text-xs font-bold transition-colors ${
                demoMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              }`}
            >
              {demoMode ? 'SIMULATED' : 'LIVE WEBCAM'}
            </button>
          </div>

          <div className="flex-1 relative">
            <WebcamHandTracker
              targetSignId={selectedLetter ?? 'A'}
              evaluation={null}
              onLandmarks={handleLandmarks}
              demoMode={demoMode}
              onEnableDemoMode={() => setDemoMode(true)}
            />
          </div>

          {/* Telemetry Footer */}
          <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <LifecycleBadge state={telemetry?.lifecycleState ?? 'IDLE'} />
              <span className="text-xs font-mono text-slate-400">
                {telemetry?.fps ?? '—'} FPS · {telemetry?.inferenceLatencyMs ?? '—'}ms latency
              </span>
            </div>

            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-75"
                style={{ width: `${((telemetry?.holdProgress ?? 0) * 100).toFixed(0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Hold Progress</span>
              <span>{((telemetry?.holdProgress ?? 0) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
          {activeTab === 'diagnostics' ? (
            <>
              {/* Prediction HUD */}
              <div className="flex items-center gap-6 bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div
                  className={`text-8xl font-black font-mono leading-none transition-colors ${
                    isUncertain
                      ? 'text-amber-400'
                      : telemetry?.isConfirmed
                      ? 'text-emerald-400'
                      : 'text-white'
                  }`}
                >
                  {winnerLetter}
                </div>

                <div className="flex flex-col gap-1 text-sm font-mono">
                  <div className="text-slate-400 text-xs uppercase tracking-widest flex items-center gap-2">
                    Model Prediction
                    {isUncertain && (
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40">
                        UNCERTAIN
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {(winnerProb * 100).toFixed(1)}%
                    <span className="text-xs text-slate-500 font-normal ml-2">
                      (Margin: +{(margin * 100).toFixed(1)}%)
                    </span>
                  </div>

                  {selectedLetter && (
                    <div className="mt-2 text-xs text-slate-400">
                      Target <span className="text-cyan-300 font-bold">{selectedLetter}</span>: {(
                        (telemetry?.targetConfidence ?? 0) * 100
                      ).toFixed(1)}%
                    </div>
                  )}
                </div>

                <div className="ml-auto flex flex-col gap-1 text-right text-xs font-mono text-slate-500">
                  <div>Motion: <span className="text-slate-300 capitalize">{telemetry?.motionState ?? '—'}</span></div>
                  <div>Velocity: {telemetry?.motionVelocity.toFixed(4) ?? '—'}</div>
                  <div>Buffer Fill: {((telemetry?.bufferFillRatio ?? 0) * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Prediction History Queue */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">
                  Prediction History (Rolling Frames)
                </div>
                <div className="flex items-center gap-2 font-mono text-sm">
                  {history.length > 0 ? (
                    history.map((letter, i) => (
                      <span
                        key={i}
                        className={`px-2.5 py-1 rounded font-bold ${
                          i === 0
                            ? 'bg-cyan-500 text-slate-950 text-base scale-105'
                            : letter === 'UNCERTAIN'
                            ? 'bg-slate-800 text-amber-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {letter === 'UNCERTAIN' ? '?' : letter}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-600 text-xs">Waiting for signs...</span>
                  )}
                </div>
              </div>

              {/* Top-5 Probability Bars */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-3">
                  Top Predictions (Real-Data Softmax Posterios)
                </div>
                <div className="space-y-2">
                  {top5.length > 0 ? (
                    top5.map((p) => (
                      <ProbBar
                        key={p.letter}
                        letter={p.letter}
                        prob={p.probability}
                        highlight={p.letter === winnerLetter && !isUncertain}
                      />
                    ))
                  ) : (
                    <p className="text-slate-600 text-xs font-mono">Present hand to webcam…</p>
                  )}
                </div>
              </div>

              {/* Monitor Target Letter Selector */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                    Monitor Target Letter
                  </div>
                  <Info size={12} className="text-slate-600" />
                  <span className="text-xs text-slate-600 font-mono">
                    (Used only for targetConfidence telemetry — no prediction forcing)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedLetter(null)}
                    className={`w-8 h-8 rounded text-xs font-mono font-bold transition-colors ${
                      selectedLetter === null
                        ? 'bg-slate-400 text-slate-900'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    —
                  </button>
                  {ALPHABET.map((letter) => (
                    <button
                      key={letter}
                      onClick={() => setSelectedLetter((prev) => (prev === letter ? null : letter))}
                      className={`w-8 h-8 rounded text-xs font-mono font-bold transition-colors ${
                        selectedLetter === letter
                          ? 'bg-cyan-500 text-slate-900 font-black'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirmation Log */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                    Confirmation Log (Temporal Decoder Events)
                  </div>
                  <button
                    onClick={() => setConfirmLog([])}
                    className="text-xs font-mono text-slate-500 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
                {confirmLog.length === 0 ? (
                  <p className="text-xs font-mono text-slate-600">
                    No confirmed events yet. Hold a letter steady until the lifecycle triggers CONFIRMED.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {confirmLog.map((snap, i) => (
                      <div
                        key={`${snap.ts}-${i}`}
                        className="flex items-start gap-3 text-xs font-mono bg-slate-800/80 rounded p-2"
                      >
                        <span className="text-emerald-400 font-bold text-base mt-0.5">
                          {snap.top3[0]?.letter ?? '?'}
                        </span>
                        <div className="flex-1">
                          <div className="text-slate-400 text-[10px]">
                            {new Date(snap.ts).toLocaleTimeString()} · Confirmed via Temporal Hysteresis
                          </div>
                          <div className="text-slate-300">
                            {snap.top3.map((p) => `${p.letter} ${(p.prob * 100).toFixed(0)}%`).join(' · ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Calibration & Hand Training Studio */
            <div className="flex flex-col gap-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2 text-amber-300 font-bold font-mono text-sm">
                  <Sliders size={18} />
                  Train Your Hand (Local Calibration)
                </div>
                <p className="text-xs text-slate-400 font-mono mb-4">
                  Capture real landmark samples from your personal webcam. Numerical coordinates are stored
                  locally on your device for calibration, domain-shift analysis, and personal testing.
                </p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {ALPHABET.map((letter) => {
                    const count = capturedSamples.filter((s) => s.letter === letter).length;
                    return (
                      <button
                        key={letter}
                        onClick={() => setCalibrationLetter(letter)}
                        className={`w-9 h-9 rounded text-xs font-mono font-bold flex flex-col items-center justify-center transition-all ${
                          calibrationLetter === letter
                            ? 'bg-amber-500 text-slate-950'
                            : count > 0
                            ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        <span>{letter}</span>
                        {count > 0 && <span className="text-[9px] opacity-75">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-400 uppercase font-mono">Current Target</div>
                    <div className="text-2xl font-black text-amber-300 font-mono">
                      Form the &quot;{calibrationLetter}&quot; sign and hold steady
                    </div>
                  </div>
                  <button
                    onClick={captureCalibrationSample}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    <Camera size={16} />
                    Capture Sample
                  </button>
                </div>
              </div>

              {/* Calibration Stats & Actions */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3 font-mono text-xs text-slate-400">
                  <span>Total Captured Samples: <strong className="text-white">{capturedSamples.length}</strong></span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportCalibrationData}
                      disabled={capturedSamples.length === 0}
                      className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
                    >
                      <Download size={14} /> Export JSON
                    </button>
                    <button
                      onClick={clearCalibrationSamples}
                      disabled={capturedSamples.length === 0}
                      className="flex items-center gap-1 text-rose-400 hover:text-rose-300 disabled:opacity-40 ml-3"
                    >
                      <Trash2 size={14} /> Clear
                    </button>
                  </div>
                </div>

                {capturedSamples.length === 0 ? (
                  <p className="text-xs font-mono text-slate-600">No personal calibration samples captured yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-xs">
                    {capturedSamples.slice(0, 15).map((s, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-800/60 px-3 py-1.5 rounded">
                        <span className="text-amber-300 font-bold">Letter {s.letter}</span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(s.timestamp).toLocaleTimeString()} · 21 joints recorded
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
