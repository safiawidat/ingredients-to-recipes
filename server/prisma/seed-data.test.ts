import { describe, expect, it } from 'vitest';

import { normalizeIngredientInputs } from '../src/app/utils/ingredient-normalization.js';
import {
  seedAliases,
  seedAllergens,
  seedDietTags,
  seedIngredientCategories,
  seedIngredients,
  seedManifest,
  seedRecipeIngredientCount,
  seedRecipes,
  validateSeedManifest,
} from './seed-data.js';
import type { SeedManifest, SeedRecipe } from './seed-data.js';

const duplicateValues = (values: readonly string[]): string[] =>
  values.filter((value, index) => values.indexOf(value) !== index);

const withRecipe = (
  recipe: SeedRecipe,
  index = 0,
): SeedManifest => ({
  ...seedManifest,
  recipes: seedRecipes.map((currentRecipe, currentIndex) =>
    currentIndex === index ? recipe : currentRecipe,
  ),
});

describe('controlled seed manifest', () => {
  it('contains exactly 60 canonical ingredients', () => {
    expect(seedIngredients).toHaveLength(60);
  });

  it('contains exactly 30 aliases', () => {
    expect(seedAliases).toHaveLength(30);
  });

  it('contains exactly 30 recipes with a 27/3 publication split', () => {
    expect(seedRecipes).toHaveLength(30);
    expect(seedRecipes.filter(({ isPublished }) => isPublished)).toHaveLength(
      27,
    );
    expect(seedRecipes.filter(({ isPublished }) => !isPublished)).toHaveLength(
      3,
    );
  });

  it('uses unique normalized canonical ingredient names', () => {
    expect(duplicateValues(seedIngredients)).toEqual([]);
    expect(normalizeIngredientInputs([...seedIngredients])).toEqual(
      seedIngredients,
    );
  });

  it('uses unique normalized aliases without canonical-name collisions', () => {
    const aliases = seedAliases.map(({ alias }) => alias);
    const canonicalNames = new Set<string>(seedIngredients);

    expect(duplicateValues(aliases)).toEqual([]);
    expect(normalizeIngredientInputs(aliases)).toEqual(aliases);
    expect(aliases.filter((alias) => canonicalNames.has(alias))).toEqual([]);
  });

  it('points every alias to a canonical ingredient', () => {
    const canonicalNames = new Set<string>(seedIngredients);

    expect(
      seedAliases.filter(({ ingredient }) => !canonicalNames.has(ingredient)),
    ).toEqual([]);
  });

  it('uses unique deterministic recipe IDs', () => {
    const recipeIds = seedRecipes.map(({ id }) => id);

    expect(duplicateValues(recipeIds)).toEqual([]);
    expect(
      recipeIds.every((id) =>
        /^seed-recipe-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id),
      ),
    ).toBe(true);
  });

  it('gives every recipe valid and non-duplicated canonical ingredients', () => {
    const canonicalNames = new Set<string>(seedIngredients);

    for (const recipe of seedRecipes) {
      const ingredientNames = recipe.ingredients.map(
        ({ ingredient }) => ingredient,
      );

      expect(ingredientNames.length).toBeGreaterThan(0);
      expect(duplicateValues(ingredientNames)).toEqual([]);
      expect(
        ingredientNames.every((ingredient) => canonicalNames.has(ingredient)),
      ).toBe(true);
    }
  });

  it('uses valid categories, quantities, and non-empty units', () => {
    const categories = new Set<string>(seedIngredientCategories);

    for (const recipe of seedRecipes) {
      for (const ingredient of recipe.ingredients) {
        expect(categories.has(ingredient.category)).toBe(true);

        if (ingredient.quantity !== null) {
          expect(Number.isFinite(ingredient.quantity)).toBe(true);
          expect(ingredient.quantity).toBeGreaterThan(0);
        }

        if (ingredient.unit !== null) {
          expect(ingredient.unit.trim()).not.toBe('');
        }
      }
    }
  });

  it('uses all categories and keeps the intended complexity distribution', () => {
    const usedCategories = new Set(
      seedRecipes.flatMap(({ ingredients }) =>
        ingredients.map(({ category }) => category),
      ),
    );
    const simple = seedRecipes.filter(
      ({ ingredients }) => ingredients.length >= 3 && ingredients.length <= 4,
    );
    const medium = seedRecipes.filter(
      ({ ingredients }) => ingredients.length >= 5 && ingredients.length <= 8,
    );
    const complex = seedRecipes.filter(
      ({ ingredients }) => ingredients.length >= 9 && ingredients.length <= 12,
    );

    expect(usedCategories).toEqual(new Set(seedIngredientCategories));
    expect(simple).toHaveLength(6);
    expect(medium).toHaveLength(18);
    expect(complex).toHaveLength(6);
    expect(seedRecipeIngredientCount).toBeGreaterThanOrEqual(180);
    expect(seedRecipeIngredientCount).toBeLessThanOrEqual(220);
  });

  it('uses only unique normalized controlled tags and allergens', () => {
    const allowedTags = new Set<string>(seedDietTags);
    const allowedAllergens = new Set<string>(seedAllergens);

    for (const recipe of seedRecipes) {
      expect(duplicateValues(recipe.dietTags)).toEqual([]);
      expect(duplicateValues(recipe.allergens)).toEqual([]);

      for (const tag of recipe.dietTags) {
        expect(normalizeIngredientInputs([tag])).toEqual([tag]);
        expect(allowedTags.has(tag)).toBe(true);
      }

      for (const allergen of recipe.allergens) {
        expect(normalizeIngredientInputs([allergen])).toEqual([allergen]);
        expect(allowedAllergens.has(allergen)).toBe(true);
      }
    }
  });

  it('uses only null image and source URLs', () => {
    expect(
      seedRecipes.every(
        ({ imageUrl, sourceUrl }) => imageUrl === null && sourceUrl === null,
      ),
    ).toBe(true);
  });

  it('accepts the official manifest', () => {
    expect(() => validateSeedManifest()).not.toThrow();
  });
});

