/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhysicsParams, SimulationState } from '../types/physics.ts';

export interface PresetConfig {
  id: string;
  name: string;
  category: string;
  country: string;
  maxSpeedLabel: string;
  description: string;
  params: PhysicsParams;
  /** Optional non-zero starting condition (e.g. a failure scenario that begins at line speed). */
  initialState?: Partial<SimulationState>;
}

export const PRESETS: PresetConfig[] = [
  {
    id: 'scmaglev_l0',
    name: 'SCMaglev L0 Series (Nhật Bản)',
    category: 'EDS - Siêu dẫn cảm ứng đẩy',
    country: 'Nhật Bản (JR Central)',
    maxSpeedLabel: '603 km/h (Kỷ lục thế giới)',
    description: 'Hệ thống EDS (Electrodynamic Suspension) sử dụng nam châm siêu dẫn NbTi. Ở tốc độ thấp (<140 km/h) tàu chạy trên bánh xe phụ; khi đạt vận tốc cất cánh, dòng Fu-cô cảm ứng trong cuộn ray tạo lực đẩy nâng tàu lên 100mm.',
    params: {
      mass: 55000,
      carriages: 3,
      cd: 0.18,
      frontalArea: 9.8,
      trainLength: 75,
      levitationMode: 'EDS',
      targetGap: 100, // 100 mm gap
      kp: 180,
      ki: 15,
      kd: 40,
      bogieMagneticField: 4.5, // 4.5 Tesla
      levitationDamping: 32000,
      maxLiftForce: 850000,
      maxThrust: 220000,
      statorCurrent: 1800,
      motorEfficiency: 0.94,
      airDensity: 1.225,
      windSpeed: 0,
      trackGrade: 0,
      frictionCoefficient: 0.08,
      weather: 'CLEAR',
    },
  },
  {
    id: 'shanghai_transrapid',
    name: 'Shanghai Transrapid (Đức / TQ)',
    category: 'EMS - Điện từ hút chủ động',
    country: 'Đức & Trung Quốc',
    maxSpeedLabel: '431 km/h (Vận hành thương mại)',
    description: 'Hệ thống EMS (Electromagnetic Suspension). Nam châm điện gắn ở gầm bogie ôm lấy ray thép và hút ngược lên trên. Cần vòng lặp điều khiển PID siêu nhanh để duy trì khe hở chính xác 12-15 mm.',
    params: {
      mass: 62000,
      carriages: 3,
      cd: 0.22,
      frontalArea: 10.5,
      trainLength: 78,
      levitationMode: 'EMS',
      targetGap: 14, // 14 mm gap
      kp: 420,
      ki: 45,
      kd: 120,
      bogieMagneticField: 1.6, // 1.6 Tesla
      levitationDamping: 45000,
      maxLiftForce: 980000,
      maxThrust: 180000,
      statorCurrent: 1400,
      motorEfficiency: 0.91,
      airDensity: 1.225,
      windSpeed: 0,
      trackGrade: 0,
      frictionCoefficient: 0.15,
      weather: 'CLEAR',
    },
  },
  {
    id: 'hyperloop_vacuum',
    name: 'Hyperloop Ống Chân Không',
    category: 'EDS - Áp suất thấp siêu âm',
    country: 'Ý tưởng tương lai',
    maxSpeedLabel: '1,100+ km/h (Mach 0.9)',
    description: 'Tàu đệm từ di chuyển trong đường ống khép kín duy trì áp suất cực thấp (~100 Pa, mật độ không khí 0.05 kg/m³). Lực cản không khí triệt tiêu gần như hoàn toàn, cho phép đạt tốc độ siêu thanh với năng lượng tối thiểu.',
    params: {
      mass: 38000,
      carriages: 1,
      cd: 0.14,
      frontalArea: 7.2,
      trainLength: 32,
      levitationMode: 'EDS',
      targetGap: 60,
      kp: 260,
      ki: 25,
      kd: 60,
      bogieMagneticField: 3.8,
      levitationDamping: 28000,
      maxLiftForce: 650000,
      maxThrust: 280000,
      statorCurrent: 2100,
      motorEfficiency: 0.96,
      airDensity: 0.06, // near vacuum
      windSpeed: 0,
      trackGrade: 0,
      frictionCoefficient: 0.06,
      weather: 'CLEAR',
    },
  },
  {
    id: 'mountain_pass',
    name: 'Thử Thách Leo Đèo Dốc 7%',
    category: 'EMS - Lực kéo dốc lớn',
    country: 'Thử nghiệm độ nghiêng',
    maxSpeedLabel: '280 km/h (Vượt dốc đứng)',
    description: 'Đường ray leo dốc 7% (độ dốc mà tàu bánh thép truyền thống không thể bám ma sát để leo). Động cơ đồng bộ tuyến tính (LSM) dùng lực từ trường kéo tàu lên dốc dễ dàng mà không phụ thuộc ma sát bánh xe.',
    params: {
      mass: 58000,
      carriages: 2,
      cd: 0.24,
      frontalArea: 10.2,
      trainLength: 52,
      levitationMode: 'EMS',
      targetGap: 13,
      kp: 460,
      ki: 55,
      kd: 140,
      bogieMagneticField: 1.8,
      levitationDamping: 48000,
      maxLiftForce: 950000,
      maxThrust: 240000,
      statorCurrent: 1900,
      motorEfficiency: 0.90,
      airDensity: 1.200,
      windSpeed: -15, // Headwind 15 m/s
      trackGrade: 7.0, // 7% steep incline
      frictionCoefficient: 0.20,
      weather: 'CLEAR',
    },
  },
  {
    id: 'power_loss_test',
    name: 'Thử Nghiệm Mất Điện Đột Ngột',
    category: 'Fail-Safe - Rơi tự do đệm trượt',
    country: 'An toàn cơ điện',
    maxSpeedLabel: 'Hạ cánh khẩn cấp',
    description: 'Mô phỏng sự cố mất nguồn cấp điện cho cuộn nâng ở tốc độ cao (300 km/h). Quan sát tàu sập khe hở từ, tiếp xúc guốc trượt khẩn cấp hoặc bánh xe phụ, ma sát hãm và tản nhiệt an toàn.',
    params: {
      mass: 52000,
      carriages: 2,
      cd: 0.22,
      frontalArea: 9.8,
      trainLength: 50,
      levitationMode: 'EMS',
      targetGap: 12,
      kp: 10, // crippled controller
      ki: 0,
      kd: 5,
      bogieMagneticField: 0.1, // collapsed field
      levitationDamping: 20000,
      maxLiftForce: 150000, // insufficient lift
      maxThrust: 0,
      statorCurrent: 0,
      motorEfficiency: 0.90,
      airDensity: 1.225,
      windSpeed: 0,
      trackGrade: 0,
      frictionCoefficient: 0.28,
      weather: 'CLEAR',
    },
    // The failure scenario is only meaningful at speed: start it at 300 km/h (83.3 m/s)
    // with the lift field already collapsed, exactly as the description says.
    initialState: {
      v: 83.3,
      x: 1200,
      y: 12,
      vy: 0,
      throttle: 0,
    },
  },
];
