// Dependency-free multivariate linear regression (Ordinary Least Squares).
//
// Solves the normal equations  (XᵀX) β = Xᵀy  via Gaussian elimination.
// Features are standardized (z-scored) before fitting so columns on very
// different scales (age ≈ 30, height ≈ 170, weight ≈ 70) stay well-conditioned;
// the learned weights are converted back to the original feature space for
// interpretability.

export class LinearRegression {
  constructor() {
    this.mean = null; // per-feature mean (original space)
    this.std = null; // per-feature std  (original space)
    this.coef = null; // weights in standardized space: [intercept, w1..wd]
    this.r2 = null; // coefficient of determination on the training data
    this.n = 0; // number of training rows
    this.d = 0; // number of features
  }

  // X: number[][] (rows × features), y: number[]
  fit(X, y) {
    const n = X.length;
    if (n === 0) throw new Error("fit: empty training set");
    const d = X[0].length;
    this.n = n;
    this.d = d;

    // --- standardize features ---
    const mean = new Array(d).fill(0);
    const std = new Array(d).fill(0);
    for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j];
    for (let j = 0; j < d; j++) mean[j] /= n;
    for (const row of X) for (let j = 0; j < d; j++) std[j] += (row[j] - mean[j]) ** 2;
    for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j] / n) || 1; // guard zero-variance
    this.mean = mean;
    this.std = std;

    // --- design matrix A = [1, z1..zd] ---
    const p = d + 1;
    const A = X.map((row) => {
      const r = new Array(p);
      r[0] = 1;
      for (let j = 0; j < d; j++) r[j + 1] = (row[j] - mean[j]) / std[j];
      return r;
    });

    // --- normal equations: AtA β = Aty ---
    const AtA = Array.from({ length: p }, () => new Array(p).fill(0));
    const Aty = new Array(p).fill(0);
    for (let i = 0; i < n; i++) {
      const ai = A[i];
      const yi = y[i];
      for (let a = 0; a < p; a++) {
        Aty[a] += ai[a] * yi;
        for (let b = a; b < p; b++) AtA[a][b] += ai[a] * ai[b];
      }
    }
    for (let a = 0; a < p; a++) for (let b = 0; b < a; b++) AtA[a][b] = AtA[b][a]; // symmetric

    this.coef = solveLinearSystem(AtA, Aty);

    // --- training R² ---
    const yMean = y.reduce((s, v) => s + v, 0) / n;
    let ssRes = 0;
    let ssTot = 0;
    for (let i = 0; i < n; i++) {
      const pred = this._predictStd(A[i]);
      ssRes += (y[i] - pred) ** 2;
      ssTot += (y[i] - yMean) ** 2;
    }
    this.r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
    return this;
  }

  // Internal: dot product of a standardized design row with the weights.
  _predictStd(designRow) {
    let s = 0;
    for (let a = 0; a < this.coef.length; a++) s += this.coef[a] * designRow[a];
    return s;
  }

  // Predict for one raw feature vector (original units).
  predict(features) {
    if (!this.coef) throw new Error("predict: model is not fitted");
    let s = this.coef[0];
    for (let j = 0; j < this.d; j++) {
      const z = (features[j] - this.mean[j]) / this.std[j];
      s += this.coef[j + 1] * z;
    }
    return s;
  }

  // Weights expressed in the original (un-standardized) feature space:
  // { intercept, weights: number[] } such that
  //   y ≈ intercept + Σ weights[j] * features[j]
  rawCoefficients() {
    const weights = new Array(this.d);
    let intercept = this.coef[0];
    for (let j = 0; j < this.d; j++) {
      const w = this.coef[j + 1] / this.std[j];
      weights[j] = w;
      intercept -= w * this.mean[j];
    }
    return { intercept, weights };
  }
}

// Solve a square linear system M·x = b with Gaussian elimination + partial pivoting.
function solveLinearSystem(M, b) {
  const n = b.length;
  // augmented copy
  const a = M.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // partial pivot: largest magnitude in this column
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) throw new Error("singular matrix");
    if (pivot !== col) [a[col], a[pivot]] = [a[pivot], a[col]];

    // eliminate below
    for (let r = col + 1; r < n; r++) {
      const factor = a[r][col] / a[col][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) a[r][c] -= factor * a[col][c];
    }
  }

  // back-substitution
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = a[r][n];
    for (let c = r + 1; c < n; c++) s -= a[r][c] * x[c];
    x[r] = s / a[r][r];
  }
  return x;
}
