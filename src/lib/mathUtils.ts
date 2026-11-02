/**
 * High-precision mathematical and statistical utilities for reliability engineering.
 */

// Lanczos approximation coefficients for Gamma function
const LANCZOS_COEFFS = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.138571095857209,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/**
 * High precision Gamma function Γ(z)
 */
export function gamma(z: number): number {
  if (z < 0.5) {
    // Reflection formula: Γ(1-z) Γ(z) = π / sin(πz)
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  z -= 1;
  let x = LANCZOS_COEFFS[0];
  for (let i = 1; i < 9; i++) {
    x += LANCZOS_COEFFS[i] / (z + i);
  }
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/**
 * Natural log of Gamma function ln(Γ(z))
 */
export function logGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = LANCZOS_COEFFS[0];
  for (let i = 1; i < 9; i++) {
    x += LANCZOS_COEFFS[i] / (z + i);
  }
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Adaptive Simpson's rule for numerical integration of f(x) over [a, b]
 */
export function integrateSimpson(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-6,
  maxDepth = 20
): number {
  const simpson = (fa: number, fb: number, fc: number, h: number) => ((fa + 4 * fc + fb) * h) / 6;

  function recursive(
    a: number,
    b: number,
    fa: number,
    fb: number,
    fc: number,
    whole: number,
    depth: number
  ): number {
    const c = (a + b) / 2;
    const h = b - a;
    const d = (a + c) / 2;
    const e = (c + b) / 2;
    const fd = f(d);
    const fe = f(e);
    const left = simpson(fa, fc, fd, h / 2);
    const right = simpson(fc, fb, fe, h / 2);
    const sum = left + right;

    if (depth <= 0 || Math.abs(sum - whole) <= 15 * tol) {
      return sum + (sum - whole) / 15;
    }

    return (
      recursive(a, c, fa, fc, fd, left, depth - 1) +
      recursive(c, b, fc, fb, fe, right, depth - 1)
    );
  }

  const c = (a + b) / 2;
  const fa = f(a);
  const fb = f(b);
  const fc = f(c);
  const whole = simpson(fa, fb, fc, b - a);

  return recursive(a, b, fa, fb, fc, whole, maxDepth);
}

/**
 * Composite Simpson's rule with fixed N segments (faster for repetitive integration)
 */
export function integrateCompositeSimpson(
  f: (x: number) => number,
  a: number,
  b: number,
  n = 100
): number {
  if (n % 2 !== 0) n += 1;
  const h = (b - a) / n;
  let sum = f(a) + f(b);

  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * f(x);
  }

  return (h / 3) * sum;
}

/**
 * Brent-Dekker algorithm for finding root f(x) = 0 in [a, b]
 */
export function brentRoot(
  f: (x: number) => number,
  a: number,
  b: number,
  tol = 1e-6,
  maxIter = 100
): number {
  let fa = f(a);
  let fb = f(b);

  if (Math.abs(fa) < tol) return a;
  if (Math.abs(fb) < tol) return b;
  if (fa * fb > 0) {
    // Root is not bracketed, search a finer grid
    const steps = 40;
    const delta = (b - a) / steps;
    let found = false;
    for (let i = 0; i < steps; i++) {
      const x1 = a + i * delta;
      const x2 = x1 + delta;
      const f1 = f(x1);
      const f2 = f(x2);
      if (f1 * f2 <= 0) {
        a = x1;
        b = x2;
        fa = f1;
        fb = f2;
        found = true;
        break;
      }
    }
    if (!found) {
      // Fallback: return point with minimum absolute value
      return Math.abs(fa) < Math.abs(fb) ? a : b;
    }
  }

  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;

  for (let iter = 0; iter < maxIter; iter++) {
    if (fb * fc > 0) {
      c = a;
      fc = fa;
      d = b - a;
      e = d;
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b;
      b = c;
      c = a;
      fa = fb;
      fb = fc;
      fc = fa;
    }

    const m = 0.5 * (c - b);
    const tolAct = 2 * 2.220446049250313e-16 * Math.abs(b) + 0.5 * tol;

    if (Math.abs(m) <= tolAct || fb === 0) {
      return b;
    }

    if (Math.abs(e) >= tolAct && Math.abs(fa) > Math.abs(fb)) {
      let s = fb / fa;
      let p: number;
      let q: number;

      if (a === c) {
        p = 2 * m * s;
        q = 1 - s;
      } else {
        q = fa / fc;
        const r = fb / fc;
        p = s * (2 * m * q * (q - r) - (b - a) * (r - 1));
        q = (q - 1) * (r - 1) * (s - 1);
      }

      if (p > 0) q = -q;
      else p = -p;

      if (2 * p < Math.min(3 * m * q - Math.abs(tolAct * q), Math.abs(e * q))) {
        e = d;
        d = p / q;
      } else {
        d = m;
        e = m;
      }
    } else {
      d = m;
      e = m;
    }

    a = b;
    fa = fb;
    if (Math.abs(d) > tolAct) b += d;
    else b += m > 0 ? tolAct : -tolAct;
    fb = f(b);
  }

  return b;
}

/**
 * Nelder-Mead Simplex optimization for multi-dimensional non-linear least squares
 */
export interface NelderMeadOptions {
  maxIter?: number;
  tol?: number;
  alpha?: number; // reflection
  gamma?: number; // expansion
  rho?: number;   // contraction
  sigma?: number; // shrink
  lowerBounds?: number[];
  upperBounds?: number[];
}

export function nelderMead(
  costFunc: (params: number[]) => number,
  initialParams: number[],
  options: NelderMeadOptions = {}
): { params: number[]; cost: number; iterations: number } {
  const n = initialParams.length;
  const maxIter = options.maxIter || 2000;
  const tol = options.tol || 1e-7;
  const alpha = options.alpha || 1.0;
  const gamma = options.gamma || 2.0;
  const rho = options.rho || 0.5;
  const sigma = options.sigma || 0.5;

  const clamp = (p: number[]) => {
    return p.map((val, idx) => {
      let v = val;
      if (options.lowerBounds && v < options.lowerBounds[idx]) {
        v = options.lowerBounds[idx];
      }
      if (options.upperBounds && v > options.upperBounds[idx]) {
        v = options.upperBounds[idx];
      }
      return v;
    });
  };

  // Penalized cost function to enforce bounds
  const penaltyCost = (p: number[]) => {
    let penalty = 0;
    for (let i = 0; i < n; i++) {
      if (options.lowerBounds && p[i] < options.lowerBounds[i]) {
        const diff = options.lowerBounds[i] - p[i];
        penalty += 1e5 * diff * diff;
      }
      if (options.upperBounds && p[i] > options.upperBounds[i]) {
        const diff = p[i] - options.upperBounds[i];
        penalty += 1e5 * diff * diff;
      }
    }
    return costFunc(p) + penalty;
  };

  // Initialize simplex of n+1 vertices
  const simplex: { point: number[]; val: number }[] = [];
  const startClamped = clamp(initialParams);
  simplex.push({ point: [...startClamped], val: penaltyCost(startClamped) });

  for (let i = 0; i < n; i++) {
    const pt = [...startClamped];
    const step = Math.abs(pt[i]) > 1e-5 ? pt[i] * 0.1 : 0.05;
    pt[i] += step;
    const clamped = clamp(pt);
    simplex.push({ point: clamped, val: penaltyCost(clamped) });
  }

  let iter = 0;

  while (iter < maxIter) {
    iter++;
    // Sort simplex by function values ascending
    simplex.sort((a, b) => a.val - b.val);

    // Check convergence: standard deviation of function values
    const meanVal = simplex.reduce((acc, v) => acc + v.val, 0) / (n + 1);
    const variance =
      simplex.reduce((acc, v) => acc + Math.pow(v.val - meanVal, 2), 0) / (n + 1);
    if (Math.sqrt(variance) < tol) {
      break;
    }

    const best = simplex[0];
    const worst = simplex[n];
    const secondWorst = simplex[n - 1];

    // Centroid of all points except the worst
    const centroid: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        centroid[j] += simplex[i].point[j];
      }
    }
    for (let j = 0; j < n; j++) {
      centroid[j] /= n;
    }

    // 1. Reflection
    const reflected: number[] = new Array(n);
    for (let j = 0; j < n; j++) {
      reflected[j] = centroid[j] + alpha * (centroid[j] - worst.point[j]);
    }
    const valReflected = penaltyCost(reflected);

    if (valReflected >= best.val && valReflected < secondWorst.val) {
      simplex[n] = { point: reflected, val: valReflected };
      continue;
    }

    // 2. Expansion
    if (valReflected < best.val) {
      const expanded: number[] = new Array(n);
      for (let j = 0; j < n; j++) {
        expanded[j] = centroid[j] + gamma * (reflected[j] - centroid[j]);
      }
      const valExpanded = penaltyCost(expanded);
      if (valExpanded < valReflected) {
        simplex[n] = { point: expanded, val: valExpanded };
      } else {
        simplex[n] = { point: reflected, val: valReflected };
      }
      continue;
    }

    // 3. Contraction
    if (valReflected < worst.val) {
      // Outside contraction
      const contractedOut: number[] = new Array(n);
      for (let j = 0; j < n; j++) {
        contractedOut[j] = centroid[j] + rho * (reflected[j] - centroid[j]);
      }
      const valContractedOut = penaltyCost(contractedOut);
      if (valContractedOut <= valReflected) {
        simplex[n] = { point: contractedOut, val: valContractedOut };
        continue;
      }
    } else {
      // Inside contraction
      const contractedIn: number[] = new Array(n);
      for (let j = 0; j < n; j++) {
        contractedIn[j] = centroid[j] - rho * (centroid[j] - worst.point[j]);
      }
      const valContractedIn = penaltyCost(contractedIn);
      if (valContractedIn < worst.val) {
        simplex[n] = { point: contractedIn, val: valContractedIn };
        continue;
      }
    }

    // 4. Shrink
    for (let i = 1; i <= n; i++) {
      for (let j = 0; j < n; j++) {
        simplex[i].point[j] =
          best.point[j] + sigma * (simplex[i].point[j] - best.point[j]);
      }
      simplex[i].val = penaltyCost(simplex[i].point);
    }
  }

  simplex.sort((a, b) => a.val - b.val);
  return {
    params: clamp(simplex[0].point),
    cost: simplex[0].val,
    iterations: iter,
  };
}

