import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { normalizeIngredientInput } from '../src/app/utils/ingredient-normalization.js';
import { recipeImportRequestSchema } from '../src/app/validation/recipe-import-schemas.js';
import {
  CONTROLLED_ALIAS_RECIPE_COUNT,
  CONTROLLED_BATCH_SIZE,
  CONTROLLED_PUBLISHED_COUNT,
  CONTROLLED_RECIPE_COUNT,
  controlledBatchFileNames,
  createControlledDatasetArtifacts,
  resolveControlledIngredient,
  toCanonicalSignature,
  toControlledRecipeNameKey,
} from './generate-controlled-recipe-dataset.js';
import {
  animalIngredients,
  controlledAllergenMap,
  controlledCommonIngredients,
  controlledCuisineCounts,
  controlledRecipeFamilies,
  controlledUnits,
  dairyIngredients,
  glutenIngredients,
  ingredientMeasures,
  meatAndFishIngredients,
} from './controlled-recipe-templates.js';
import { seedAliases, seedIngredients, seedRecipes } from './seed-data.js';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
const artifacts = createControlledDatasetArtifacts();

const countBy = <T extends string | number>(values: readonly T[]) =>
  Object.fromEntries(
    [...new Set(values)]
      .sort((left, right) => String(left).localeCompare(String(right)))
      .map((value) => [value, values.filter((candidate) => candidate === value).length]),
  );

const ingredientNames = (record: (typeof artifacts.records)[number]) =>
  record.recipe.ingredients.map(({ name }) => name);

const canonicalIngredientSet = (record: (typeof artifacts.records)[number]) =>
  new Set(ingredientNames(record).map((name) => resolveControlledIngredient(name)));

const containsAny = (
  ingredients: ReadonlySet<string | null>,
  candidates: readonly string[],
) => candidates.some((ingredient) => ingredients.has(ingredient));

const expectedDietTags = (record: (typeof artifacts.records)[number]) => {
  const ingredients = canonicalIngredientSet(record);
  const tags: string[] = [];
  if (!containsAny(ingredients, animalIngredients)) {
    tags.push('vegan');
  } else if (!containsAny(ingredients, meatAndFishIngredients)) {
    tags.push('vegetarian');
  }
  if (!containsAny(ingredients, dairyIngredients)) {
    tags.push('dairy-free');
  }
  if (!containsAny(ingredients, glutenIngredients)) {
    tags.push('gluten-free');
  }
  return tags;
};

const expectedAllergens = (record: (typeof artifacts.records)[number]) => {
  const allergens = new Set<string>();
  for (const ingredient of canonicalIngredientSet(record)) {
    if (!ingredient) {
      continue;
    }
    const mapped = controlledAllergenMap[
      ingredient as keyof typeof controlledAllergenMap
    ] as readonly string[] | undefined;
    for (const allergen of mapped ?? []) {
      allergens.add(allergen);
    }
  }
  return [...allergens].sort();
};

