/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Trophy, Play, Sparkles } from 'lucide-react';
import { ChallengeScenario, SimulationState } from '../types/physics.ts';

/** Continuous time the EMS gap must stay inside the safe band (seconds). */
const GAP_HOLD_TARGET_SECONDS = 10;
let gapHoldSeconds = 0;
let gapHoldLastTime = 0;

export const CHALLENGES: ChallengeScenario[] = [
  {
    id: 'speed_600',
    name: 'Phá Kỷ Lục Tốc Độ 600 km/h',
    subtitle: 'Thử thách gia tốc & lực cản khí động',
    description: 'Điều khiển đoàn tàu EDS siêu dẫn tăng tốc cực đại, vượt qua lực cản không khí khổng lồ để chạm mốc 600 km/h an toàn.',
    objective: 'Đạt vận tốc ≥ 600 km/h mà không để tàu sập khe hở chạm ray.',
    targetMetric: 'Vận tốc ≥ 600 km/h',
    basePresetId: 'scmaglev_l0',
    initialParams: {
      levitationMode: 'EDS',
      targetGap: 100,
      maxThrust: 260000,
      statorCurrent: 2000,
      cd: 0.16,
      airDensity: 1.20,
      trackGrade: 0,
      windSpeed: 0,
    },
    checkSuccess: (state: SimulationState) => {
      const speedKmh = state.v * 3.6;
      if (speedKmh >= 600) {
        return { success: true, progress: 100, message: `Xuất sắc! Kỷ lục mới: ${speedKmh.toFixed(0)} km/h!` };
      }
      return { success: false, progress: Math.min(99, (speedKmh / 600) * 100), message: `Vận tốc hiện tại: ${speedKmh.toFixed(0)} / 600 km/h` };
    },
    checkFailure: (state: SimulationState) => {
      if (state.contact && state.v > 50) {
        return { failed: true, reason: 'Chạm ray ở vận tốc cao! Hãy kiểm tra lực nâng từ.' };
      }
      return { failed: false, reason: '' };
    },
  },
  {
    id: 'station_docking',
    name: 'Đỗ Ga Chuẩn Xác Tại Km 5.0',
    subtitle: 'Nghệ thuật phanh từ tái sinh',
    description: 'Đoàn tàu xuất phát cách sân ga 5.0 km (5,000m). Hãy sử dụng phanh tái sinh LSM và lực đẩy để dừng chính xác đoàn tàu tại vạch ga [4998m - 5002m].',
    objective: 'Dừng tàu tại x = 5000m ± 2m với vận tốc v < 2 km/h.',
    targetMetric: 'Vị trí x = 5000m (Sai số ≤ 2m)',
    basePresetId: 'shanghai_transrapid',
    initialParams: {
      levitationMode: 'EMS',
      targetGap: 14,
      maxThrust: 180000,
      trackGrade: 0,
    },
    checkSuccess: (state: SimulationState) => {
      const dist = state.x;
      const speedKmh = state.v * 3.6;
      if (dist >= 4998 && dist <= 5002 && speedKmh < 2) {
        return { success: true, progress: 100, message: `Tuyệt đỉnh! Dừng chuẩn tại ${dist.toFixed(1)}m!` };
      }
      const progress = Math.min(95, (dist / 5000) * 100);
      return { success: false, progress, message: `Vị trí: ${dist.toFixed(1)} / 5,000m (Tốc độ: ${speedKmh.toFixed(0)} km/h)` };
    },
    checkFailure: (state: SimulationState) => {
      if (state.x > 5030) {
        return { failed: true, reason: 'Tàu đã chạy vượt quá sân ga 5,000m!' };
      }
      return { failed: false, reason: '' };
    },
  },
  {
    id: 'gap_stabilizer',
    name: 'Ổn Định Khe Hở Trong Bão Gió',
    subtitle: 'Thử thách vi điều khiển PID cho EMS',
    description: 'Đoàn tàu EMS leo dốc 5% trong điều kiện gió bão ngược giật 25 m/s. Bạn cần tinh chỉnh bộ điều khiển PID (Kp, Ki, Kd) để giữ khe hở trong dải an toàn [10mm - 16mm] trong ít nhất 10 giây.',
    objective: 'Duy trì khe hở 10 - 16 mm liên tục trong 10 giây ở tốc độ > 150 km/h.',
    targetMetric: 'Khe hở ổn định 10 - 16 mm (10s)',
    basePresetId: 'shanghai_transrapid',
    initialParams: {
      levitationMode: 'EMS',
      targetGap: 13,
      trackGrade: 5.0,
      windSpeed: -25,
      kp: 300,
      ki: 20,
      kd: 50,
    },
    reset: () => {
      gapHoldSeconds = 0;
      gapHoldLastTime = 0;
    },
    checkSuccess: (state: SimulationState, timeSpent: number) => {
      const speedKmh = state.v * 3.6;
      const inRange = state.y >= 10 && state.y <= 16;
      const fastEnough = speedKmh > 150;

      // Accumulate only the time actually spent inside the safe band at speed.
      const frameDt = Math.max(0, Math.min(0.25, timeSpent - gapHoldLastTime));
      gapHoldLastTime = timeSpent;
      gapHoldSeconds = inRange && fastEnough ? gapHoldSeconds + frameDt : 0;

      if (gapHoldSeconds >= GAP_HOLD_TARGET_SECONDS) {
        return { success: true, progress: 100, message: 'Hoàn thành xuất sắc thử thách ổn định PID!' };
      }
      return {
        success: false,
        progress: Math.min(99, (gapHoldSeconds / GAP_HOLD_TARGET_SECONDS) * 100),
        message: `Giữ ổn định: ${gapHoldSeconds.toFixed(1)}s / ${GAP_HOLD_TARGET_SECONDS}s (Khe hở: ${state.y.toFixed(1)} mm · ${speedKmh.toFixed(0)} km/h)`,
      };
    },
    checkFailure: (state: SimulationState) => {
      if (state.contact) {
        return { failed: true, reason: 'Khe hở bị sập (chạm ray)! Tăng Kp hoặc kiểm tra Kd.' };
      }
      if (state.y > 35) {
        return { failed: true, reason: 'Khe hở quá lớn khiến từ trường mất điều khiển!' };
      }
      return { failed: false, reason: '' };
    },
  },
  {
    id: 'snowstorm_run',
    name: 'Vượt Bão Tuyết Về Đích (Snowstorm Sprint)',
    subtitle: 'Thử thách ma sát băng tuyết & cản gió',
    description: 'Bão tuyết khiến không khí lạnh tăng lực cản gió +6% và đường ray đóng băng làm giảm 28% độ bám guốc trượt. Hãy điều khiển tàu vượt qua 6,000m trong điều kiện tuyết rơi dày với vận tốc trên 400 km/h.',
    objective: 'Vượt quãng đường 6,000m trong bão tuyết với tốc độ duy trì ≥ 400 km/h.',
    targetMetric: 'Quãng đường ≥ 6,000m trong bão tuyết',
    basePresetId: 'scmaglev_l0',
    initialParams: {
      levitationMode: 'EDS',
      targetGap: 95,
      weather: 'SNOW',
      windSpeed: -15, // Gió ngược 15 m/s
      trackGrade: 2.0, // Dốc nhẹ 2%
      maxThrust: 240000,
    },
    checkSuccess: (state: SimulationState) => {
      const dist = state.x;
      const speedKmh = state.v * 3.6;
      if (dist >= 6000 && speedKmh >= 400) {
        return { success: true, progress: 100, message: `Thành công rực rỡ! Vượt bão tuyết với vận tốc ${speedKmh.toFixed(0)} km/h!` };
      }
      const p = Math.min(99, (dist / 6000) * 100);
      return { success: false, progress: p, message: `Tiến độ: ${(dist / 1000).toFixed(2)} / 6.00 km (Tốc độ: ${speedKmh.toFixed(0)} km/h · Tuyết cản +6%)` };
    },
    checkFailure: (state: SimulationState) => {
      if (state.contact && state.v > 40) {
        return { failed: true, reason: 'Chạm ray trên nền tuyết đóng băng gây mất ổn định!' };
      }
      return { failed: false, reason: '' };
    },
  },
];