/**
 * Gaussian Kernel Function
 */
export function gaussianKernel(u: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * u * u);
}

/**
 * Kernel Density Estimation with boundary reflection at t=0
 */
export function computeKDE(
  data: number[],
  evalPoints: number[],
  bandwidth?: number
): number[] {
  const n = data.length;
  if (n === 0) return evalPoints.map(() => 0);

  // Silverman's rule of thumb for bandwidth if not specified
  let h = bandwidth;
  if (!h || h <= 0) {
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const std = Math.sqrt(
      data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1 || 1)
    );
    // Interquartile range
    const sorted = [...data].sort((a, b) => a - b);
    const q75 = sorted[Math.floor(0.75 * n)];
    const q25 = sorted[Math.floor(0.25 * n)];
    const iqr = q75 - q25;
    const a = Math.min(std, iqr > 0 ? iqr / 1.34 : std);
    h = 0.9 * a * Math.pow(n, -0.2);
    if (h <= 0) h = 1.0;
  }

  return evalPoints.map((x) => {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const xi = data[i];
      // Boundary reflection at 0: add reflected point -xi
      const u1 = (x - xi) / h!;
      const u2 = (x + xi) / h!;
      sum += gaussianKernel(u1) + gaussianKernel(u2);
    }
    return sum / (n * h!);
  });
}

