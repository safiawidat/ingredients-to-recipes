# KNN Recommendation Evaluation

This evaluation compares the production nearest-neighbor-style recipe ranking
with a simpler matched-ingredient-count baseline. It is deterministic,
source-controlled, in-memory tooling: it does not start the server, connect to
PostgreSQL, write data, or change production recommendation behavior.

## Ranking Methods

For the user's canonical ingredient set `U` and a recipe's canonical ingredient
set `R`, production ranking remains:

- `matched = |U ∩ R|`
- `missing = |R - U|`
- `score = matched / |R|`
- `distance = 1 - score`

Extra user ingredients do not reduce the score, and zero-overlap recipes are
excluded. Ties use coverage descending, missing count ascending, matched count
descending, recipe name ascending, then recipe ID ascending.

The evaluation-only baseline is:

> Rank recipes only by the number of ingredients the user already has.

It ranks by matched count descending, then recipe name and ID ascending. It
does not use coverage or missing count for ranking and does not call the KNN
engine or its comparator.

## Controlled Datasets

The adapter loads the 30 declared seed recipes and parses the two committed
235-recipe JSON batches through the real recipe-import schema. Canonical and
alias terms are resolved in memory from the controlled seed vocabulary.

| Purpose | Candidates | Publication rule |
|---|---:|---|
| Quality evaluation | 487 | Published recipes only, matching production eligibility |
| Small performance set | 30 | All seed records, including unpublished records |
| Medium performance set | 250 | Seed 30 plus the first 220 generated records |
| Large performance set | 500 | All controlled records |

The complete controlled collection contains 30 seed and 470 generated recipes:
487 published and 13 unpublished. Performance sets intentionally include
unpublished recipes because they measure pure engine candidate-set scaling,
not production eligibility.

## Quality Method

### Curated scenarios

The evaluator runs exactly 18 formula-driven scenarios:

1. exact match;
2. same matched count with different recipe sizes;
3. more matched ingredients but worse coverage;
4. equal coverage with different missing counts;
5. fully covered recipes with different matched counts;
6. recipe-name fallback;
7. recipe-ID fallback;
8. zero-overlap exclusion;
9. sparse pantry;
10. broad pantry with extra ingredients;
11. limit and fewer-than-K behavior;
12. repeat and reversed candidate-order determinism;
13. alias resolution equivalent to canonical input;
14. known and unknown terms;
15. cuisine eligibility;
16. maximum preparation-time eligibility;
17. dietary-type eligibility; and
18. allergen exclusion.

The four filter cases filter candidates before ranking, prove excluded recipes
do not appear, and prove survivor metrics are unchanged when the same survivor
set is ranked directly. They are evaluation-only checks, not a duplicate of
the repository filter suite.

Two report-ready disagreement cases demonstrate the algorithm distinction:

- With pantry `{tomato, onion}`, Compact Tomato Plate has `2/3` coverage and
  Broad Pantry Stew has `2/5`. The baseline ties them on two matches and places
  Broad Pantry Stew first by name; KNN places Compact Tomato Plate first.
- With pantry `{tomato, onion, garlic}`, a two-ingredient recipe scores `2/2 =
  1.0`, while a five-ingredient recipe scores `3/5 = 0.6`. The baseline selects
  the latter on three matches; KNN selects the fully covered recipe.

### Exact matches

Each of the 487 published recipes is evaluated using exactly its canonical
ingredient set with `limit = 1`. Success requires the source recipe at top-1,
score 1, distance 0, match percentage 100, and no missing ingredients.

### Aggregate comparison

Published candidates are sorted by recipe name and ID. For case indices 0–99,
the source index is `floor(caseIndex * 487 / 100)`. Its canonical ingredients
are sorted by name, and the lexicographically last
`1 + (caseIndex % min(3, ingredientCount - 1))` ingredients are removed. Both
rankers then receive the same pantry, all 487 candidates, and `K = 5`.

Top-5 coverage and missing-count values are averaged within each case before
being averaged across the 100 cases, so every pantry case has equal weight.

## Verified Quality Results

Verified locally on 2026-08-14:

| Result | KNN | Baseline |
|---|---:|---:|
| Curated evaluation scenarios | 18/18 passed | Included where applicable |
| Exact-match top-1 | 487/487 (100%) | Not an acceptance criterion |
| Average top-1 coverage | 0.726366 | 0.660336 |
| Average top-5 coverage | 0.557202 | 0.442115 |
| Average top-5 missing count | 2.102000 | 4.826000 |

The KNN and baseline top-1 recipe differed in 41 of 100 aggregate cases
(41.000000%). All deterministic correctness checks passed.

## Performance Method and Verified Run

Five fixed canonical pantry inputs are used: Sparse (3 ingredients), Medium
(8), Broad (15), Plant cross-family (10), and Protein/dairy (10). Every
dataset/input pair uses `limit = 20`, 50 warm-up iterations, and 500 measured
iterations timed with `performance.now()`. The five inputs are pooled into
2,500 duration samples per dataset size. p95 uses index
`ceil(0.95 * sampleCount) - 1`.

Verified local environment on 2026-08-14:

- Node: v22.18.0
- Platform: win32 x64
- OS release: 10.0.26200
- CPU: 11th Gen Intel(R) Core(TM) i7-11370H @ 3.30GHz
- Logical CPUs: 8
- Candidate sizes: 30, 250, 500
- KNN limit: 20
- Warm-ups: 50 per dataset/input pair
- Measurements: 500 per dataset/input pair

| Dataset size | Samples | Median ms | p95 ms | Mean ms |
|---:|---:|---:|---:|---:|
| 30 | 2500 | 0.039250 | 0.173700 | 0.068000 |
| 250 | 2500 | 0.483050 | 1.508900 | 0.641317 |
| 500 | 2500 | 1.107500 | 2.883500 | 1.423153 |

Timing results are environment-specific observations. They are not CI
thresholds and will naturally vary between runs and machines.

## Limitations

There is no subjective or real-user relevance dataset. This work therefore
does not measure precision, recall, F1, predictive accuracy, statistical
significance, or trained-model accuracy.

Coverage is mathematically aligned with the KNN score, so higher coverage is
expected and is not independent statistical proof that recommendations are
more relevant. Supporting evidence is limited to missing-ingredient counts,
exact-match placement, formula-driven disagreement cases, deterministic
behavior, filter eligibility, and runtime at the controlled project scale.

The project should be described as using deterministic nearest-neighbor-style
ingredient-coverage ranking, not a trained machine-learning model.

## Reproduction

From the repository root:

```powershell
npm.cmd run typecheck:evaluation --prefix server
npm.cmd run test:knn-evaluation --prefix server
npm.cmd run evaluate:knn --prefix server
npm.cmd run benchmark:knn --prefix server
```

The evaluation and benchmark commands print results to standard output and do
not create machine-readable result files.
