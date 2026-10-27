/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { PhysicsParams, SimulationState, CameraMode, BrakeMode, ChallengeScenario, WeatherType } from './types/physics.ts';
import { PRESETS } from './physics/presets.ts';
import { createInitialState, stepSimulation } from './physics/maglevEngine.ts';
import { soundFx } from './audio/soundEffects.ts';
import { SimulationCanvas } from './components/SimulationCanvas.tsx';
import { TelemetryOverlay } from './components/TelemetryOverlay.tsx';
import { ControlDeck } from './components/ControlDeck.tsx';
import { BogieCrossSectionModal } from './components/BogieCrossSectionModal.tsx';
import { ChallengeModeModal } from './components/ChallengeModeModal.tsx';
import { InteractiveTour } from './components/InteractiveTour.tsx';
import { HotspotsToggle, HotspotsOverlay } from './components/InteractiveHotspots.tsx';
import {
  Trophy,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

export default function App() {
  // Primary simulation physics parameters
  const [params, setParams] = useState<PhysicsParams>(PRESETS[0].params);
  const paramsRef = useRef<PhysicsParams>(params);
  paramsRef.current = params;

  // Live simulation state
  const [state, setState] = useState<SimulationState>(() => createInitialState(params));
  const stateRef = useRef<SimulationState>(state);
  stateRef.current = state;

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const isPlayingRef = useRef<boolean>(true);
  isPlayingRef.current = isPlaying;

  const [timeScale, setTimeScale] = useState<number>(1.0);
  const timeScaleRef = useRef<number>(1.0);
  timeScaleRef.current = timeScale;

  // View & UI Options
  const [cameraMode, setCameraMode] = useState<CameraMode>('FOLLOW');
  const [showFluxLines, setShowFluxLines] = useState<boolean>(true);
  const [showAerodynamics, setShowAerodynamics] = useState<boolean>(true);
  const [showForceVectors, setShowForceVectors] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Modals & Interactive Guidance
  const [isCrossSectionOpen, setIsCrossSectionOpen] = useState<boolean>(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [showHotspots, setShowHotspots] = useState<boolean>(false);

  // Active Challenge State
  const [activeChallenge, setActiveChallenge] = useState<ChallengeScenario | null>(null);
  const [challengeProgress, setChallengeProgress] = useState<number>(0);
  const [challengeMessage, setChallengeMessage] = useState<string>('');
  const [challengeCompleted, setChallengeCompleted] = useState<boolean>(false);
  const [challengeFailed, setChallengeFailed] = useState<boolean>(false);
  const challengeStartTimeRef = useRef<number>(0);

  // Simulation tick loop
  useEffect(() => {
    let lastTime = performance.now();
    let animId: number;

    const loop = (currentTime: number) => {
      const deltaSec = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (isPlayingRef.current) {
        // Execute physics engine step. Throttle/brake are UI-owned, so they are
        // re-applied from the latest rendered state to avoid a stale frame
        // clobbering a control the user just moved.
        const dtEffective = deltaSec * timeScaleRef.current;
        const nextState = stepSimulation(stateRef.current, paramsRef.current, dtEffective);
        stateRef.current = nextState;
        setState((prev) => {
          const merged = { ...nextState, throttle: prev.throttle, brakeMode: prev.brakeMode };
          stateRef.current = merged;
          return merged;
        });

        // Update Web Audio synthesizer
        const isGapCritical = nextState.y < paramsRef.current.targetGap * 0.35 || nextState.y > paramsRef.current.targetGap * 2.2;
        soundFx.updateAudio(
          nextState.v,
          nextState.throttle,
          nextState.contact,
          isGapCritical,
          true
        );

        // Evaluate active challenge if any
        if (activeChallenge && !challengeCompleted && !challengeFailed) {
          const timeInChallenge = nextState.time - challengeStartTimeRef.current;
          let failedNow = false;

          if (activeChallenge.checkFailure) {
            const failCheck = activeChallenge.checkFailure(nextState);
            if (failCheck.failed) {
              failedNow = true;
              setChallengeFailed(true);
              setChallengeMessage(failCheck.reason);
              soundFx.playWarningBeep();
            }
          }

          if (!failedNow) {
            const succCheck = activeChallenge.checkSuccess(nextState, timeInChallenge);
            setChallengeProgress(succCheck.progress);
            setChallengeMessage(succCheck.message);
            if (succCheck.success) {
              setChallengeCompleted(true);
              soundFx.playClick();
            }
          }
        }
      } else {
        soundFx.updateAudio(0, 0, false, false, false);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      soundFx.updateAudio(0, 0, false, false, false);
    };
  }, [activeChallenge, challengeCompleted, challengeFailed]);

  // Handlers
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
    soundFx.playClick();
  }, []);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    const next = stepSimulation(stateRef.current, paramsRef.current, 0.02);
    stateRef.current = next;
    setState(next);
    soundFx.playClick();
  }, []);

  const handleReset = useCallback(() => {
    const fresh = createInitialState(paramsRef.current);
    stateRef.current = fresh;
    setState(fresh);
    if (activeChallenge) {
      challengeStartTimeRef.current = 0;
      activeChallenge.reset?.();
      setChallengeCompleted(false);
      setChallengeFailed(false);
      setChallengeProgress(0);
      setChallengeMessage('Bắt đầu thử thách...');
    }
    soundFx.playClick();
  }, [activeChallenge]);

  const handleUpdateParams = useCallback((newParams: Partial<PhysicsParams>) => {
    setParams((prev) => {
      const merged = { ...prev, ...newParams };
      paramsRef.current = merged;
      return merged;
    });
  }, []);

  const handleLoadPreset = useCallback((presetId: string) => {
    const found = PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setParams(found.params);
    paramsRef.current = found.params;
    const fresh = createInitialState(found.params);
    if (found.initialState) {
      Object.assign(fresh, found.initialState);
    }
    stateRef.current = fresh;
    setState(fresh);
    setActiveChallenge(null);
    setChallengeCompleted(false);
    setChallengeFailed(false);
    setChallengeProgress(0);
    soundFx.playClick();
  }, []);

  const handleSetThrottle = useCallback((val: number) => {
    setState((prev) => ({ ...prev, throttle: val }));
  }, []);

  const handleSetBrakeMode = useCallback((mode: BrakeMode) => {
    setState((prev) => ({ ...prev, brakeMode: mode }));
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleCycleWeather = useCallback(() => {
    setParams((prev) => {
      const nextWeather: WeatherType =
        prev.weather === 'CLEAR' ? 'RAIN' : prev.weather === 'RAIN' ? 'SNOW' : 'CLEAR';
      const merged = { ...prev, weather: nextWeather };
      paramsRef.current = merged;
      return merged;
    });
    soundFx.playClick();
  }, []);

  // Start a challenge
  const handleSelectChallenge = useCallback((challenge: ChallengeScenario) => {
    setActiveChallenge(challenge);
    setChallengeCompleted(false);
    setChallengeFailed(false);
    setChallengeProgress(0);
    setChallengeMessage('Đang khởi động thử thách...');

    // Always build the challenge on its own base preset so the result does not
    // depend on whichever preset the user happened to be running before.
    const base = PRESETS.find((p) => p.id === challenge.basePresetId)?.params ?? paramsRef.current;
    const merged = { ...base, ...challenge.initialParams };
    setParams(merged);
    paramsRef.current = merged;

    const fresh = createInitialState(merged);
    if (challenge.initialState) {
      Object.assign(fresh, challenge.initialState);
    }
    challenge.reset?.();
    challengeStartTimeRef.current = 0;
    stateRef.current = fresh;
    setState(fresh);
    setIsPlaying(true);
    soundFx.playClick();
  }, []);

  const handleStopChallenge = useCallback(() => {
    setActiveChallenge(null);
    setChallengeCompleted(false);
    setChallengeFailed(false);
    setChallengeProgress(0);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when focusing inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'KeyR') {
        handleReset();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          throttle: Math.min(1.0, Math.round((prev.throttle + 0.1) * 10) / 10),
          brakeMode: 'NONE',
        }));
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          throttle: Math.max(-1.0, Math.round((prev.throttle - 0.1) * 10) / 10),
          brakeMode: prev.throttle <= 0 ? 'REGEN' : 'NONE',
        }));
      } else if (e.code === 'KeyX') {
        setState((prev) => ({ ...prev, throttle: 0, brakeMode: 'NONE' }));
      } else if (e.code === 'KeyE') {
        setState((prev) => ({
          ...prev,
          brakeMode: prev.brakeMode === 'EMERGENCY' ? 'NONE' : 'EMERGENCY',
          throttle: -1.0,
        }));
      } else if (e.code === 'Digit1') {
        setCameraMode('FOLLOW');
      } else if (e.code === 'Digit2') {
        setCameraMode('BOGIE');
      } else if (e.code === 'Digit3') {
        setCameraMode('TRACKSIDE');
      } else if (e.code === 'Digit4') {
        setCameraMode('OVERVIEW');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleReset]);

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* 1. TOP BAR (Strict 3-zone contract, single line, no pill badges) */}
      <header className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-slate-800 bg-slate-950/90 shrink-0">
        {/* Zone 1: Brand Wordmark (HUIT University Logo & Project Title) */}
        <div className="flex items-center gap-3 min-w-0 shrink">
          <img
            src="/assets/aistudio/logo_e84a77d9.png"
            alt="Logo HUIT - Trường Đại học Công Thương TP. Hồ Chí Minh"
            className="w-9 h-9 rounded-full object-contain bg-white/10 p-0.5 border border-sky-400/40 shadow-sm shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="leading-tight text-sm md:text-base font-bold tracking-tight truncate">
              Phòng Thí Nghiệm & Mô Phỏng Tàu Đệm Từ 2D
            </span>
            <span className="text-[10px] font-mono font-semibold text-sky-400 tracking-wider uppercase truncate">
              HUIT • Maglev Physics Simulator
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation links to quick presets (hidden below xl, where the
            control-deck preset cards are the entry point) */}
        <nav className="hidden xl:flex flex-1 min-w-0 items-center justify-center gap-5 text-[11px] font-mono text-slate-400">
          <button
            onClick={() => handleLoadPreset('scmaglev_l0')}
            className="hover:text-sky-400 transition-colors whitespace-nowrap"
          >
            SCMaglev EDS
          </button>
          <button
            onClick={() => handleLoadPreset('shanghai_transrapid')}
            className="hover:text-cyan-400 transition-colors whitespace-nowrap"
          >
            Transrapid EMS
          </button>
          <button
            onClick={() => handleLoadPreset('hyperloop_vacuum')}
            className="hover:text-indigo-400 transition-colors whitespace-nowrap"
          >
            Hyperloop
          </button>
          <button
            onClick={() => handleLoadPreset('mountain_pass')}
            className="hover:text-emerald-400 transition-colors whitespace-nowrap"
          >
            Dốc 7%
          </button>
          <button
            onClick={() => setIsCrossSectionOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap text-slate-300"
          >
            Giải Thích Cơ Chế
          </button>
        </nav>

        {/* Zone 3: Primary Action CTA (1 primary action button) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            data-tour="challenges-btn"
            onClick={() => setIsChallengeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thử Thách Lái Tàu</span>
            <span className="sm:hidden">Thử Thách</span>
          </button>
        </div>
      </header>

      {/* ACTIVE CHALLENGE LIVE BANNER */}
      {activeChallenge && (
        <div className={`px-6 py-2.5 flex items-center justify-between gap-4 border-b text-xs font-mono shrink-0 transition-colors ${challengeCompleted ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200' : challengeFailed ? 'bg-red-950/80 border-red-700/60 text-red-200' : 'bg-sky-950/60 border-sky-800/60 text-sky-200'}`}>
          <div className="flex items-center gap-3">
            {challengeCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : challengeFailed ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Trophy className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            )}
            <div>
              <span className="font-bold uppercase tracking-wider">{activeChallenge.name}: </span>
              <span className="text-slate-300 font-sans">{challengeMessage}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Progress bar */}
            <div className="w-32 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-300 ${challengeCompleted ? 'bg-emerald-400' : challengeFailed ? 'bg-red-500' : 'bg-sky-400'}`}
                style={{ width: `${Math.min(100, Math.max(0, challengeProgress))}%` }}
              />
            </div>
            <span className="tabular-nums font-bold">{challengeProgress.toFixed(0)}%</span>

            <button
              onClick={handleReset}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 text-slate-300 text-[10px]"
              title="Thử lại từ đầu"
            >
              Thử lại
            </button>
            <button
              onClick={handleStopChallenge}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-700 text-slate-400 hover:text-white text-[10px]"
            >
              Thoát
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN WORKSPACE BODY: Split Interactive Stage & Control Deck */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* UPPER ZONE: Interactive 2D Simulation Stage */}
        <div data-tour="canvas-stage" className="relative flex-1 min-h-[340px] bg-slate-950 overflow-hidden">
          <SimulationCanvas
            state={state}
            params={params}
            cameraMode={cameraMode}
            showFluxLines={showFluxLines}
            showAerodynamics={showAerodynamics}
            showForceVectors={showForceVectors}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onCycleWeather={handleCycleWeather}
            topRightContent={
              <HotspotsToggle
                isVisible={showHotspots}
                onToggle={() => setShowHotspots((prev) => !prev)}
              />
            }
          />

          {/* Part labels must live in the stage, not in the floating toolbar */}
          <HotspotsOverlay isVisible={showHotspots} />

          {/* Top Left Floating Telemetry Cluster */}
          <div className="absolute top-4 left-4 z-10 pointer-events-auto">
            <TelemetryOverlay state={state} params={params} />
          </div>

          {/* Bottom Left Quick Tour Bar */}
          <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
            <button
              onClick={() => setIsTourOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-xl shadow-lg transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Chỉ Dẫn Trực Tiếp</span>
            </button>
          </div>
        </div>

        {/* LOWER ZONE: Unified Clean Control Deck */}
        <div className="min-h-0 max-h-[48vh] flex flex-col bg-slate-950 border-t border-slate-800">
          {/* Driving Controls, Physics Tuner & Oscilloscope */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
            <ControlDeck
              state={state}
              params={params}
              isPlaying={isPlaying}
              timeScale={timeScale}
              cameraMode={cameraMode}
              showFluxLines={showFluxLines}
              showAerodynamics={showAerodynamics}
              showForceVectors={showForceVectors}
              isMuted={isMuted}
              onTogglePlay={handleTogglePlay}
              onStepForward={handleStepForward}
              onReset={handleReset}
              onSetTimeScale={(scale) => setTimeScale(scale)}
              onSetCameraMode={(mode) => setCameraMode(mode)}
              onToggleFluxLines={() => setShowFluxLines((prev) => !prev)}
              onToggleAerodynamics={() => setShowAerodynamics((prev) => !prev)}
              onToggleForceVectors={() => setShowForceVectors((prev) => !prev)}
              onToggleMute={handleToggleMute}
              onSetThrottle={handleSetThrottle}
              onSetBrakeMode={handleSetBrakeMode}
              onUpdateParams={handleUpdateParams}
              onLoadPreset={handleLoadPreset}
              onOpenCrossSection={() => setIsCrossSectionOpen(true)}
              onOpenChallenge={() => setIsChallengeModalOpen(true)}
            />
          </div>

          {/* Flat Minimal Control Hint Line */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] font-mono text-slate-500 px-4 py-1 border-t border-slate-800/70 bg-slate-950">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Phím tắt:</span>
              <span>W / S Tăng/Giảm Ga</span>
              <span>·</span>
              <span>X Về 0</span>
              <span>·</span>
              <span>E Phanh Khẩn Cấp</span>
              <span>·</span>
              <span>Space Dừng/Chạy</span>
              <span>·</span>
              <span>R Đặt Lại</span>
              <span>·</span>
              <span>1-4 Đổi Góc Nhìn</span>
            </div>
            <div className="shrink-0">
              <span>Tích phân Euler bán ẩn 2D · ≥10 sub-step/khung · dt ≤ 100 ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MODALS */}
      <BogieCrossSectionModal
        isOpen={isCrossSectionOpen}
        onClose={() => setIsCrossSectionOpen(false)}
        currentMode={params.levitationMode}
        currentGap={state.y}
      />

      <ChallengeModeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        activeChallenge={activeChallenge}
        onSelectChallenge={handleSelectChallenge}
        onStopChallenge={handleStopChallenge}
      />

      {/* 4. INTERACTIVE STEP-BY-STEP ON-SCREEN TOUR */}
      <InteractiveTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </div>
  );
}
