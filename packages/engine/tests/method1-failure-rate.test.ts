import { describe, it } from 'vitest';
import { performance } from 'perf_hooks';
import { generateRegionMapWithConstraints } from '../src/region';
import { hasAtMostSolutions } from '../src/solver';

describe('Method 1 Failure Rate Analysis', () => {
  it('measures failure rate of generateRegionMapWithConstraints', () => {
    const sizes = [5, 6, 8, 12];
    const trialsPerSize = 50;

    const results: Record<
      number,
      { unique: number; nonUnique: number; rate: number; avgDuration: number }
    > = {};

    for (const size of sizes) {
      let unique = 0;
      let nonUnique = 0;
      const durations: number[] = [];

      for (let i = 0; i < trialsPerSize; i++) {
        const seed = `failure-rate-test-${size}x${size}-${i}`;

        const start = performance.now();
        const map = generateRegionMapWithConstraints(seed, size);
        const duration = performance.now() - start;
        durations.push(duration);

        const isUnique = hasAtMostSolutions(map, 1);

        if (isUnique) {
          unique++;
        } else {
          nonUnique++;
        }
      }

      const successRate = (unique / trialsPerSize) * 100;
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      results[size] = { unique, nonUnique, rate: successRate, avgDuration };

      console.log(
        `${size}x${size}: ${unique}/${trialsPerSize} unique (${successRate.toFixed(1)}% success rate) - avg ${avgDuration.toFixed(2)}ms`,
      );
    }

    // Log summary
    console.log('\n=== Summary ===');
    for (const [size, result] of Object.entries(results)) {
      console.log(
        `${size}x${size}: ${result.rate.toFixed(1)}% success rate (${result.unique} unique, ${result.nonUnique} non-unique) - avg ${result.avgDuration.toFixed(2)}ms per puzzle`,
      );
    }

    // We don't necessarily expect 100% success, but want to know the rate
    // Just log the results without failing the test
  });
});
