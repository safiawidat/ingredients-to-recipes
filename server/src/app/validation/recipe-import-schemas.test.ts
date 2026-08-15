import { describe, expect, it } from 'vitest';

import {
  MAX_IMPORT_RECIPES,
  recipeImportRequestSchema,
} from './recipe-import-schemas.js';

const validIngredient = () => ({
  name: '  Tomato  ',
  quantity: 2,
  unit: ' whole ',
  category: 'MAIN',
});

const validRecipe = () => ({
  name: '  Tomato Basil Pasta  ',
  description: ' A simple tomato pasta. ',
  instructions: ' Cook the pasta. ',
  cuisine: ' Italian-inspired ',
  preparationTime: 20,
  servings: 2,
  imageUrl: null,
  sourceUrl: 'https://example.com/recipe',
  dietTags: [' Vegan ', 'vegan'],
  allergens: [' Gluten '],
  isPublished: true,
  ingredients: [validIngredient()],
});

describe('recipeImportRequestSchema', () => {
  it('parses the strict canonical payload and applies existing normalization', () => {
    const result = recipeImportRequestSchema.parse({ recipes: [validRecipe()] });

    expect(result.recipes[0]).toMatchObject({
      name: 'Tomato Basil Pasta',
      description: 'A simple tomato pasta.',
      instructions: 'Cook the pasta.',
      cuisine: 'Italian-inspired',
      sourceUrl: 'https://example.com/recipe',
      dietTags: ['vegan'],
      allergens: ['gluten'],
      ingredients: [
        { name: 'Tomato', quantity: 2, unit: 'whole', category: 'MAIN' },
      ],
    });
  });

  it('accepts explicit null for every nullable field', () => {
    const recipe = validRecipe();
    recipe.description = null as unknown as string;
    recipe.cuisine = null as unknown as string;
    recipe.preparationTime = null as unknown as number;
    recipe.servings = null as unknown as number;
    recipe.sourceUrl = null as unknown as string;
    recipe.ingredients[0] = {
      ...validIngredient(),
      quantity: null as unknown as number,
      unit: null as unknown as string,
    };

    expect(
      recipeImportRequestSchema.safeParse({ recipes: [recipe] }).success,
    ).toBe(true);
  });

  it.each([
    ['strict wrapper', { recipes: [], extra: true }],
    ['strict recipe', { recipes: [{ ...validRecipe(), extra: true }] }],
    [
      'strict ingredient',
      {
        recipes: [
          {
            ...validRecipe(),
            ingredients: [{ ...validIngredient(), extra: true }],
          },
        ],
      },
    ],
  ])('rejects unexpected properties in the %s', (_label, payload) => {
    expect(recipeImportRequestSchema.safeParse(payload).success).toBe(false);
  });

  it('requires all canonical fields, including nullable fields', () => {
    const missingDescription: Partial<ReturnType<typeof validRecipe>> =
      validRecipe();
    delete missingDescription.description;

    expect(
      recipeImportRequestSchema.safeParse({ recipes: [missingDescription] })
        .success,
    ).toBe(false);
  });

  it('requires between one and 500 recipes', () => {
    expect(recipeImportRequestSchema.safeParse({ recipes: [] }).success).toBe(
      false,
    );
    expect(
      recipeImportRequestSchema.safeParse({
        recipes: Array.from({ length: MAX_IMPORT_RECIPES + 1 }, validRecipe),
      }).success,
    ).toBe(false);
  });

  it.each([
    ['name', { name: 'A' }],
    ['instructions', { instructions: ' '.repeat(2) }],
    ['description', { description: '' }],
    ['cuisine', { cuisine: 'x'.repeat(101) }],
    ['preparation time', { preparationTime: 1441 }],
    ['servings', { servings: 101 }],
    ['image URL protocol', { imageUrl: 'javascript:alert(1)' }],
    ['source URL protocol', { sourceUrl: 'ftp://example.com/recipe' }],
    ['tag length', { dietTags: ['x'.repeat(101)] }],
    ['tag count', { allergens: Array.from({ length: 51 }, (_, i) => `a${i}`) }],
  ])('rejects invalid %s', (_label, change) => {
    expect(
      recipeImportRequestSchema.safeParse({
        recipes: [{ ...validRecipe(), ...change }],
      }).success,
    ).toBe(false);
  });

  it.each([
    ['empty ingredients', []],
    [
      'too many ingredients',
      Array.from({ length: 101 }, (_, i) => ({
        ...validIngredient(),
        name: `ingredient ${i}`,
      })),
    ],
  ])('rejects %s', (_label, ingredients) => {
    expect(
      recipeImportRequestSchema.safeParse({
        recipes: [{ ...validRecipe(), ingredients }],
      }).success,
    ).toBe(false);
  });

  it.each([
    ['blank name', { name: ' ' }],
    ['nonpositive quantity', { quantity: 0 }],
    ['nonfinite quantity', { quantity: Number.POSITIVE_INFINITY }],
    ['blank unit', { unit: ' ' }],
    ['long unit', { unit: 'x'.repeat(51) }],
    ['invalid category', { category: 'PRIMARY' }],
  ])('rejects ingredient %s', (_label, change) => {
    expect(
      recipeImportRequestSchema.safeParse({
        recipes: [
          {
            ...validRecipe(),
            ingredients: [{ ...validIngredient(), ...change }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
