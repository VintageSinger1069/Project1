export type ComponentFailureUnit = 'hours' | 'cycles' | 'km' | 'miles' | 'megarevs';

export interface FailureDataPoint {
  id: string;
  time: number;
  count: number;
  censored?: boolean;
  notes?: string;
}

export interface DatasetMetadata {
  title: string;
  componentType: string;
  unit: ComponentFailureUnit;
  sampleSize: number;
  censoredCount: number;
  applicationContext: string;
  temperature?: string;
  testStandard?: string; // e.g. AEC-Q100, ISO 16750, USCAR-2
}

export interface ExtremumPoint {
  time: number;
  density: number;
  type: 'peak' | 'valley' | 'inflection';
  secondDerivative: number;
  reliability: number;
  failureRate: number;
  description: string;
}

export type ModelType =
  | 'moussaoui_poly5'
  | 'multimodal_mixture'
  | 'log_polynomial'
  | 'generalized_bathtub';

export interface MixtureComponent {
  index: number;
  weight: number; // w_k
  beta: number;   // shape parameter (Weibull) or sigma (LogNormal)
  eta: number;    // scale parameter (characteristic life)
  mtbf: number;   // component MTBF
  name: string;   // e.g. "Early Vibration / Infant Mortality Mode", "Wear-out Fatigue Mode"
}

export interface GoodnessOfFit {
  rSquaredPdf: number;
  rSquaredCdf: number;
  adjRSquared: number;
  rmse: number;
  ksStatistic: number;
  ksPValue: number;
  andersonDarling: number;
  aic: number;
  bic: number;
  degreesOfFreedom: number;
}

export interface CurvePoint {
  t: number;
  pdf: number;
  cdf: number;
  reliability: number;
  hazard: number;
  d1: number;
  d2: number;
  cumulativeMtbf: number; // Accumulated expected life ∫_0^t R(u) du
  residualLife: number;   // Mean Residual Lifetime (Remaining Useful Life): [∫_t^∞ R(u) du] / R(t)
}

export interface EmpiricalPoint {
  time: number;
  rank: number;
  empiricalCdf: number;
  empiricalReliability: number;
  empiricalPdf: number;
  empiricalHazard: number;
}

export interface RegressionResult {
  modelType: ModelType;
  modelName: string;
  numExtrema: number;
  mixtureComponents?: MixtureComponent[];
  polynomialCoefficients?: number[]; // [a0, a1, a2, ...]
  bathtubParameters?: { alpha: number; beta: number; gamma: number };
  
  formulaLatex: {
    pdf: string;
    cdf: string;
    reliability: string;
    hazard: string;
    mtbf: string;
  };
  formulaText: {
    pdf: string;
    cdf: string;
    reliability: string;
    hazard: string;
    mtbf: string;
  };

  extrema: ExtremumPoint[];
  mtbf: number;
  variance: number;
  stdDev: number;
  b1Life: number;   // 99% reliability
  b10Life: number;  // 90% reliability (Automotive warranty standard)
  b50Life: number;  // Median lifetime
  
  goodnessOfFit: GoodnessOfFit;

  curvePoints: CurvePoint[];
  empiricalPoints: EmpiricalPoint[];

  // Time boundaries
  tMin: number;
  tMax: number;
  displayMax: number;
}

export interface AutomotivePreset {
  id: string;
  title: string;
  subtitle: string;
  componentType: string;
  unit: ComponentFailureUnit;
  environment: string;
  standard: string;
  recommendedExtrema: number;
  recommendedModel: ModelType;
  description: string;
  data: FailureDataPoint[];
}
