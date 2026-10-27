/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Info } from 'lucide-react';

export interface HotspotPin {
  id: string;
  label: string;
  sub: string;
  xPercent: number; // Percentage on canvas X (e.g. 52% near nose)
  yPercent: number; // Percentage on canvas Y (e.g. 48% near bogie)
  title: string;
  formula?: string;
  description: string;
  technicalDetails: string;
}

export const HOTSPOTS_DATA: HotspotPin[] = [
  {
    id: 'aerodynamic_nose',
    label: 'Mũi Tàu Khí Động',
    sub: 'Hệ Số Cản Cd',
    xPercent: 62,
    yPercent: 44,
    title: 'Mũi Tàu Khí Động Học & Lực Cản Gió',
    formula: 'F_drag = 0.5 · ρ · Cd · A · v²',
    description:
      'Thiết kế mũi thon dài theo dạng khí động học elip giúp tách luồng không khí mượt mà, hạn chế tối đa sóng xung kích và tiếng ồn vi sai khi tàu chạy ở tốc độ cao.',
    technicalDetails:
      'Khi vận tốc v tăng gấp đôi, lực cản gió tăng gấp 4 lần và công suất cản tăng gấp 8 lần (P = F · v). Tại vận tốc 600 km/h, lực cản khí động học chiếm tới hơn 85% tổng công suất động cơ kéo.',
  },
  {
    id: 'bogie_magnet',
    label: 'Nam Châm Bogie',
    sub: 'Hệ Thống Nâng',
    xPercent: 44,
    yPercent: 62,
    title: 'Khối Nam Châm Điện & Siêu Dẫn Nâng Hạ',
    formula: 'F_lift ∝ (I² / y²) [EMS]  hoặc  F_lift ∝ B² · (v² / (v² + vc²)) [EDS]',
    description:
      'Trái tim của hệ thống đệm từ: Trong hệ EMS, cuộn dây nam châm điện ôm vòng dưới ray thép và bị hút ngược lên; trong hệ EDS, cuộn siêu dẫn NbTi sinh dòng Fu-cô đẩy tàu lên.',
    technicalDetails:
      'Lực nâng phi tuyến tính rất mạnh ở khoảng cách gần. Bộ vi điều khiển PID phải tính toán dòng điện cuộn cảm với tần số đáp ứng trên 1,000 Hz để tránh làm tàu va đập vào ray hoặc văng khỏi từ trường.',
  },
  {
    id: 'laser_gap_sensor',
    label: 'Laser Đo Khe Hở',
    sub: 'Cảm Biến Quang',
    xPercent: 48,
    yPercent: 66,
    title: 'Cảm Biến Laser Đo Khe Hở Đệm Từ',
    formula: 'Sai số e(t) = y_mục_tiêu - y(t)',
    description:
      'Tia laser quang học màu đỏ/xanh lục chiếu liên tục từ gầm bogie xuống mặt phẳng ray thép để đo khoảng cách thực tế với độ phân giải micromet.',
    technicalDetails:
      'Tín hiệu sai số được truyền trực tiếp vào thuật toán PID: u(t) = Kp·e(t) + Ki·∫e(t)dt + Kd·(de/dt) để tinh chỉnh cường độ dòng điện Stator tức thì.',
  },
  {
    id: 'stator_guideway',
    label: 'Ray Stator 3 Pha',
    sub: 'Động Cơ Tuyến Tính',
    xPercent: 28,
    yPercent: 73,
    title: 'Đường Ray Dẫn Hướng & Cuộn Dây Stator LSM',
    formula: 'v_đồng_bộ = 2 · τ · f  (τ: bước cực từ, f: tần số)',
    description:
      'Đường ray bê tông dự ứng lực tích hợp các rãnh cuộn dây 3 pha. Trạm biến áp điều khiển tần số cấp điện f thay đổi liên tục để kéo đoàn tàu chạy đồng bộ với sóng từ trường.',
    technicalDetails:
      'Nhờ loại bỏ hoàn toàn ma sát cơ học lăn của bánh thép trên ray thép, tàu đệm từ có thể leo dốc tới 8–10% (trong khi tàu truyền thống chỉ leo tối đa 3–4%) và có tuổi thọ đường ray vượt trội.',
  },
  {
    id: 'aux_wheels',
    label: 'Bánh Xe Phụ EDS',
    sub: 'Cất & Hạ Cánh',
    xPercent: 36,
    yPercent: 60,
    title: 'Bánh Xe Cao Su Phụ Hỗ Trợ Cất Cánh (EDS)',
    formula: 'v_cất_cánh ≈ 137 km/h (38 m/s)',
    description:
      'Trong hệ thống EDS của Nhật Bản, khi vận tốc còn thấp, từ trường cảm ứng Fu-cô chưa đủ mạnh để nâng đoàn tàu 50 tấn. Tàu sẽ chạy trên bánh xe cao su.',
    technicalDetails:
      'Khi tàu tăng tốc vượt ngưỡng cất cánh (~140 km/h), lực nâng đẩy vượt trọng lượng đoàn tàu, hệ thống thủy lực sẽ tự động thu gọn các cụm bánh xe vào hốc bogie để tàu lướt êm ái trên đệm từ 100mm.',
  },
];

