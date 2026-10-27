/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LevitationMode = 'EMS' | 'EDS';

export type BrakeMode = 'NONE' | 'REGEN' | 'MECHANICAL' | 'EMERGENCY';

export type CameraMode = 'FOLLOW' | 'BOGIE' | 'TRACKSIDE' | 'OVERVIEW';

export type WeatherType = 'CLEAR' | 'RAIN' | 'SNOW';

export interface PhysicsParams {
  // Train specs
  mass: number;             // kg (total train mass)
  carriages: number;        // number of carriages (1 - 6)
  cd: number;               // Aerodynamic drag coefficient (0.15 - 0.50)
  frontalArea: number;      // m^2 (frontal cross-section)
  trainLength: number;      // m (calculated from carriages)
  
  // Levitation specs
  levitationMode: LevitationMode; // EMS (attraction) or EDS (repulsion)
  targetGap: number;        // mm (nominal levitation gap: 10-15mm for EMS, 80-120mm for EDS)
  kp: number;               // PID Proportional gain for EMS gap control
  ki: number;               // PID Integral gain
  kd: number;               // PID Derivative gain
  bogieMagneticField: number; // Tesla (0.5 to 5.0 T)
  levitationDamping: number; // Vertical damping coefficient (N/(m/s))
  maxLiftForce: number;     // N maximum magnetic lift capacity
  
  // Linear Synchronous Motor (LSM) Propulsion
  maxThrust: number;        // N maximum forward/braking thrust (e.g. 150,000 N)
  statorCurrent: number;    // Amperes (0 - 2500 A)
  motorEfficiency: number;  // 0.0 - 1.0 (typically 0.88 - 0.94)
  
  // Guideway & Environment
  airDensity: number;       // kg/m^3 (1.225 at sea level, 0.05 in hyperloop)
  windSpeed: number;        // m/s (+ is tailwind, - is headwind)
  trackGrade: number;       // % (-10% to +10%)
  frictionCoefficient: number; // Friction when touching skid/auxiliary wheels (0.05 - 0.30)
  weather: WeatherType;     // CLEAR | RAIN | SNOW
}

export interface LiveForces {
  gravity: number;          // N (downward)
  lift: number;             // N (upward magnetic)
  thrust: number;           // N (forward/backward LSM force)
  drag: number;             // N (opposing velocity)
  friction: number;         // N (contact friction if gap <= 0 or wheels active)
  slope: number;            // N (gravitational component on incline)
  netX: number;             // N net longitudinal force
  netY: number;             // N net vertical force
}

export interface SimulationState {
  time: number;             // seconds elapsed
  x: number;                // longitudinal position (m)
  v: number;                // velocity (m/s)
  a: number;                // longitudinal acceleration (m/s^2)
  
  y: number;                // levitation gap (mm)
  vy: number;               // vertical velocity (mm/s)
  ay: number;               // vertical acceleration (mm/s^2)
  
  pitch: number;            // pitch angle (rad)
  pitchRate: number;        // pitch angular velocity (rad/s)
  
  forces: LiveForces;
  
  contact: boolean;         // touching track/skids
  wheelsDeployed: boolean;  // EDS auxiliary wheels active (below liftoff speed)
  
  throttle: number;         // -1.0 to 1.0 (-1 = full reverse/regen brake, 1 = full thrust)
  brakeMode: BrakeMode;
  
  powerMW: number;          // Instantaneous electrical power (MW)
  energyKWh: number;        // Total consumed energy (kWh)
  
  statorPhase: number;      // Stator magnetic wave electrical phase (rad)
  fluxDensity: number;      // Normalized magnetic flux density (0.0 - 1.0)
  
  pidIntegral: number;      // Internal state for PID
  pidLastError: number;
}

export interface TelemetrySnapshot {
  time: number;
  speedKmh: number;
  gapMm: number;
  liftForceKn: number;
  thrustForceKn: number;
  dragForceKn: number;
  powerMw: number;
  accelG: number;
}

export interface ChallengeScenario {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  objective: string;
  targetMetric: string;
  /** Preset the challenge is built on, so results do not depend on whatever was loaded before. */
  basePresetId: string;
  initialParams: Partial<PhysicsParams>;
  initialState?: Partial<SimulationState>;
  /** Called when the challenge starts or is retried, to clear any internal timers. */
  reset?: () => void;
  checkSuccess: (state: SimulationState, timeSpent: number) => { success: boolean; progress: number; message: string };
  checkFailure?: (state: SimulationState) => { failed: boolean; reason: string };
}
