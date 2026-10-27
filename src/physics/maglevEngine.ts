/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhysicsParams, SimulationState, LiveForces } from '../types/physics.ts';

export const GRAVITY = 9.80665; // m/s^2

/**
 * Creates an initial simulation state
 */
export function createInitialState(params: PhysicsParams): SimulationState {
  const initialGap = params.levitationMode === 'EMS' ? params.targetGap : 0;
  return {
    time: 0,
    x: 0,
    v: 0,
    a: 0,
    y: initialGap,
    vy: 0,
    ay: 0,
    pitch: 0,
    pitchRate: 0,
    forces: {
      gravity: params.mass * GRAVITY,
      lift: params.mass * GRAVITY,
      thrust: 0,
      drag: 0,
      friction: 0,
      slope: 0,
      netX: 0,
      netY: 0,
    },
    contact: params.levitationMode === 'EDS',
    wheelsDeployed: params.levitationMode === 'EDS',
    throttle: 0,
    brakeMode: 'NONE',
    powerMW: 0,
    energyKWh: 0,
    statorPhase: 0,
    fluxDensity: 0.8,
    pidIntegral: 0,
    pidLastError: 0,
  };
}

/**
 * Perform numerical integration step
 * Uses sub-stepping (10 micro-steps) for extreme stability with non-linear magnetic fields
 */
