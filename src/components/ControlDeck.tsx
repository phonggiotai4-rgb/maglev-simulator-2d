/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PhysicsParams, SimulationState, CameraMode, BrakeMode } from '../types/physics.ts';
import { PRESETS } from '../physics/presets.ts';
import { OscilloscopeGraph } from './OscilloscopeGraph.tsx';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  ShieldAlert,
  Layers,
  Sparkles,
  Sliders,
  Activity,
  Gauge,
  Check,
} from 'lucide-react';

interface ControlDeckProps {
  state: SimulationState;
  params: PhysicsParams;
  isPlaying: boolean;
  timeScale: number;
  cameraMode: CameraMode;
  showFluxLines: boolean;
  showAerodynamics: boolean;
  showForceVectors: boolean;
  isMuted: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onSetTimeScale: (scale: number) => void;
  onSetCameraMode: (mode: CameraMode) => void;
  onToggleFluxLines: () => void;
  onToggleAerodynamics: () => void;
  onToggleForceVectors: () => void;
  onToggleMute: () => void;
  onSetThrottle: (val: number) => void;
  onSetBrakeMode: (mode: BrakeMode) => void;
  onUpdateParams: (newParams: Partial<PhysicsParams>) => void;
  onLoadPreset: (presetId: string) => void;
  onOpenCrossSection: () => void;
  onOpenChallenge: () => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  state,
  params,
  isPlaying,
  timeScale,
  cameraMode,
  showFluxLines,
  showAerodynamics,
  showForceVectors,
  onTogglePlay,
  onStepForward,
  onReset,
  onSetTimeScale,
  onSetCameraMode,
  onToggleFluxLines,
  onToggleAerodynamics,
  onToggleForceVectors,
  onSetThrottle,
  onSetBrakeMode,
  onUpdateParams,
  onLoadPreset,
  onOpenCrossSection,
  onOpenChallenge,
}) => {
  // Main view navigation: 'cockpit' (Buồng lái & Kịch bản) | 'physics' (Thông số chi tiết) | 'oscilloscope' (Biểu đồ)
  const [activeView, setActiveView] = useState<'cockpit' | 'physics' | 'oscilloscope'>('cockpit');

  return (
    <div className="flex flex-col bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-xs font-sans">
      {/* 1. UNIVERSAL DRIVING BAR (Always accessible, high ergonomic touch targets) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-slate-950/80 border-b border-slate-800">
        {/* Left: Playback & Step Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold font-mono text-xs transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
            }`}
            title={isPlaying ? 'Tạm dừng (Space)' : 'Chạy tiếp (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isPlaying ? 'Tạm dừng' : 'Chạy tiếp'}</span>
          </button>

          <button
            onClick={onStepForward}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            title="Bước tới 1 khung hình"
          >
            <StepForward className="w-4 h-4" />
          </button>

          <button
            onClick={onReset}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            title="Đặt lại từ đầu (R)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Speed multiplier toggle */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px]">
            {[1, 2, 4].map((scale) => (
              <button
                key={scale}
                onClick={() => onSetTimeScale(scale)}
                className={`px-2 py-1 rounded-md transition-colors ${
                  timeScale === scale
                    ? 'bg-sky-500/20 text-sky-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {scale}x
              </button>
            ))}
          </div>
        </div>

        {/* Center: Tactile LSM Throttle Slider & Snap Buttons */}
        <div
          data-tour="throttle-control"
          className="flex-1 min-w-[280px] max-w-xl flex items-center gap-3 bg-slate-900/90 border border-slate-800/90 px-3 py-2 rounded-xl"
        >
          <div className="text-[11px] font-mono leading-tight whitespace-nowrap">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider">Tay Ga LSM</span>
            <span
              className={`font-bold text-sm tabular-nums ${
                state.throttle > 0
                  ? 'text-sky-400'
                  : state.throttle < 0
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              {state.throttle > 0
                ? `+${Math.round(state.throttle * 100)}%`
                : `${Math.round(state.throttle * 100)}%`}
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-1">
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={state.throttle}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onSetThrottle(val);
                if (val < 0) onSetBrakeMode('REGEN');
                else onSetBrakeMode('NONE');
              }}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 transition-all"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>Phanh từ -100%</span>
              <span>Thả trôi 0%</span>
              <span>Tăng tốc +100%</span>
            </div>
          </div>

          {/* Quick Snap Throttle Buttons */}
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button
              onClick={() => {
                onSetThrottle(0);
                onSetBrakeMode('NONE');
              }}
              className={`px-2 py-1 rounded transition-colors ${
                state.throttle === 0
                  ? 'bg-slate-700 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Về 0% (Thả trôi)"
            >
              0%
            </button>
            <button
              onClick={() => {
                onSetThrottle(0.5);
                onSetBrakeMode('NONE');
              }}
              className={`px-2 py-1 rounded transition-colors ${
                state.throttle === 0.5
                  ? 'bg-sky-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Chạy đều 50% ga"
            >
              50%
            </button>
            <button
              onClick={() => {
                onSetThrottle(1.0);
                onSetBrakeMode('NONE');
              }}
              className={`px-2 py-1 rounded transition-colors ${
                state.throttle === 1.0
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-sky-950/80 text-sky-300 border border-sky-800/60 hover:bg-sky-900'
              }`}
              title="Tăng tốc tối đa (100%)"
            >
              100%
            </button>
          </div>
        </div>

        {/* Right: Emergency Stop & Mode Switcher */}
        <div className="flex items-center gap-3">
          {/* Emergency Stop Button */}
          <button
            onClick={() => {
              if (state.brakeMode === 'EMERGENCY') {
                onSetBrakeMode('NONE');
                onSetThrottle(0);
              } else {
                onSetBrakeMode('EMERGENCY');
                onSetThrottle(-1.0);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold font-mono text-xs transition-all ${
              state.brakeMode === 'EMERGENCY'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse'
                : 'bg-red-950/70 hover:bg-red-900/90 border border-red-800/80 text-red-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{state.brakeMode === 'EMERGENCY' ? 'Hủy Phanh' : 'Phanh Khẩn Cấp'}</span>
          </button>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs">
            <button
              onClick={() => setActiveView('cockpit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeView === 'cockpit'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Buồng Lái</span>
            </button>

            <button
              onClick={() => setActiveView('physics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeView === 'physics'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Thông Số Vật Lý</span>
            </button>

            <button
              data-tour="oscilloscope-tab"
              onClick={() => setActiveView('oscilloscope')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeView === 'oscilloscope'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Đồ Thị Vi Sai</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TAB BODY */}
      <div className="p-3 bg-slate-900/40">
        {/* VIEW 1: COCKPIT & VEHICLE PRESETS */}
        {activeView === 'cockpit' && (
          <div className="space-y-3">
            {/* Presets Grid: Clean 5 cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                  Chọn Kịch Bản Tàu & Tuyến Chạy Mẫu:
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Bấm để chuyển đổi tức thì cấu hình vật lý
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {PRESETS.map((p) => {
                  const isCurrent =
                    p.params.levitationMode === params.levitationMode &&
                    Math.abs(p.params.mass - params.mass) < 1000;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onLoadPreset(p.id)}
                      className={`text-left p-2.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-sky-950/60 border-sky-500 shadow-md ring-1 ring-sky-500/30'
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{p.name}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-sky-400" />}
                      </div>
                      <div className="text-[10px] font-mono text-sky-400/90 mt-0.5">
                        {p.category}
                      </div>
                      <div className="text-[10px] font-mono text-amber-400 font-semibold mt-1">
                        {p.maxSpeedLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Viewport & Visual Layers Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              {/* Camera Modes */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Góc Nhìn Camera:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      ['FOLLOW', 'Bám Sát Tàu'],
                      ['BOGIE', 'Gầm & Khe Hở'],
                      ['TRACKSIDE', 'Trạm Quan Sát'],
                      ['OVERVIEW', 'Toàn Tuyến'],
                    ] as [CameraMode, string][]
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => onSetCameraMode(mode)}
                      className={`py-2 px-2 text-center text-xs font-mono rounded-lg transition-colors ${
                        cameraMode === mode
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-700/60 font-bold'
                          : 'bg-slate-950/50 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visualization Layers */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Hiển Thị Trực Quan Vật Lý:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={onToggleFluxLines}
                    className={`py-2 px-2 text-center text-xs font-mono rounded-lg border transition-colors ${
                      showFluxLines
                        ? 'bg-sky-500/20 border-sky-600/70 text-sky-400 font-bold'
                        : 'bg-slate-950/50 border-slate-800 text-slate-500'
                    }`}
                  >
                    Đường Sức Từ (B)
                  </button>
                  <button
                    onClick={onToggleAerodynamics}
                    className={`py-2 px-2 text-center text-xs font-mono rounded-lg border transition-colors ${
                      showAerodynamics
                        ? 'bg-sky-500/20 border-sky-600/70 text-sky-400 font-bold'
                        : 'bg-slate-950/50 border-slate-800 text-slate-500'
                    }`}
                  >
                    Khí Động Học
                  </button>
                  <button
                    onClick={onToggleForceVectors}
                    className={`py-2 px-2 text-center text-xs font-mono rounded-lg border transition-colors ${
                      showForceVectors
                        ? 'bg-sky-500/20 border-sky-600/70 text-sky-400 font-bold'
                        : 'bg-slate-950/50 border-slate-800 text-slate-500'
                    }`}
                  >
                    Véc-Tơ Lực
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions (Bogie cross section & challenges) */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
              <button
                onClick={onOpenCrossSection}
                className="flex items-center gap-2 px-4 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-colors text-xs font-mono"
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Xem Mặt Cắt Ngang Bogie & Cơ Chế Hoạt Động</span>
              </button>

              <button
                onClick={onOpenChallenge}
                className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow transition-all text-xs font-mono"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Thử Thách Lái Tàu & Làm Chủ Vật Lý</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: PHYSICS PARAMETERS TUNER */}
        {activeView === 'physics' && (
          <div data-tour="physics-tabs" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Levitation & PID Stability */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/90 flex flex-col gap-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                  1. Hệ Thống Nâng & PID
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                  {params.levitationMode}
                </span>
              </div>

              {/* Mode Selector */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                  Công Nghệ Đệm Từ
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdateParams({ levitationMode: 'EMS', targetGap: 14 })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                      params.levitationMode === 'EMS'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    EMS (Hút Transrapid)
                  </button>
                  <button
                    onClick={() => onUpdateParams({ levitationMode: 'EDS', targetGap: 100 })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                      params.levitationMode === 'EDS'
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    EDS (Đẩy SCMaglev)
                  </button>
                </div>
              </div>

              {/* Target Air Gap */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Khe hở mục tiêu (y)</span>
                  <span className="text-cyan-400 font-bold tabular-nums">
                    {params.targetGap} mm
                  </span>
                </div>
                <input
                  type="range"
                  min={params.levitationMode === 'EMS' ? 5 : 40}
                  max={params.levitationMode === 'EMS' ? 30 : 160}
                  step="1"
                  value={params.targetGap}
                  onChange={(e) => onUpdateParams({ targetGap: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* PID Kp */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Hệ số tỷ lệ (Kp - Phản xạ nhanh)</span>
                  <span className="text-cyan-400 font-bold tabular-nums">{params.kp}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="800"
                  step="10"
                  value={params.kp}
                  onChange={(e) => onUpdateParams({ kp: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* PID Kd */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Hệ số vi phân (Kd - Giảm rung)</span>
                  <span className="text-cyan-400 font-bold tabular-nums">{params.kd}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  value={params.kd}
                  onChange={(e) => onUpdateParams({ kd: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Magnetic field B */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Từ trường cuộn gầm (B)</span>
                  <span className="text-cyan-400 font-bold tabular-nums">
                    {params.bogieMagneticField.toFixed(1)} Tesla
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={params.bogieMagneticField}
                  onChange={(e) =>
                    onUpdateParams({ bogieMagneticField: parseFloat(e.target.value) })
                  }
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>

            {/* Column 2: LSM Propulsion & Train Body */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/90 flex flex-col gap-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                  2. Động Cơ LSM & Đoàn Tàu
                </span>
                <span className="text-[10px] font-mono text-sky-400 font-semibold">
                  {(params.mass / 1000).toFixed(0)} Tấn
                </span>
              </div>

              {/* Max Thrust */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Lực đẩy tối đa</span>
                  <span className="text-sky-400 font-bold tabular-nums">
                    {(params.maxThrust / 1000).toFixed(0)} kN
                  </span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="400000"
                  step="10000"
                  value={params.maxThrust}
                  onChange={(e) => onUpdateParams({ maxThrust: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              {/* Mass */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Khối lượng đoàn tàu</span>
                  <span className="text-sky-400 font-bold tabular-nums">
                    {(params.mass / 1000).toFixed(0)} Tấn
                  </span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="120000"
                  step="2000"
                  value={params.mass}
                  onChange={(e) => onUpdateParams({ mass: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              {/* Drag Cd */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Hệ số cản khí động (Cd)</span>
                  <span className="text-sky-400 font-bold tabular-nums">
                    {params.cd.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.12"
                  max="0.45"
                  step="0.01"
                  value={params.cd}
                  onChange={(e) => onUpdateParams({ cd: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              {/* Carriages */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Số toa tàu</span>
                  <span className="text-sky-400 font-bold tabular-nums">
                    {params.carriages} Toa
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={params.carriages}
                  onChange={(e) => onUpdateParams({ carriages: parseInt(e.target.value, 10) })}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
                />
              </div>
            </div>

            {/* Column 3: Environment & Incline Grade */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/90 flex flex-col gap-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                  3. Môi Trường & Tuyến Ray
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  {params.trackGrade !== 0 ? `Dốc ${params.trackGrade}%` : 'Bằng phẳng'}
                </span>
              </div>

              {/* Weather Selector */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                  Điều Kiện Thời Tiết & Khí Động
                </label>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
                  <button
                    onClick={() => onUpdateParams({ weather: 'CLEAR' })}
                    className={`py-1.5 rounded-lg border text-center transition-colors ${
                      params.weather === 'CLEAR'
                        ? 'bg-slate-700 text-white font-bold border-slate-500'
                        : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                    }`}
                  >
                    ☀️ Quang đãng
                  </button>
                  <button
                    onClick={() => onUpdateParams({ weather: 'RAIN' })}
                    className={`py-1.5 rounded-lg border text-center transition-colors ${
                      params.weather === 'RAIN'
                        ? 'bg-blue-600 text-white font-bold border-blue-400 shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                    }`}
                  >
                    🌧️ Mưa (+8%)
                  </button>
                  <button
                    onClick={() => onUpdateParams({ weather: 'SNOW' })}
                    className={`py-1.5 rounded-lg border text-center transition-colors ${
                      params.weather === 'SNOW'
                        ? 'bg-indigo-600 text-white font-bold border-indigo-400 shadow'
                        : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                    }`}
                  >
                    ❄️ Tuyết (+6%)
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight font-sans">
                  {params.weather === 'RAIN'
                    ? 'Mưa rào: Va chạm hạt nước tăng cản gió 8%, ray ướt giảm 15% ma sát phanh cơ.'
                    : params.weather === 'SNOW'
                    ? 'Bão tuyết: Không khí lạnh tăng cản gió 6%, ray đóng băng giảm 28% độ bám guốc trượt.'
                    : 'Thời tiết tiêu chuẩn lý tưởng, không có tác động ngoại cảnh.'}
                </p>
              </div>

              {/* Air Density rho & Hyperloop quick switch */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Mật độ không khí (ρ)</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {params.airDensity.toFixed(2)} kg/m³
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.30"
                  step="0.05"
                  value={params.airDensity}
                  onChange={(e) => onUpdateParams({ airDensity: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <button
                    onClick={() => onUpdateParams({ airDensity: 0.05 })}
                    className="text-sky-400 hover:underline"
                  >
                    Bật Chân Không (Hyperloop)
                  </button>
                  <button
                    onClick={() => onUpdateParams({ airDensity: 1.225 })}
                    className="text-slate-400 hover:underline"
                  >
                    Khí Quyển Thường
                  </button>
                </div>
              </div>

              {/* Wind Speed */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Tốc độ gió</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {params.windSpeed > 0
                      ? `+${params.windSpeed} m/s (Xuôi)`
                      : params.windSpeed < 0
                      ? `${params.windSpeed} m/s (Ngược)`
                      : '0 m/s'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="2"
                  value={params.windSpeed}
                  onChange={(e) => onUpdateParams({ windSpeed: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              {/* Track Incline Grade */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Độ dốc đường ray</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {params.trackGrade > 0
                      ? `+${params.trackGrade}% (Lên dốc)`
                      : params.trackGrade < 0
                      ? `${params.trackGrade}% (Xuống dốc)`
                      : '0% (Phẳng)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="0.5"
                  value={params.trackGrade}
                  onChange={(e) => onUpdateParams({ trackGrade: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
                />
              </div>

              {/* Skid Friction */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Hệ số ma sát guốc (μ)</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {params.frictionCoefficient.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.04"
                  max="0.35"
                  step="0.02"
                  value={params.frictionCoefficient}
                  onChange={(e) =>
                    onUpdateParams({ frictionCoefficient: parseFloat(e.target.value) })
                  }
                  className="w-full h-2 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: LIVE OSCILLOSCOPE GRAPH */}
        {activeView === 'oscilloscope' && (
          <div className="w-full">
            <OscilloscopeGraph state={state} isPlaying={isPlaying} />
          </div>
        )}
      </div>
    </div>
  );
};
