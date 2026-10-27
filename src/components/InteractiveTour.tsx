/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  MousePointer,
  Zap,
} from 'lucide-react';

export interface TourStep {
  targetSelector: string; // CSS selector of target element, e.g. '[data-tour="telemetry-speed"]'
  title: string;
  badge: string;
  description: string;
  physicsTip: string;
  actionHint?: string;
  preferredPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="telemetry-speed"]',
    title: 'Đồng Hồ Đo Vận Tốc & Gia Tốc G',
    badge: 'Bước 1 / 7 · Động Lực Học',
    description:
      'Hiển thị tốc độ hiện tại của đoàn tàu theo cả km/h và m/s, cùng mức gia tốc g-force tác động lên hành khách trong khoang.',
    physicsTip:
      'Gia tốc a = ∑F / m. Khi tăng tốc mạnh, giá trị G dương; khi phanh từ tái sinh, giá trị G âm.',
    actionHint: 'Dùng phím W / S hoặc thanh gạt tay ga bên dưới để thay đổi vận tốc.',
    preferredPosition: 'bottom',
  },
  {
    targetSelector: '[data-tour="telemetry-gap"]',
    title: 'Cảm Biến Khe Hở Đệm Từ (Air Gap)',
    badge: 'Bước 2 / 7 · Trực Quan Từ Trường',
    description:
      'Giám sát khoảng cách thực tế giữa cuộn nam châm bogie và thanh ray dẫn hướng bằng tia laser quang học.',
    physicsTip:
      'EMS hoạt động tối ưu ở 12–15 mm. EDS hoạt động ở ~100 mm. Nếu khe hở về 0 mm, guốc trượt khẩn cấp sẽ chạm ray sinh nhiệt và tóe lửa.',
    actionHint: 'Hãy chú ý màu sắc: Xanh lục = Ổn định, Vàng = Dao động, Đỏ = Chạm ray.',
    preferredPosition: 'bottom',
  },
  {
    targetSelector: '[data-tour="canvas-stage"]',
    title: 'Sân Khấu Mô Phỏng Vật Lý 2D & Đoàn Tàu',
    badge: 'Bước 3 / 7 · Mô Hình Thực Nghiệm',
    description:
      'Khu vực hiển thị trực tiếp đoàn tàu chạy trên đường ray từ viaduc elevated. Bạn có thể quan sát đường sức từ (B-field lines), luồng khí động học và các véc-tơ lực.',
    physicsTip:
      'Các đường cong đỏ (cực Bắc N) và xanh dương (cực Nam S) biểu diễn từ trường 3 pha của động cơ tuyến tính LSM kéo đoàn tàu.',
    actionHint: 'Bạn có thể kéo chuột để xoay/lia camera, lăn chuột để phóng to/thu nhỏ.',
    preferredPosition: 'center',
  },
  {
    targetSelector: '[data-tour="throttle-control"]',
    title: 'Cần Gạt Tay Ga & Phanh Tái Sinh LSM',
    badge: 'Bước 4 / 7 · Điều Khiển Động Cơ',
    description:
      'Điều khiển lực đẩy của động cơ đồng bộ tuyến tính. Kéo sang phải (+100%) để phóng hết công suất, kéo sang trái (-100%) để kích hoạt phanh từ tái sinh nạp ngược điện.',
    physicsTip:
      'Động cơ LSM không dùng ma sát bánh xe để kéo, mà dùng tương tác từ tính trực tiếp giữa nam châm tàu và cuộn dây ray.',
    actionHint: 'Thử nhấn phím X để thả trôi hoặc E để kích hoạt Phanh Khẩn Cấp.',
    preferredPosition: 'top',
  },
  {
    targetSelector: '[data-tour="physics-tabs"]',
    title: 'Bảng Tùy Chỉnh Thông Số Vật Lý & Bộ Điều Khiển PID',
    badge: 'Bước 5 / 7 · Tinh Chỉnh Tham Số',
    description:
      'Nơi bạn can thiệp trực tiếp vào toán học của mô phỏng: chuyển đổi EMS/EDS, chỉnh hệ số PID (Kp, Ki, Kd), đổi mật độ không khí (Hyperloop), tạo gió bão và độ dốc đèo núi.',
    physicsTip:
      'Thử nghiệm chế độ "Hyperloop" để triệt tiêu lực cản không khí và đưa đoàn tàu vượt mốc 1000 km/h!',
    actionHint: 'Bấm vào các tab: 1. Hệ Thống Nâng, 2. Động Cơ, 3. Đặc Tính Tàu, 4. Môi Trường.',
    preferredPosition: 'top',
  },
  {
    targetSelector: '[data-tour="oscilloscope-tab"]',
    title: 'Dao Động Ký Vi Sai Thời Gian Thực',
    badge: 'Bước 6 / 7 · Phân Tích Dữ Liệu',
    description:
      'Ghi lại liên tục diễn biến 4 thông số trọng yếu: Vận tốc (km/h), Khe hở đệm từ (mm), Lực đẩy (kN) và Công suất tiêu thụ (MW).',
    physicsTip:
      'Quan sát xem khe hở có bị vọt lố (overshoot) hay dao động tắt dần khi thay đổi tải trọng và gió.',
    actionHint: 'Bấm tab "Đồ Thị Vi Sai" để xem đồ thị sóng thời gian thực bất cứ lúc nào.',
    preferredPosition: 'top',
  },
  {
    targetSelector: '[data-tour="challenges-btn"]',
    title: 'Chế Độ Thử Thách Lái Tàu & Mặt Cắt Bogie',
    badge: 'Bước 7 / 7 · Thử Thách & Cấu Tạo',
    description:
      'Khám phá các nhiệm vụ lái tàu thực tế: Phá kỷ lục tốc độ 600 km/h, Dừng chính xác tại ga Km 5.0, và xem sơ đồ mặt cắt cấu tạo chi tiết của bogie.',
    physicsTip:
      'Hoàn thành các thử thách sẽ giúp bạn hiểu sâu sắc nguyên lý cân bằng lực điện từ trong kỹ thuật tàu cao tốc.',
    actionHint: 'Bấm "Thử Thách Lái Tàu" ở góc trên để bắt đầu nhiệm vụ đầu tiên!',
    preferredPosition: 'bottom',
  },
];

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: 'levitation' | 'propulsion' | 'train' | 'environment') => void;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStepIdx];

  // Update target rect on step change or window resize
  useEffect(() => {
    if (!isOpen) return;

    const updateRect = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        // Scroll into view if needed
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        // Fallback to center if element not in DOM
        setTargetRect(null);
      }
    };

    updateRect();
    const interval = setInterval(updateRect, 300);
    window.addEventListener('resize', updateRect);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateRect);
    };
  }, [isOpen, currentStepIdx, step.targetSelector]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIdx < TOUR_STEPS.length - 1) {
          setCurrentStepIdx((prev) => prev + 1);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIdx > 0) {
          setCurrentStepIdx((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, currentStepIdx, onClose]);

  if (!isOpen) return null;

  // Calculate Popover Position relative to Target Rect
  const getCardStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const margin = 16;
    const cardWidth = 380;
    const cardHeight = 240;

    let top = 0;
    let left = 0;

    const pos = step.preferredPosition || 'bottom';

    if (pos === 'bottom') {
      top = targetRect.bottom + margin;
      left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (pos === 'top') {
      top = targetRect.top - cardHeight - margin;
      left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (pos === 'right') {
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      left = targetRect.right + margin;
    } else if (pos === 'left') {
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      left = targetRect.left - cardWidth - margin;
    } else {
      // center
      top = window.innerHeight / 2 - cardHeight / 2;
      left = window.innerWidth / 2 - cardWidth / 2;
    }

    // Viewport clamping
    left = Math.max(16, Math.min(window.innerWidth - cardWidth - 16, left));
    top = Math.max(16, Math.min(window.innerHeight - cardHeight - 16, top));

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
    };
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto select-none font-sans">
      {/* 1. Backdrop overlay with spotlight cutout cutout SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White background = show dim overlay */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black cutout over target = reveal clear target */}
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.78)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* 2. Spotlight Pulsing Outline Ring on Target */}
      {targetRect && (
        <div
          className="absolute pointer-events-none rounded-xl border-2 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.6)] transition-all duration-300"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        >
          {/* Animated pointer corner beacon */}
          <div className="absolute -top-3 -left-3 flex items-center justify-center w-7 h-7 rounded-full bg-sky-500 text-slate-950 font-bold text-xs shadow-lg ring-4 ring-sky-400/30 animate-bounce">
            {currentStepIdx + 1}
          </div>
        </div>
      )}

      {/* 3. Floating Guidance Explanation Card */}
      <div
        className="fixed z-50 bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-slate-100 flex flex-col gap-3.5 transition-all duration-300"
        style={getCardStyle()}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
              {step.badge}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Đóng hướng dẫn (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Title & Content */}
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{step.title}</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {step.description}
          </p>
        </div>

        {/* Physics Insight Box */}
        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-cyan-300/90 leading-tight flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-cyan-400 uppercase tracking-wide">Nguyên Lý: </span>
            <span>{step.physicsTip}</span>
          </div>
        </div>

        {/* Action Hint */}
        {step.actionHint && (
          <div className="text-[11px] font-sans text-amber-300/90 flex items-center gap-1.5">
            <MousePointer className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{step.actionHint}</span>
          </div>
        )}

        {/* Card Footer Controls */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs font-mono">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Bỏ qua
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentStepIdx === 0}
              className={`p-1.5 rounded border border-slate-700 transition-colors ${currentStepIdx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-800 text-slate-300'}`}
              title="Bước trước (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (currentStepIdx < TOUR_STEPS.length - 1) {
                  setCurrentStepIdx((prev) => prev + 1);
                } else {
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow"
              title="Bước tiếp theo (→)"
            >
              <span>{currentStepIdx === TOUR_STEPS.length - 1 ? 'Hoàn tất' : 'Tiếp theo'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
