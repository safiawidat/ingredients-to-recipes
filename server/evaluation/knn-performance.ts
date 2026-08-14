import { arch, cpus, platform, release } from 'node:os';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { findKNearestRecipes } from '../src/app/services/knn-recommendation-engine.js';
import {
  loadEvaluationDataset,
  resolveUserIngredientTerms,
  toCandidates,
} from './knn-dataset.js';

export const BENCHMARK_LIMIT = 20;
export const WARM_UP_ITERATIONS = 50;
export const MEASURED_ITERATIONS = 500;

export const benchmarkInputDefinitions = [
  {
    name: 'Sparse',
    ingredients: ['tomato', 'onion', 'garlic'],
  },
  {
    name: 'Medium',
    ingredients: [
      'tomato',
      'onion',
      'garlic',
      'olive oil',
      'rice',
      'chickpea',
      'lemon',
      'parsley',
    ],
  },
  {
    name: 'Broad',
    ingredients: [
      'olive oil',
      'garlic',
      'onion',
      'salt',
      'black pepper',
      'tomato',
      'lemon',
      'paprika',
      'cumin',
      'parsley',
      'rice',
      'chickpea',
      'carrot',
      'bell pepper',
      'spinach',
    ],
  },
  {
    name: 'Plant cross-family',
    ingredients: [
      'chickpea',
      'brown lentil',
      'black bean',
      'tofu',
      'rice',
      'quinoa',
      'couscous',
      'tomato',
      'cucumber',
      'tahini',
    ],
  },
  {
    name: 'Protein/dairy',
    ingredients: [
      'chicken breast',
      'ground beef',
      'salmon',
      'tuna',
      'egg',
      'potato',
      'broccoli',
      'milk',
      'yogurt',
      'cheddar cheese',
    ],
  },
] as const;

export interface BenchmarkEnvironment {
  nodeVersion: string;
  platform: string;
  architecture: string;
  osRelease: string;
  cpuModel: string;
  logicalCpuCount: number;
  datasetSizes: number[];
  knnLimit: number;
  warmUpIterations: number;
  measuredIterations: number;
  inputs: Array<{ name: string; ingredients: readonly string[] }>;
}

export interface BenchmarkStatistics {
  datasetSize: number;
  samples: number;
  medianMilliseconds: number;
  p95Milliseconds: number;
  meanMilliseconds: number;
}

export interface BenchmarkRun {
  environment: BenchmarkEnvironment;
  results: BenchmarkStatistics[];
}

const median = (sortedValues: readonly number[]): number => {
  const midpoint = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 1) return sortedValues[midpoint] ?? 0;
  return ((sortedValues[midpoint - 1] ?? 0) + (sortedValues[midpoint] ?? 0)) / 2;
};

const summarizeDurations = (
  datasetSize: number,
  durations: readonly number[],
): BenchmarkStatistics => {
  const sorted = [...durations].sort((left, right) => left - right);
  const p95Index = Math.ceil(0.95 * sorted.length) - 1;
  return {
    datasetSize,
    samples: sorted.length,
    medianMilliseconds: median(sorted),
    p95Milliseconds: sorted[p95Index] ?? 0,
    meanMilliseconds:
      sorted.reduce((sum, duration) => sum + duration, 0) / sorted.length,
  };
};

export const runKnnBenchmark = (): BenchmarkRun => {
  const dataset = loadEvaluationDataset();
  const benchmarkDatasets = [
    dataset.seed,
    dataset.all.slice(0, 250),
    dataset.all,
  ];
  const resolvedInputs = benchmarkInputDefinitions.map((definition) => {
    const resolution = resolveUserIngredientTerms(definition.ingredients);
    if (
      resolution.unknownIngredients.length > 0 ||
      resolution.recognizedIngredients.length !== definition.ingredients.length
    ) {
      throw new Error(`Invalid benchmark input: ${definition.name}`);
    }
    return resolution.recognizedIngredients.map(({ id }) => id);
  });

  const results: BenchmarkStatistics[] = [];
  for (const records of benchmarkDatasets) {
    const candidates = toCandidates(records);
    const durations: number[] = [];
    for (const userIngredientIds of resolvedInputs) {
      for (let iteration = 0; iteration < WARM_UP_ITERATIONS; iteration += 1) {
        findKNearestRecipes({
          userIngredientIds,
          candidates,
          limit: BENCHMARK_LIMIT,
        });
      }
      for (let iteration = 0; iteration < MEASURED_ITERATIONS; iteration += 1) {
        const start = performance.now();
        findKNearestRecipes({
          userIngredientIds,
          candidates,
          limit: BENCHMARK_LIMIT,
        });
        durations.push(performance.now() - start);
      }
    }
    results.push(summarizeDurations(candidates.length, durations));
  }

  const cpuList = cpus();
  return {
    environment: {
      nodeVersion: process.version,
      platform: platform(),
      architecture: arch(),
      osRelease: release(),
      cpuModel: cpuList[0]?.model ?? 'unknown',
      logicalCpuCount: cpuList.length,
      datasetSizes: results.map(({ datasetSize }) => datasetSize),
      knnLimit: BENCHMARK_LIMIT,
      warmUpIterations: WARM_UP_ITERATIONS,
      measuredIterations: MEASURED_ITERATIONS,
      inputs: benchmarkInputDefinitions.map(({ name, ingredients }) => ({
        name,
        ingredients,
      })),
    },
    results,
  };
};

export const formatBenchmarkRun = (run: BenchmarkRun): string => {
  const { environment } = run;
  const lines = [
    'KNN performance benchmark',
    `Node: ${environment.nodeVersion}`,
    `Platform: ${environment.platform} ${environment.architecture} (${environment.osRelease})`,
    `CPU: ${environment.cpuModel}; logical CPUs: ${environment.logicalCpuCount}`,
    `Configuration: limit=${environment.knnLimit}; warm-ups=${environment.warmUpIterations}; measured=${environment.measuredIterations} per dataset/input pair`,
    `Inputs: ${environment.inputs.map(({ name, ingredients }) => `${name} (${ingredients.length})`).join(', ')}`,
    '',
    'Dataset size | Samples | Median ms | p95 ms | Mean ms',
    '---: | ---: | ---: | ---: | ---:',
  ];
  for (const result of run.results) {
    lines.push(
      `${result.datasetSize} | ${result.samples} | ${result.medianMilliseconds.toFixed(6)} | ${result.p95Milliseconds.toFixed(6)} | ${result.meanMilliseconds.toFixed(6)}`,
    );
  }
  return lines.join('\n');
};

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedPath === import.meta.url) {
  try {
    console.info(formatBenchmarkRun(runKnnBenchmark()));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
