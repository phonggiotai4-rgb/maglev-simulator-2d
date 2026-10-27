/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { SimulationState } from '../types/physics.ts';
import { Activity } from 'lucide-react';

interface DataPoint {
  time: number;
  speed: number;    // km/h
  gap: number;      // mm
  thrust: number;   // kN
  power: number;    // MW
}

interface OscilloscopeGraphProps {
  state: SimulationState;
  isPlaying: boolean;
}

export const OscilloscopeGraph: React.FC<OscilloscopeGraphProps> = ({ state, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<DataPoint[]>([]);
  const lastSampleTimeRef = useRef<number>(0);
  const [revision, setRevision] = useState<number>(0);

  const [visibleChannels, setVisibleChannels] = useState({
    speed: true,
    gap: true,
    thrust: true,
    power: true,
  });

  // Sample data at ~15 Hz
  useEffect(() => {
    if (!isPlaying) return;
    const now = state.time;

    // The simulation clock restarted (reset / preset change / retry): drop the
    // old trace instead of freezing the plot until time catches up again.
    if (now + 1e-6 < lastSampleTimeRef.current) {
      historyRef.current = [];
      lastSampleTimeRef.current = 0;
      setRevision((r) => r + 1);
    }

    if (now - lastSampleTimeRef.current >= 0.065) {
      lastSampleTimeRef.current = now;
      historyRef.current.push({
        time: now,
        speed: state.v * 3.6,
        gap: state.y,
        thrust: state.forces.thrust / 1000,
        power: state.powerMW,
      });

      // Keep max 250 data points (~16 seconds history)
      if (historyRef.current.length > 250) {
        historyRef.current.shift();
      }
    }
  }, [state, isPlaying]);

  // Render chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // Dark grid background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const rows = 4;
    for (let r = 1; r < rows; r++) {
      const y = (height / rows) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const data = historyRef.current;
    if (data.length < 2) {
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Đang thu thập tín hiệu vi sai...', width / 2 - 80, height / 2);
      return;
    }

    const padLeft = 8;
    const padRight = 8;
    const padTop = 14;
    const padBottom = 16;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Time window
    const firstT = data[0].time;
    const lastT = data[data.length - 1].time;
    const dt = Math.max(1, lastT - firstT);

    const getX = (t: number) => padLeft + ((t - firstT) / dt) * plotW;

    // Draw Channel helper
    const drawChannel = (
      getValue: (d: DataPoint) => number,
      maxScale: number,
      minScale: number,
      color: string
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = getX(d.time);
        const val = getValue(d);
        const norm = (val - minScale) / (maxScale - minScale || 1);
        const y = padTop + plotH * (1 - Math.max(0, Math.min(1, norm)));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    };

    // 1. Speed (0 - 700 km/h) - Sky Blue
    if (visibleChannels.speed) {
      drawChannel((d) => d.speed, 700, 0, '#38bdf8');
    }

    // 2. Air Gap (0 - 150 mm) - Cyan
    if (visibleChannels.gap) {
      drawChannel((d) => d.gap, 120, 0, '#06b6d4');
    }

    // 3. Thrust (-100 to 300 kN) - Emerald
    if (visibleChannels.thrust) {
      drawChannel((d) => d.thrust, 300, -100, '#10b981');
    }

    // 4. Power (-10 to 40 MW) - Amber
    if (visibleChannels.power) {
      drawChannel((d) => d.power, 40, -10, '#f59e0b');
    }
  }, [state.time, visibleChannels, revision]);

  const toggleChannel = (key: keyof typeof visibleChannels) => {
    setVisibleChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const clearHistory = () => {
    historyRef.current = [];
    lastSampleTimeRef.current = 0;
    setRevision((r) => r + 1);
  };

  return (
    <div className="flex flex-col bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs font-mono">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span>Biểu Đồ Dao Động Ký Thời Gian Thực (Oscilloscope)</span>
        </div>
        <button
          onClick={clearHistory}
          className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors px-2 py-0.5 bg-slate-800/80 rounded"
        >
          Xóa đồ thị
        </button>
      </div>

      {/* Canvas Plot */}
      <div className="relative w-full h-32 rounded bg-slate-950 overflow-hidden border border-slate-800/80">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Legend & Channel Toggles */}
      <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px]">
        <button
          onClick={() => toggleChannel('speed')}
          className={`flex items-center gap-1.5 transition-opacity ${visibleChannels.speed ? 'opacity-100 text-sky-400' : 'opacity-40 text-slate-500'}`}
        >
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span>Vận Tốc (0–700 km/h)</span>
        </button>

        <button
          onClick={() => toggleChannel('gap')}
          className={`flex items-center gap-1.5 transition-opacity ${visibleChannels.gap ? 'opacity-100 text-cyan-400' : 'opacity-40 text-slate-500'}`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Khe Hở (0–120 mm)</span>
        </button>

        <button
          onClick={() => toggleChannel('thrust')}
          className={`flex items-center gap-1.5 transition-opacity ${visibleChannels.thrust ? 'opacity-100 text-emerald-400' : 'opacity-40 text-slate-500'}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Lực Đẩy (-100–300 kN)</span>
        </button>

        <button
          onClick={() => toggleChannel('power')}
          className={`flex items-center gap-1.5 transition-opacity ${visibleChannels.power ? 'opacity-100 text-amber-400' : 'opacity-40 text-slate-500'}`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Công Suất (-10–40 MW)</span>
        </button>
      </div>
    </div>
  );
};