export function stepSimulation(
  state: SimulationState,
  params: PhysicsParams,
  dtRaw: number
): SimulationState {
  // Clamp delta time to avoid frame skips causing explosion. Extra sub-steps are
  // added when the UI time-scale is >1 so 4x playback is really 4x (a fixed
  // 10 steps would silently cap dt at 50 ms and slow the run down).
  const dt = Math.min(dtRaw, 0.1);
  const subSteps = Math.max(10, Math.ceil(dt / 0.005));
  const subDt = dt / subSteps;

  let current = { ...state };
  let currentForces: LiveForces = { ...state.forces };

  for (let step = 0; step < subSteps; step++) {
    // 1. Slope / Incline angle
    const gradeRad = Math.atan(params.trackGrade / 100);
    const cosGrade = Math.cos(gradeRad);
    const sinGrade = Math.sin(gradeRad);

    const fgTotal = params.mass * GRAVITY;
    const fgNormal = fgTotal * cosGrade; // Perpendicular to track
    const fgSlope = -fgTotal * sinGrade;  // Longitudinal component along track

    // 2. Aerodynamic Drag (accounting for rain/snow weather resistance)
    const relV = current.v - params.windSpeed;
    let weatherDragMultiplier = 1.0;
    if (params.weather === 'RAIN') {
      weatherDragMultiplier = 1.08; // +8% drag from airborne water droplet momentum transfer
    } else if (params.weather === 'SNOW') {
      weatherDragMultiplier = 1.06; // +6% drag from denser cold air and snow particulate shear
    }
    const effectiveAirDensity = params.airDensity * weatherDragMultiplier;

    const dragMag = 0.5 * effectiveAirDensity * params.cd * params.frontalArea * (relV * relV);
    const dragForce = relV >= 0 ? -dragMag : dragMag;

    // 3. Propulsion / Braking Thrust (Linear Synchronous Motor - LSM)
    let thrustForce = 0;
    const motorRatio = params.statorCurrent / 2000;

    if (current.brakeMode === 'EMERGENCY') {
      // Strong emergency eddy-current brake + mechanical skid
      thrustForce = -Math.min(current.v * 30000, params.maxThrust * 1.6);
    } else if (current.brakeMode === 'REGEN') {
      // Full regenerative magnetic brake
      thrustForce = -Math.min(current.v * 25000, params.maxThrust * 0.9 * motorRatio);
    } else {
      // Normal throttle (-1.0 to 1.0)
      thrustForce = current.throttle * params.maxThrust * motorRatio;
    }

    // Direction check for braking to prevent backward runaway when stopped
    if (current.v <= 0.05 && thrustForce < 0 && current.throttle <= 0) {
      thrustForce = 0;
    }

    // 4. Vertical Dynamics & Levitation Forces
    let liftForce = 0;
    let contact = false;
    let wheelsDeployed = false;

    if (params.levitationMode === 'EMS') {
      // Electromagnetic Suspension (Transrapid attraction model)
      // PID gap controller regulates current to maintain nominal targetGap
      const error = params.targetGap - current.y; // positive if too low
      const dError = (error - current.pidLastError) / (subDt + 1e-6);
      current.pidIntegral = Math.max(-200, Math.min(200, current.pidIntegral + error * subDt));
      current.pidLastError = error;

      // Base equilibrium force is fgNormal
      const pidCorrection = (params.kp * error) + (params.ki * current.pidIntegral) + (params.kd * dError);
      
      // Magnetic field strength effect
      const fieldFactor = Math.pow(params.bogieMagneticField / 1.6, 1.5);
      
      // Proximity effect: magnetic attraction increases inversely with gap squared
      const gapRatio = Math.max(0.1, current.y / Math.max(1, params.targetGap));
      const proximityFactor = 1 / Math.pow(gapRatio, 1.2);

      liftForce = (fgNormal + pidCorrection) * fieldFactor * proximityFactor;
      // Damping is part of the lift output, so clamp after adding it: maxLiftForce
      // is documented as the coil's absolute capacity.
      const dampingForce = -params.levitationDamping * (current.vy / 1000);
      liftForce = Math.max(0, Math.min(params.maxLiftForce, liftForce + dampingForce));

      if (current.y <= 0) {
        current.y = 0;
        if (current.vy < 0) current.vy = 0;
        contact = true;
      }
    } else {
      // Electrodynamic Suspension (EDS - Japanese SCMaglev repulsion model)
      // Speed threshold for magnetic liftoff (v_c ≈ 38 m/s ≈ 137 km/h)
      const vc = 38;
      const speedFactor = (current.v * current.v) / (current.v * current.v + vc * vc + 1e-5);
      
      // Repulsion scales with superconducting coil field (B^2) and gap proximity
      const fieldRatio = Math.pow(params.bogieMagneticField / 4.5, 2);
      const gapProximity = Math.pow(params.targetGap / Math.max(15, current.y + 15), 1.5);

      liftForce = params.maxLiftForce * speedFactor * fieldRatio * gapProximity;

      // Damping
      const dampingForce = -params.levitationDamping * (current.vy / 1000);
      // Passive EDS is unstable: without the coil-capacity clamp the gap-proximity
      // term can demand >15x the rated lift at small gaps.
      liftForce = Math.max(0, Math.min(params.maxLiftForce, liftForce + dampingForce));

      // Auxiliary wheels behavior
      if (current.v < vc * 1.1) {
        wheelsDeployed = true;
      }

      if (current.y <= 0) {
        current.y = 0;
        if (current.vy < 0) current.vy = 0;
        contact = true;
      }
    }

    // 5. Normal Force & Contact Friction
    let normalForce = 0;
    let frictionForce = 0;

    if (current.y <= 0.1) {
      // Weight supported by mechanical skids or wheels
      normalForce = Math.max(0, fgNormal - liftForce);
      contact = true;

      // Base friction coefficient
      let effMu = (params.levitationMode === 'EDS' && wheelsDeployed) 
        ? 0.015 
        : params.frictionCoefficient;

      // Weather friction reduction on wet or icy rails
      if (params.weather === 'RAIN') {
        effMu *= 0.85; // 15% lower friction on wet rails
      } else if (params.weather === 'SNOW') {
        effMu *= 0.72; // 28% lower friction on snow/ice glaze
      }

      if (Math.abs(current.v) > 0.01) {
        frictionForce = effMu * normalForce * Math.sign(current.v);
      }
    }

    // 6. Net Forces & Accelerations
    const netX = thrustForce + dragForce + fgSlope - frictionForce;
    const ax = netX / params.mass;

    // Vertical acceleration
    const netY = liftForce - fgNormal;
    const ay = (netY / params.mass) * 1000; // convert m/s^2 to mm/s^2 for gap state

    // 7. Update Velocities and Positions
    current.a = ax;
    current.v = Math.max(0, current.v + ax * subDt); // Maglev forward/brake model
    current.x += current.v * subDt;

    current.ay = ay;
    current.vy += ay * subDt;
    current.y += current.vy * subDt;

    // Physical gap boundary constraints
    if (current.y < 0) {
      current.y = 0;
      current.vy = 0;
    }
    // Maximum levitation ceiling before field decouples (200 mm)
    if (current.y > 200) {
      current.y = 200;
      current.vy = -5;
    }

    // 8. Pitch dynamics (slight aerodynamic nose-up or braking pitch)
    const targetPitch = (ax / GRAVITY) * 0.02 - (current.v / 200) * 0.005;
    current.pitchRate += (targetPitch - current.pitch) * 8 * subDt;
    current.pitchRate *= 0.94; // damping
    current.pitch += current.pitchRate * subDt;

    // 9. Power Telemetry
    // Mechanical power = F * v
    const mechanicalPowerWatts = thrustForce * current.v;
    // Base coil excitation power (depends on levitation mode and currents)
    const baseCoilWatts = params.levitationMode === 'EMS' 
      ? 120000 * Math.pow(params.statorCurrent / 1400, 1.2)
      : 40000; // Superconducting coils have negligible DC resistive loss
    
    let totalPowerWatts = 0;
    if (thrustForce >= 0) {
      totalPowerWatts = (mechanicalPowerWatts / params.motorEfficiency) + baseCoilWatts;
    } else {
      // Regenerative braking recovers up to 75% kinetic energy back to the grid
      totalPowerWatts = (mechanicalPowerWatts * 0.75) + baseCoilWatts;
    }

    current.powerMW = Math.round((totalPowerWatts / 1e6) * 100) / 100;
    current.energyKWh += (Math.max(0, totalPowerWatts) * (subDt / 3600)) / 1000;

    // 10. Linear synchronous motor phase (traveling wave animation)
    const polePitch = 0.54; // meters per magnetic pole pair
    current.statorPhase = (current.x / polePitch) * Math.PI * 2;
    current.fluxDensity = Math.min(1.0, 0.4 + (params.bogieMagneticField / 5.0) * 0.6);

    current.contact = contact;
    current.wheelsDeployed = wheelsDeployed;
    current.time += subDt;

    currentForces = {
      gravity: fgNormal,
      lift: liftForce,
      thrust: thrustForce,
      drag: dragForce,
      friction: frictionForce,
      slope: fgSlope,
      netX,
      netY,
    };
  }

  current.forces = currentForces;
  return current;
}
