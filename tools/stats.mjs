// Shared statistics for every lab's analyze.mjs.
// median: middle value, mean of the two middle values for an even count.
// quartiles: linear interpolation between order statistics (the "type 7" method).
// cv: sample standard deviation / mean.
export const quantile = (sorted, q) => {
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

export function describe(values) {
  const v = values.filter((x) => x != null);
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b), n = s.length;
  const mean = v.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  return { n, median: quantile(s, 0.5), min: s[0], max: s[n - 1], q1: quantile(s, 0.25), q3: quantile(s, 0.75), iqr: quantile(s, 0.75) - quantile(s, 0.25), mean, cv: sd / mean };
}

/** Ratio of medians A/B with its conservative range min(A)/max(B) to max(A)/min(B). */
export const ratio = (a, b) => ({ value: a.median / b.median, low: a.min / b.max, high: a.max / b.min });
