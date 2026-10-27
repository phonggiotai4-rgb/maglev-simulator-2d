/**
 * Physics acceptance check (headless).
 *
 *   npm run simcheck
 *
 * Runs every preset from its own initial condition at full throttle and asserts
 * the behaviour a physics lab demo must show: no NaN, a levitating train that
 * does not sit on its skids, no gap pinned to the artificial 200 mm ceiling, and
 * a fail-safe scenario that actually starts at line speed.
 */
import { PRESETS } from '../src/physics/presets.ts';
import { createInitialState, stepSimulation } from '../src/physics/maglevEngine.ts';
import type { SimulationState } from '../src/types/physics.ts';

const DT = 1 / 60;
const SECONDS = 120;

interface Result {
  state: SimulationState;
  gapMin: number;
  gapMax: number;
  contactShare: number;
  ceilingShare: number;
  speedAt60: number;
}

function simulate(presetIndex: number): Result {
  const preset = PRESETS[presetIndex];
  const params = { ...preset.params };
  let state = createInitialState(params);
  if (preset.initialState) Object.assign(state, preset.initialState);
  state.throttle = 1;
  state.brakeMode = 'NONE';

  let gapMin = Infinity;
  let gapMax = -Infinity;
  let contactFrames = 0;
  let ceilingFrames = 0;
  let speedAt60 = 0;
  const frames = SECONDS / DT;

  for (let i = 0; i < frames; i++) {
    state = stepSimulation(state, params, DT);
    gapMin = Math.min(gapMin, state.y);
    gapMax = Math.max(gapMax, state.y);
    if (state.contact) contactFrames++;
    if (state.y >= 199.999) ceilingFrames++;
    if (i === Math.round(60 / DT)) speedAt60 = state.v * 3.6;
  }

  return {
    state,
    gapMin,
    gapMax,
    contactShare: contactFrames / frames,
    ceilingShare: ceilingFrames / frames,
    speedAt60,
  };
}

const failures: string[] = [];
const rows: string[] = [];

PRESETS.forEach((preset, index) => {
  const result = simulate(index);
  const { state } = result;
  const speed = state.v * 3.6;
  const isFailureDemo = preset.id === 'power_loss_test';
  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

  rows.push(
    [
      preset.id.padEnd(20),
      `${speed.toFixed(0)} km/h`.padEnd(11),
      `gap ${result.gapMin.toFixed(1)}-${result.gapMax.toFixed(1)} mm`.padEnd(20),
      `contact ${pct(result.contactShare)}`.padEnd(14),
      `ceiling ${pct(result.ceilingShare)}`.padEnd(13),
      `E ${state.energyKWh.toFixed(0)} kWh`,
    ].join(' '),
  );

  const numeric = [
    ...Object.values(state).filter((value): value is number => typeof value === 'number'),
    ...Object.values(state.forces),
  ];
  if (numeric.some((n) => !Number.isFinite(n))) {
    failures.push(`${preset.id}: non-finite state value`);
  }

  if (!isFailureDemo) {
    if (result.contactShare > 0.03) {
      failures.push(`${preset.id}: levitating train is in contact ${pct(result.contactShare)} of the time`);
    }
    if (result.ceilingShare > 0.01) {
      failures.push(`${preset.id}: gap pinned to the 200 mm ceiling ${pct(result.ceilingShare)} of the time`);
    }
    const tolerance = preset.params.levitationMode === 'EDS' ? 0.35 : 0.2;
    const drift = Math.abs(state.y - preset.params.targetGap) / preset.params.targetGap;
    if (drift > tolerance) {
      failures.push(
        `${preset.id}: steady gap ${state.y.toFixed(1)} mm drifts ${(drift * 100).toFixed(0)}% from target ${preset.params.targetGap} mm`,
      );
    }
  } else {
    if (speed > 200) {
      failures.push(`${preset.id}: fail-safe demo should brake to a stop, still at ${speed.toFixed(0)} km/h`);
    }
    if (result.contactShare < 0.5) {
      failures.push(`${preset.id}: collapsed lift field never drops the train onto its skids`);
    }
  }
});

// Purity: stepping must not mutate the caller's state object.
{
  const params = { ...PRESETS[1].params };
  const before = createInitialState(params);
  before.throttle = 1;
  const snapshot = JSON.stringify(before);
  stepSimulation(before, params, DT);
  if (JSON.stringify(before) !== snapshot) {
    failures.push('stepSimulation mutated the input state');
  }
}

console.log('Preset acceptance run (full throttle, 120 s simulated)');
console.log('='.repeat(100));
rows.forEach((row) => console.log(row));
console.log('='.repeat(100));

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`);
  failures.forEach((f) => console.error(` - ${f}`));
  process.exit(1);
}

console.log('\nAll physics checks passed.');