interface HotspotsProps {
  isVisible: boolean;
  onToggle: () => void;
}

/**
 * Toolbar button that turns the part labels on and off.
 * Rendered inside the canvas toolbar, so it must stay a plain button.
 */
export const HotspotsToggle: React.FC<HotspotsProps> = ({ isVisible, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={
        isVisible
          ? 'flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/80 text-cyan-200 rounded-lg shadow text-xs font-mono font-bold transition-all'
          : 'flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 hover:text-white rounded-lg shadow transition-all'
      }
      title={isVisible ? 'Tắt các điểm chỉ dẫn bộ phận' : 'Bật các điểm chỉ dẫn các bộ phận trên đoàn tàu'}
    >
      {isVisible ? <X className="w-3.5 h-3.5 text-cyan-400" /> : <Info className="w-3.5 h-3.5 text-cyan-400" />}
      <span>{isVisible ? 'Tắt Điểm Chỉ Dẫn' : 'Điểm Chỉ Dẫn'}</span>
    </button>
  );
};

/**
 * The pins themselves. Must be mounted inside the relative stage container,
 * otherwise the percentage anchors resolve against the toolbar instead of the canvas.
 */
export const HotspotsOverlay: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotPin | null>(null);

  if (!isVisible) return null;

  return (
    <>
      {/* Direct interactive pins anchored over the simulation stage */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {HOTSPOTS_DATA.map((pin, idx) => (
          <div
            key={pin.id}
            className="absolute pointer-events-auto transition-transform hover:scale-110"
            style={{
              top: `${pin.yPercent}%`,
              left: `${pin.xPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Pulsing target beacon */}
            <button
              onClick={() => setSelectedHotspot(pin)}
              className="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/90 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all hover:bg-cyan-500 hover:text-slate-950"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping absolute -top-0.5 -right-0.5" />
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-[10px] font-mono font-bold tracking-tight whitespace-nowrap">
                {idx + 1}. {pin.label}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Selected hotspot detailed callout popover */}
      {selectedHotspot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs pointer-events-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl font-sans text-slate-100 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  {selectedHotspot.sub}
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedHotspot.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formula block */}
            {selectedHotspot.formula && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-amber-300">
                <span className="text-slate-500 text-[10px] block uppercase">Công thức vật lý:</span>
                <span className="font-bold text-sm tracking-wide">{selectedHotspot.formula}</span>
              </div>
            )}

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedHotspot.description}
            </p>

            {/* Technical deep dive */}
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 text-[11px] font-mono text-cyan-300/90 leading-relaxed">
              <span className="text-slate-400 block font-bold uppercase mb-1">Cơ chế kỹ thuật:</span>
              {selectedHotspot.technicalDetails}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-1">
              <button
                onClick={() => setSelectedHotspot(null)}
                className="px-4 py-1.5 text-xs font-mono font-semibold bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
