export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Inverse of a cubic bezier-like ease used by the reference animation. */
export function easeProgress(value: number) {
  const t = clamp01(value);
  let lo = 0;
  let hi = 1;
  let mid = t;

  for (let i = 0; i < 14; i += 1) {
    mid = (lo + hi) / 2;
    const sample =
      3 * (1 - mid) ** 2 * mid * 0.4 + 3 * (1 - mid) * mid * mid * 0.3 + mid ** 3;
    if (sample < t) lo = mid;
    else hi = mid;
  }

  if (t === 0 || t === 1) return t;
  return 3 * (1 - mid) * mid * mid + mid ** 3;
}

export const MAIN_PATH_WINDOWS: Array<[number, number]> = [
  [0, 1.35],
  [3.95, 5.05],
  [5.4, 6.3],
  [8.1, 9.3],
];

export const MAIN_HOLD_A: [number, number] = [2, 2.65];
export const MAIN_HOLD_B: [number, number] = [6.3, 6.95];
export const BRANCH_WINDOWS: Array<[number, number]> = [
  [1.95, 3.95],
  [6.1, 8.1],
];

export const windowProgress = (time: number, window: [number, number]) =>
  easeProgress((time - window[0]) / (window[1] - window[0]));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const alongMainRail = (x: number) => ({
  x,
  y: 664 - (x - 175) * 0.575,
});

export const SLOPE = Math.atan(0.575);
export const ARC_ANGLE = Math.PI / 2 - SLOPE;
export const BRANCH_X = 431 - 40 * (1 - Math.sin(SLOPE));
export const BRANCH_ARC_Y = 516.8 + 40 * Math.cos(SLOPE);
export const BRANCH_DROP = 575 - BRANCH_ARC_Y;
export const BRANCH_ARC_LEN = 40 * ARC_ANGLE;
export const BRANCH_DIAGONAL = Math.hypot(92, 463.9 - 516.8);

export const BRANCH_PATH = `M${BRANCH_X - 31} 689C${BRANCH_X - 28} 677 ${BRANCH_X - 25} 664 ${BRANCH_X - 20} 652C${BRANCH_X - 9.5} 626.3 ${BRANCH_X} 600.7 ${BRANCH_X} 575V${BRANCH_ARC_Y}A40 40 0 0 1 431 516.8L523 463.9`;

export function wrap(value: number, min: number, max: number) {
  const span = max - min;
  return min + ((((value - min) % span) + span) % span);
}

const roundStable = (value: number) => Math.round(value * 1e6) / 1e6;

export function hashNoise(x: number, y: number) {
  const n = 43758.5453 * Math.sin(127.1 * x + 311.7 * y);
  return roundStable(n - Math.floor(n));
}

export const MIST_PARTICLES = Array.from({ length: 132 }, (_, index) => ({
  phase: hashNoise(index, 1),
  life: roundStable(4.8 + 4 * hashNoise(index, 2)),
  angle: roundStable(hashNoise(index, 3) * Math.PI * 2),
  radius: roundStable(52 * Math.sqrt(hashNoise(index, 4))),
  size: roundStable(0.27 + 0.48 * hashNoise(index, 5)),
  opacity: roundStable(0.18 + 0.36 * hashNoise(index, 6)),
}));

export function pointOnLowerPath(progress: number) {
  const distance = clamp01(progress) * (BRANCH_DROP + BRANCH_ARC_LEN + BRANCH_DIAGONAL);

  if (distance < BRANCH_DROP) {
    return { x: BRANCH_X, y: 575 - distance };
  }

  if (distance < BRANCH_DROP + BRANCH_ARC_LEN) {
    const a = (distance - BRANCH_DROP) / 40;
    return {
      x: BRANCH_X + 40 * (1 - Math.cos(a)),
      y: BRANCH_ARC_Y - 40 * Math.sin(a),
    };
  }

  return alongMainRail(431 + (distance - BRANCH_DROP - BRANCH_ARC_LEN) * Math.cos(SLOPE));
}

export function cardPulse(time: number) {
  const cycle = wrap(time, 0, 10);
  return (
    easeProgress((cycle - 1.3) / 1.7) +
    easeProgress((cycle - 4.3) / 1.7) +
    easeProgress((cycle - 7.2) / 1.7)
  );
}

const MAIN_STOPS = [175, 263, 339, 431, 523];

export function tilePositions(time: number) {
  const cycle = wrap(time, 0, 10);
  const mainAdvance = MAIN_PATH_WINDOWS.reduce(
    (sum, window) => sum + windowProgress(cycle, window),
    0,
  );

  const main = [0, 1, 2, 3].map((index) => {
    let slot = index + mainAdvance;
    if (index === 2 && cycle >= 2) {
      slot = Math.max(slot, 3 + windowProgress(cycle, MAIN_HOLD_A));
    }
    if (index === 0 && cycle >= MAIN_HOLD_B[0]) {
      slot = Math.max(slot, 3 + windowProgress(cycle, MAIN_HOLD_B));
    }

    const wrapped = wrap(slot, 0, 4);
    const from = Math.floor(wrapped);
    const point = alongMainRail(
      lerp(MAIN_STOPS[from], MAIN_STOPS[from + 1], wrapped - from),
    );

    return {
      ...point,
      opacity: clamp01((wrapped - 0) / 0.35) * clamp01((4 - wrapped) / 0.35),
    };
  });

  const branchAdvance = BRANCH_WINDOWS.reduce((sum, [start, end]) => {
    const t = clamp01((cycle - start) / (end - start));
    return sum + t * t * (3 - 2 * t);
  }, 0);

  const lower = [0, 1].map((index) => {
    const wrapped = wrap(index + branchAdvance, 0, 2);
    let x: number;
    let y: number;

    if (wrapped < 1) {
      x = BRANCH_X - 20 + 20 * Math.sin((wrapped * Math.PI) / 2);
      y = lerp(652, 575, wrapped);
    } else {
      ({ x, y } = pointOnLowerPath(wrapped - 1));
    }

    const fade =
      index === 1 && cycle >= 3.95 && cycle < 6.1
        ? clamp01((cycle - 5.75) / 0.35)
        : index === 0 && cycle >= 8.1
          ? clamp01((cycle - 8.1) / 0.5)
          : 1;

    return {
      x,
      y,
      opacity: (0.5 + 0.5 * clamp01(wrapped)) * clamp01((2 - wrapped) / 0.18) * fade,
    };
  });

  return { main, lower };
}