interface ChallengeModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeChallenge: ChallengeScenario | null;
  onSelectChallenge: (challenge: ChallengeScenario) => void;
  onStopChallenge: () => void;
}

export const ChallengeModeModal: React.FC<ChallengeModeModalProps> = ({
  isOpen,
  onClose,
  activeChallenge,
  onSelectChallenge,
  onStopChallenge,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Thử Thách Vật Lý & Kỹ Năng Lái Tàu (Missions)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Kiểm tra khả năng làm chủ các hiện tượng điện từ và cơ học
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Challenge list */}
        <div className="p-6 overflow-y-auto space-y-4">
          {CHALLENGES.map((ch) => {
            const isActive = activeChallenge?.id === ch.id;
            return (
              <div
                key={ch.id}
                className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-sky-950/40 border-sky-500/60 shadow-lg' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{ch.name}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-400 rounded">
                          ĐANG CHƠI
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-sky-400/80 font-mono mt-0.5">{ch.subtitle}</p>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{ch.description}</p>
                    <div className="flex items-center gap-2 text-xs font-mono text-amber-400 mt-2 bg-amber-950/30 px-2.5 py-1 rounded border border-amber-900/40">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Mục tiêu: {ch.objective}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col gap-2">
                    {isActive ? (
                      <button
                        onClick={onStopChallenge}
                        className="px-3 py-1.5 text-xs font-mono bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-300 rounded-lg transition-colors"
                      >
                        Hủy thử thách
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onSelectChallenge(ch);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold font-mono bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Bắt đầu</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