describe('controlled recipe dataset', () => {
  it('generates deterministically and matches the committed artifacts byte-for-byte', () => {
    const secondGeneration = createControlledDatasetArtifacts();
    expect(secondGeneration.serializedBatches).toEqual(artifacts.serializedBatches);

    for (const [index, fileName] of controlledBatchFileNames.entries()) {
      const committed = readFileSync(join(repositoryRoot, 'sample-data', fileName), 'utf8');
      expect(committed).toBe(artifacts.serializedBatches[index]);
      expect(committed.endsWith('\n')).toBe(true);
      expect(committed).not.toContain('\r\n');
    }
  });

  it('uses the exact overall, batch, publication, and family counts', () => {
    expect(artifacts.records).toHaveLength(CONTROLLED_RECIPE_COUNT);
    expect(artifacts.batches.map((batch) => batch.length)).toEqual([
      CONTROLLED_BATCH_SIZE,
      CONTROLLED_BATCH_SIZE,
    ]);
    expect(artifacts.records.filter(({ recipe }) => recipe.isPublished)).toHaveLength(
      CONTROLLED_PUBLISHED_COUNT,
    );
    expect(artifacts.records.filter(({ recipe }) => !recipe.isPublished)).toHaveLength(10);
    expect(countBy(artifacts.records.map(({ family }) => family))).toEqual(
      Object.fromEntries(
        controlledRecipeFamilies
          .map(({ label, count }) => [label, count])
          .sort(([left], [right]) => String(left).localeCompare(String(right))),
      ),
    );
  });

  it('uses the exact cuisine, complexity, and servings distributions', () => {
    expect(countBy(artifacts.records.map(({ recipe }) => recipe.cuisine ?? 'null'))).toEqual(
      controlledCuisineCounts,
    );

    const complexity = artifacts.records.map(({ recipe }) => {
      const count = recipe.ingredients.length;
      if (count <= 5) return 'simple';
      if (count <= 8) return 'medium';
      return 'complex';
    });
    expect(countBy(complexity)).toEqual({ complex: 70, medium: 306, simple: 94 });
    expect(countBy(artifacts.records.map(({ recipe }) => recipe.servings ?? 0))).toEqual({
      1: 24,
      2: 164,
      4: 242,
      6: 40,
    });
  });

  it('uses normalized-unique meaningful names without seed collisions', () => {
    const seedKeys = new Set(seedRecipes.map(({ name }) => toControlledRecipeNameKey(name)));
    const generatedKeys = artifacts.records.map(({ recipe }) =>
      toControlledRecipeNameKey(recipe.name),
    );

    expect(new Set(generatedKeys).size).toBe(CONTROLLED_RECIPE_COUNT);
    expect(generatedKeys.some((key) => seedKeys.has(key))).toBe(false);
    expect(artifacts.records.some(({ recipe }) => /\s\d+$/.test(recipe.name))).toBe(false);
  });

  it('uses unique canonical KNN signatures against generated and seed recipes', () => {
    const seedSignatures = new Set(
      seedRecipes.map((recipe) =>
        toCanonicalSignature(recipe.ingredients.map(({ ingredient }) => ingredient)),
      ),
    );
    const generatedSignatures = artifacts.records.map((record) =>
      toCanonicalSignature(ingredientNames(record)),
    );

    expect(new Set(generatedSignatures).size).toBe(CONTROLLED_RECIPE_COUNT);
    expect(generatedSignatures.some((signature) => seedSignatures.has(signature))).toBe(false);
  });

  it('keeps medium and complex siblings separated by multiple concepts', () => {
    for (const [index, left] of artifacts.records.entries()) {
      if (left.recipe.ingredients.length < 6) {
        continue;
      }
      const leftIngredients = new Set(left.canonicalIngredients);
      for (const right of artifacts.records.slice(index + 1)) {
        if (right.family !== left.family || right.recipe.ingredients.length < 6) {
          continue;
        }
        const rightIngredients = new Set(right.canonicalIngredients);
        const difference =
          [...leftIngredients].filter((ingredient) => !rightIngredients.has(ingredient)).length +
          [...rightIngredients].filter((ingredient) => !leftIngredients.has(ingredient)).length;
        expect(difference, `${left.recipe.name} / ${right.recipe.name}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('resolves every term with canonical precedence and the exact alias distribution', () => {
    for (const ingredient of seedIngredients) {
      expect(resolveControlledIngredient(ingredient)).toBe(ingredient);
    }
    for (const { alias, ingredient } of seedAliases) {
      expect(resolveControlledIngredient(alias)).toBe(ingredient);
    }

    const aliasNames = new Set(seedAliases.map(({ alias }) => alias));
    const aliasCounts = artifacts.records.map(
      (record) => ingredientNames(record).filter((name) => aliasNames.has(name)).length,
    );
    expect(aliasCounts.filter((count) => count === 0)).toHaveLength(450);
    expect(aliasCounts.filter((count) => count === 1)).toHaveLength(
      CONTROLLED_ALIAS_RECIPE_COUNT,
    );
    expect(aliasCounts.some((count) => count > 1)).toBe(false);

    for (const record of artifacts.records) {
      const resolved = ingredientNames(record).map(resolveControlledIngredient);
      expect(resolved.every((ingredient) => ingredient !== null)).toBe(true);
      expect(new Set(resolved).size).toBe(resolved.length);
    }
  });

  it('passes the real importer schema with no generator metadata in JSON', () => {
    const recipeKeys = [
      'allergens', 'cuisine', 'description', 'dietTags', 'imageUrl', 'ingredients',
      'instructions', 'isPublished', 'name', 'preparationTime', 'servings', 'sourceUrl',
    ].sort();
    const ingredientKeys = ['category', 'name', 'quantity', 'unit'].sort();

    for (const batch of artifacts.batches) {
      expect(recipeImportRequestSchema.safeParse({ recipes: batch }).success).toBe(true);
      for (const recipe of batch) {
        expect(Object.keys(recipe).sort()).toEqual(recipeKeys);
        for (const ingredient of recipe.ingredients) {
          expect(Object.keys(ingredient).sort()).toEqual(ingredientKeys);
        }
      }
    }
  });

  it('uses controlled categories, measures, ingredient counts, and units', () => {
    const allowedCategories = new Set(['MAIN', 'SIDE', 'OTHER']);
    const allowedUnits = new Set<string>(controlledUnits);

    for (const record of artifacts.records) {
      expect(record.recipe.ingredients.length).toBeGreaterThanOrEqual(3);
      expect(record.recipe.ingredients.length).toBeLessThanOrEqual(12);
      expect(record.recipe.ingredients.some(({ category }) => category === 'MAIN')).toBe(true);

      for (const ingredient of record.recipe.ingredients) {
        const canonical = resolveControlledIngredient(ingredient.name);
        expect(canonical).not.toBeNull();
        expect(allowedCategories.has(ingredient.category)).toBe(true);
        expect((ingredient.quantity === null) === (ingredient.unit === null)).toBe(true);
        if (ingredient.unit !== null) {
          expect(allowedUnits.has(ingredient.unit)).toBe(true);
        }
        expect({ quantity: ingredient.quantity, unit: ingredient.unit }).toEqual(
          ingredientMeasures[canonical as string],
        );
      }
    }
  });

  it('uses concise content and family-appropriate preparation times', () => {
    const familiesByLabel = new Map(
      controlledRecipeFamilies.map((family) => [family.label, family]),
    );

    for (const record of artifacts.records) {
      const family = familiesByLabel.get(record.family);
      expect(family).toBeDefined();
      expect(record.recipe.description).not.toBeNull();
      expect(record.recipe.description?.trim().length).toBeGreaterThan(20);
      expect(record.recipe.instructions.trim().length).toBeGreaterThan(20);
      const sentences = record.recipe.instructions
        .split(/[.!?]+/)
        .filter((sentence) => sentence.trim().length > 0);
      expect(sentences.length).toBeGreaterThanOrEqual(1);
      expect(sentences.length).toBeLessThanOrEqual(3);
      expect(record.recipe.preparationTime! % 5).toBe(0);
      expect(family?.preparationTimes).toContain(record.recipe.preparationTime);
    }
  });

  it('derives the exact allowed diet tags and allergens from ingredients', () => {
    const allowedDietTags = new Set(['vegan', 'vegetarian', 'dairy-free', 'gluten-free']);
    const allowedAllergens = new Set([
      'dairy', 'egg', 'fish', 'gluten', 'peanut', 'sesame', 'soy', 'tree-nut',
    ]);

    for (const record of artifacts.records) {
      expect(record.recipe.dietTags).toEqual(expectedDietTags(record));
      expect(record.recipe.dietTags.every((tag) => allowedDietTags.has(tag))).toBe(true);
      expect(record.recipe.dietTags).not.toContain('high-protein');
      expect(record.recipe.allergens).toEqual(expectedAllergens(record));
      expect(record.recipe.allergens.every((tag) => allowedAllergens.has(tag))).toBe(true);
    }
  });

  it('uses null URLs and only the approved cuisine labels', () => {
    const allowedCuisines = new Set(Object.keys(controlledCuisineCounts));
    for (const { recipe } of artifacts.records) {
      expect(recipe.imageUrl).toBeNull();
      expect(recipe.sourceUrl).toBeNull();
      expect(recipe.cuisine === null ? false : allowedCuisines.has(recipe.cuisine)).toBe(true);
    }
  });

  it('keeps every published concept testable and no concept above 35 percent', () => {
    const published = artifacts.records.filter(({ recipe }) => recipe.isPublished);
    const maximum = Math.floor(CONTROLLED_RECIPE_COUNT * 0.35);

    for (const ingredient of seedIngredients) {
      const publishedCount = published.filter((record) =>
        record.canonicalIngredients.includes(ingredient),
      ).length;
      const totalCount = artifacts.records.filter((record) =>
        record.canonicalIngredients.includes(ingredient),
      ).length;
      expect(publishedCount, ingredient).toBeGreaterThanOrEqual(8);
      expect(totalCount, ingredient).toBeLessThanOrEqual(maximum);
    }

    for (const ingredient of controlledCommonIngredients) {
      const count = published.filter((record) =>
        record.canonicalIngredients.includes(ingredient),
      ).length;
      expect(count, ingredient).toBeGreaterThanOrEqual(70);
      expect(count, ingredient).toBeLessThanOrEqual(165);
    }
  });

  it('writes valid LF JSON files below the one MiB boundary', () => {
    for (const contents of artifacts.serializedBatches) {
      expect(() => JSON.parse(contents) as unknown).not.toThrow();
      expect(Buffer.byteLength(contents, 'utf8')).toBeLessThan(1_048_576);
      expect(contents.endsWith('\n')).toBe(true);
      expect(contents).not.toContain('\r');
    }
  });

  it('keeps controlled vocabulary and artifacts normalized', () => {
    for (const ingredient of seedIngredients) {
      expect(normalizeIngredientInput(ingredient)).toBe(ingredient);
    }
    for (const { alias } of seedAliases) {
      expect(normalizeIngredientInput(alias)).toBe(alias);
    }
  });
});