describe('validateSeedManifest', () => {
  it('rejects incorrect locked counts', () => {
    expect(() =>
      validateSeedManifest({
        ...seedManifest,
        ingredients: seedIngredients.slice(1),
      }),
    ).toThrow('expected 60 canonical ingredients');
  });

  it('rejects a non-normalized canonical ingredient', () => {
    expect(() =>
      validateSeedManifest({
        ...seedManifest,
        ingredients: [' Tomato ', ...seedIngredients.slice(1)],
      }),
    ).toThrow('canonical ingredient is not normalized');
  });

  it('rejects an alias collision and an unknown alias target', () => {
    expect(() =>
      validateSeedManifest({
        ...seedManifest,
        aliases: [
          { alias: 'tomato', ingredient: 'unknown ingredient' },
          ...seedAliases.slice(1),
        ],
      }),
    ).toThrow('alias collides with canonical ingredient');
  });

  it('rejects duplicate ingredients inside a recipe', () => {
    const recipe = seedRecipes[0];
    expect(recipe).toBeDefined();

    const duplicateRecipe: SeedRecipe = {
      ...recipe!,
      ingredients: [...recipe!.ingredients, recipe!.ingredients[0]!],
    };

    expect(() => validateSeedManifest(withRecipe(duplicateRecipe))).toThrow(
      'has duplicate ingredients',
    );
  });

  it('rejects invalid quantities and empty units', () => {
    const recipe = seedRecipes[0];
    expect(recipe).toBeDefined();

    const invalidRecipe: SeedRecipe = {
      ...recipe!,
      ingredients: recipe!.ingredients.map((ingredient, index) =>
        index === 0
          ? { ...ingredient, quantity: 0, unit: '   ' }
          : ingredient,
      ),
    };

    expect(() => validateSeedManifest(withRecipe(invalidRecipe))).toThrow(
      'has invalid quantity',
    );
  });
});
