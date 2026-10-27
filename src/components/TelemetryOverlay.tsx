/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PhysicsParams, SimulationState } from '../types/physics.ts';
import { Gauge, Zap, Navigation } from 'lucide-react';

interface TelemetryOverlayProps {
  state: SimulationState;
  params: PhysicsParams;
}

export const TelemetryOverlay: React.FC<TelemetryOverlayProps> = ({ state, params }) => {
  const speedKmh = Math.round(state.v * 3.6);
  const accelG = (state.a / 9.80665).toFixed(2);
  const gapMm = state.y.toFixed(1);
  const targetGapMm = params.targetGap;
  const gapDeviation = Math.abs(state.y - targetGapMm);
  const isGapSafe = state.y > 2 && gapDeviation < targetGapMm * 0.45;
  const onAuxWheels = state.contact && state.wheelsDeployed;

  const totalForceXKn = (state.forces.netX / 1000).toFixed(0);
  const liftKn = (state.forces.lift / 1000).toFixed(0);

  return (
    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/60 p-1.5 px-3 rounded-xl shadow-xl text-xs font-mono select-none">
      {/* 1. Speed readout */}
      <div data-tour="telemetry-speed" className="flex items-center gap-2 pr-3 border-r border-slate-800">
        <div className="w-6 h-6 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <Gauge className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold font-mono tabular-nums text-white tracking-tight">
            {speedKmh}
          </span>
          <span className="text-[11px] font-semibold text-sky-400">km/h</span>
          <span className="text-[10px] text-slate-400 ml-1 hidden sm:inline">
            ({accelG} G)
          </span>
        </div>
      </div>

      {/* 2. Air Gap readout */}
      <div data-tour="telemetry-gap" className="flex items-center gap-2 px-2 pr-3 border-r border-slate-800">
        <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Navigation className="w-3.5 h-3.5 rotate-90" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-lg font-bold font-mono tabular-nums tracking-tight ${
                onAuxWheels
                  ? 'text-amber-400'
                  : state.contact
                  ? 'text-red-400'
                  : isGapSafe
                  ? 'text-cyan-400'
                  : 'text-amber-400'
              }`}
            >
              {gapMm}
            </span>
            <span className="text-[11px] text-slate-400">mm</span>
          </div>

          <span
            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
              onAuxWheels
                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/70'
                : state.contact
                ? 'bg-red-950 text-red-400 border border-red-800/80'
                : isGapSafe
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                : 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
            }`}
          >
            {onAuxWheels ? 'Bánh phụ' : state.contact ? 'Chạm ray' : isGapSafe ? 'Ổn định' : 'Dao động'}
          </span>
        </div>
      </div>

      {/* 3. Motor Power (LSM) */}
      <div data-tour="telemetry-power" className="flex items-center gap-2 pl-2">
        <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Zap className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold font-mono tabular-nums text-white">
            {state.powerMW >= 0 ? `+${state.powerMW.toFixed(1)}` : state.powerMW.toFixed(1)}
          </span>
          <span className="text-[10px] text-amber-400 font-semibold">MW</span>
        </div>
      </div>

      {/* 4. Force snapshot (desktop only) */}
      <div className="hidden min-[1180px]:flex items-center gap-2 pl-3 border-l border-slate-800 text-[11px] text-slate-400">
        <span>Lực nâng: <strong className="text-cyan-400">{liftKn} kN</strong></span>
        <span>·</span>
        <span>Hợp lực: <strong className="text-emerald-400">{totalForceXKn} kN</strong></span>
      </div>
    </div>
  );
};