/**
 * Find local extrema (peaks and valleys) of a discrete function y = f(x)
 */
export function findDiscreteExtrema(
  x: number[],
  y: number[]
): { peaks: { x: number; y: number }[]; valleys: { x: number; y: number }[] } {
  const peaks: { x: number; y: number }[] = [];
  const valleys: { x: number; y: number }[] = [];

  for (let i = 1; i < x.length - 1; i++) {
    if (y[i] > y[i - 1] && y[i] > y[i + 1]) {
      peaks.push({ x: x[i], y: y[i] });
    } else if (y[i] < y[i - 1] && y[i] < y[i + 1]) {
      valleys.push({ x: x[i], y: y[i] });
    }
  }

  return { peaks, valleys };
}

/**
 * Kolmogorov-Smirnov cumulative probability approximation
 */
export function kolmogorovPValue(d: number, n: number): number {
  const en = Math.sqrt(n);
  const lambda = (en + 0.12 + 0.11 / en) * d;
  if (lambda <= 0) return 1.0;
  if (lambda > 3.0) return 0.0;

  // Asymptotic expansion: P(D > d) = 2 * sum_{j=1}^infty (-1)^{j-1} exp(-2 j^2 lambda^2)
  let sum = 0;
  for (let j = 1; j <= 100; j++) {
    const term = Math.pow(-1, j - 1) * Math.exp(-2 * j * j * lambda * lambda);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  return Math.min(1.0, Math.max(0.0, 2 * sum));
}

/**
 * Format scientific number with appropriate precision
 */
export function formatSci(val: number, decimals = 4): string {
  if (val === 0) return '0';
  const abs = Math.abs(val);
  if (abs >= 1e-3 && abs < 1e5) {
    return Number(val.toFixed(decimals)).toString();
  }
  return val.toExponential(decimals - 1);
}

/**
 * Solve linear system A * x = b via Gauss-Jordan elimination with partial pivoting
 * @param A n x n square coefficient matrix
 * @param b n x 1 right-hand side vector
 * @returns solution vector x
 */
export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  // Augmented matrix [A | b]
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > maxVal) {
        maxVal = Math.abs(M[r][col]);
        maxRow = r;
      }
    }

    if (maxVal < 1e-15) {
      // Singular or near-singular, add mild regularization
      M[col][col] += 1e-9;
    } else if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    const pivot = M[col][col];
    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r !== col) {
        const factor = M[r][col];
        for (let j = col; j <= n; j++) {
          M[r][j] -= factor * M[col][j];
        }
      }
    }
  }

  return M.map((row) => row[n]);
}
