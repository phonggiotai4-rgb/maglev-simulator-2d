/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, Layers, Cpu, Zap } from 'lucide-react';

interface BogieCrossSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: 'EMS' | 'EDS';
  currentGap: number;
}

export const BogieCrossSectionModal: React.FC<BogieCrossSectionModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  currentGap,
}) => {
  const [selectedTech, setSelectedTech] = useState<'EMS' | 'EDS'>(currentMode);

  // The component stays mounted while closed, so re-sync the tab with the
  // simulator every time the modal is opened.
  useEffect(() => {
    if (isOpen) setSelectedTech(currentMode);
  }, [isOpen, currentMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Mặt Cắt Ngang & Cơ Chế Khí - Từ Của Bogie
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Cơ cấu nâng hạ, dẫn hướng và động cơ đồng bộ tuyến tính (LSM)
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

        {/* Tech Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-3 gap-3">
          <button
            onClick={() => setSelectedTech('EMS')}
            className={`pb-3 px-3 text-xs font-mono font-semibold transition-colors border-b-2 ${selectedTech === 'EMS' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Hệ Thống EMS (Điện Từ Hút - Transrapid)
          </button>
          <button
            onClick={() => setSelectedTech('EDS')}
            className={`pb-3 px-3 text-xs font-mono font-semibold transition-colors border-b-2 ${selectedTech === 'EDS' ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Hệ Thống EDS (Cảm Ứng Đẩy Siêu Dẫn - SCMaglev)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* SVG Diagram Canvas */}
          <div className="relative w-full h-72 bg-slate-950 rounded-xl border border-slate-800/80 p-4 flex items-center justify-center overflow-hidden">
            {selectedTech === 'EMS' ? (
              /* EMS SVG CROSS SECTION (T-rail with wraparound electromagnet) */
              <svg viewBox="0 0 700 280" className="w-full h-full">
                <defs>
                  <marker
                    id="arrowUp"
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
                  </marker>
                </defs>
                {/* Guideway Concrete Pillar & Crossbeam */}
                <rect x="310" y="140" width="80" height="140" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                <path d="M 220 120 L 480 120 L 460 150 L 240 150 Z" fill="#334155" stroke="#475569" strokeWidth="2" />
                
                {/* T-shaped Steel Reaction Track / Stator Pack */}
                <rect x="230" y="100" width="240" height="20" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
                {/* Stator Coils hanging on bottom of T-wings */}
                <rect x="230" y="120" width="70" height="15" fill="#0284c7" />
                <rect x="400" y="120" width="70" height="15" fill="#0284c7" />

                {/* Train Carriage Chassis Body (Top) */}
                <rect x="180" y="20" width="340" height="50" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
                <text x="350" y="50" fill="#f8fafc" fontSize="13" fontFamily="Plus Jakarta Sans" fontWeight="bold" textAnchor="middle">
                  THÂN TOA TÀU (PASSENGER CABIN)
                </text>

                {/* Bogie Wraparound Arms (embracing the T-rail from below) */}
                {/* Left arm */}
                <path d="M 200 70 L 200 165 L 290 165 L 290 145 L 220 145 L 220 70 Z" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
                {/* Left Electromagnet (Pulling UP toward stator) */}
                <rect x="225" y="145" width="60" height="14" fill="#ea580c" stroke="#f97316" strokeWidth="1.5" />
                
                {/* Right arm */}
                <path d="M 500 70 L 500 165 L 410 165 L 410 145 L 480 145 L 480 70 Z" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
                {/* Right Electromagnet */}
                <rect x="415" y="145" width="60" height="14" fill="#ea580c" stroke="#f97316" strokeWidth="1.5" />

                {/* Air Gap Arrows & Callout */}
                <line x1="255" y1="135" x2="255" y2="145" stroke="#10b981" strokeWidth="2" />
                <circle cx="255" cy="135" r="2.5" fill="#10b981" />
                <circle cx="255" cy="145" r="2.5" fill="#10b981" />
                <text x="255" y="195" fill="#10b981" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">
                  Khe Hở Từ: 12 - 15 mm
                </text>

                {/* Magnetic Lift Force Vector (Pulling UP) */}
                <line x1="255" y1="145" x2="255" y2="115" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#arrowUp)" />
                <line x1="445" y1="145" x2="445" y2="115" stroke="#06b6d4" strokeWidth="3" markerEnd="url(#arrowUp)" />
                <text x="445" y="195" fill="#06b6d4" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">
                  Lực Hút Điện Từ F_lift (Hướng Lên)
                </text>
              </svg>
            ) : (
              /* EDS SVG CROSS SECTION (U-guideway with sidewall 8-figure coils) */
              <svg viewBox="0 0 700 280" className="w-full h-full">
                {/* U-shaped Concrete Guideway */}
                <path d="M 160 80 L 160 220 L 540 220 L 540 80 L 500 80 L 500 190 L 200 190 L 200 80 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                
                {/* Left Sidewall Figure-8 Null-Flux Coils */}
                <rect x="175" y="95" width="20" height="35" rx="3" fill="#0369a1" stroke="#38bdf8" />
                <rect x="175" y="135" width="20" height="35" rx="3" fill="#0284c7" stroke="#38bdf8" />
                <text x="185" y="117" fill="#fff" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">N</text>
                <text x="185" y="157" fill="#fff" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">S</text>

                {/* Right Sidewall Coils */}
                <rect x="505" y="95" width="20" height="35" rx="3" fill="#0369a1" stroke="#38bdf8" />
                <rect x="505" y="135" width="20" height="35" rx="3" fill="#0284c7" stroke="#38bdf8" />
                <text x="515" y="117" fill="#fff" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">N</text>
                <text x="515" y="157" fill="#fff" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">S</text>

                {/* Maglev Body with Superconducting Magnets on Sides */}
                <rect x="230" y="40" width="240" height="120" rx="10" fill="#0f172a" stroke="#6366f1" strokeWidth="2" />
                <text x="350" y="90" fill="#f8fafc" fontSize="13" fontFamily="Plus Jakarta Sans" fontWeight="bold" textAnchor="middle">
                  BOGIE SIÊU DẪN SCMaglev
                </text>

                {/* Superconducting Coils (SCM cryostat pods on sides) */}
                <rect x="210" y="105" width="20" height="50" rx="3" fill="#4f46e5" stroke="#a5b4fc" strokeWidth="1.5" />
                <rect x="470" y="105" width="20" height="50" rx="3" fill="#4f46e5" stroke="#a5b4fc" strokeWidth="1.5" />
                <text x="220" y="135" fill="#fff" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">SCM</text>
                <text x="480" y="135" fill="#fff" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">SCM</text>

                {/* Deployable auxiliary rubber tires below */}
                <circle cx="280" cy="180" r="10" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="420" cy="180" r="10" fill="#334155" stroke="#94a3b8" strokeWidth="2" />

                {/* Repulsion Levitation Gap Callout */}
                <line x1="280" y1="190" x2="280" y2="170" stroke="#10b981" strokeWidth="2" />
                <text x="350" y="211" fill="#10b981" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">
                  Khe Hở Đệm Đẩy: ~100 mm (Cất cánh &gt; 140 km/h)
                </text>
              </svg>
            )}
          </div>

          {/* Detailed Engineering Explanations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <Zap className="w-4 h-4" />
                <span>1. Cơ Chế Nâng Hạ (Levitation Principle)</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                {selectedTech === 'EMS'
                  ? 'EMS dựa trên lực hút từ trường (Attraction). Các cuộn nam châm điện gắn dưới cánh tay bogie ôm lấy đáy thanh ray dẫn hướng. Khi cấp điện, nam châm bị hút ngược lên ray thép, nâng toàn bộ trọng lượng đoàn tàu. Về bản chất hệ thống hút vốn không ổn định (Unstable equilibrium), do đó bắt buộc phải sử dụng cảm biến khoảng cách laser và bộ điều khiển PID điều chỉnh dòng điện hàng nghìn lần mỗi giây để giữ khe hở chính xác 12–15 mm.'
                  : 'EDS dựa trên nguyên lý cảm ứng điện từ và dòng Fu-cô (Repulsion). Khi các cuộn nam châm siêu dẫn NbTi (làm lạnh bằng Heli lỏng ở -269°C) di chuyển qua các cuộn dây hình số 8 gắn trên thành máng ray, sự biến thiên từ thông sẽ cảm ứng dòng điện sinh ra lực đẩy từ hướng lên. Khi tàu chạy chậm (<140 km/h), lực chưa đủ lớn nên tàu chạy trên bánh xe phụ; khi đạt vận tốc cất cánh, tàu bay hoàn toàn tự nhiên với khe hở an toàn lên đến 100 mm.'}
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-sky-400 font-bold">
                <Cpu className="w-4 h-4" />
                <span>2. Động Cơ Tuyến Tính (Linear Synchronous Motor - LSM)</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-sans">
                Động cơ đồng bộ tuyến tính (LSM) có thể tưởng tượng như một động cơ xoay thông thường được cắt mở và trải phẳng dọc theo suốt chiều dài đường ray.
                Các cuộn dây 3 pha đặt tĩnh trên ray (Stator) tạo ra sóng từ trường di chuyển đồng bộ dọc tuyến. Nam châm gắn trên tàu đóng vai trò Rô-to bị sóng từ trường này kéo đi với lực đẩy cực đại lên tới hàng trăm kilonewton (kN), không hề phụ thuộc vào ma sát bánh xe như tàu hỏa thông thường.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Trạng thái hiện tại: {currentMode} · Khe hở: {currentGap.toFixed(1)} mm
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Đóng bảng giải thích
          </button>
        </div>
      </div>
    </div>
  );
};
