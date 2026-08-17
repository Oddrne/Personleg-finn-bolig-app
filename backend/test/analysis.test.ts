import { describe, expect, it } from 'vitest';

function score(avgGrade: number) {
  const fairValueEstimate = Math.round(5000000 * (1 - Math.max(0, avgGrade - 1) * 0.07));
  const valueScore = Math.max(0, Math.min(100, Math.round(100 - avgGrade * 22 + ((fairValueEstimate - 5000000) / 5000000) * 100)));
  return { fairValueEstimate, valueScore };
}

describe('analysis scoring', () => {
  it('penalizes high condition grades', () => {
    const low = score(1);
    const high = score(2.5);
    expect(high.fairValueEstimate).toBeLessThan(low.fairValueEstimate);
    expect(high.valueScore).toBeLessThan(low.valueScore);
  });
});
