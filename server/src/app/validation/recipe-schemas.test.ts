import { describe, expect, it } from 'vitest';

import {
  createRecipeSchema,
  listRecipesQuerySchema,
  recipeIdParamSchema,
  updateRecipeSchema,
} from './recipe-schemas.js';

const validIngredients = [{ ingredientId: 'ingredient-1' }];

const minimalCreateInput = {
  name: 'Tomato Soup',
  instructions: 'Simmer everything.',
  ingredients: validIngredients,
};

describe('recipeIdParamSchema', () => {
  it('accepts a non-empty id and trims it', () => {
    const result = recipeIdParamSchema.safeParse({ id: '  recipe-1  ' });

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('recipe-1');
  });

  it('rejects an empty id', () => {
    expect(recipeIdParamSchema.safeParse({ id: '' }).success).toBe(false);
  });

  it('rejects a whitespace-only id', () => {
    expect(recipeIdParamSchema.safeParse({ id: '   ' }).success).toBe(false);
  });

  it('rejects a missing id', () => {
    expect(recipeIdParamSchema.safeParse({}).success).toBe(false);
  });
});

describe('listRecipesQuerySchema', () => {
  it('applies default page and pageSize when omitted', () => {
    const result = listRecipesQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('coerces string query values to numbers', () => {
    const result = listRecipesQuerySchema.safeParse({
      page: '2',
      pageSize: '15',
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ page: 2, pageSize: 15 });
  });

  it('coerces maxPreparationTime from a string', () => {
    const result = listRecipesQuerySchema.safeParse({
      maxPreparationTime: '30',
    });

    expect(result.success).toBe(true);
    expect(result.data?.maxPreparationTime).toBe(30);
  });

  it('accepts an optional cuisine filter', () => {
    const result = listRecipesQuerySchema.safeParse({ cuisine: 'Italian' });

    expect(result.success).toBe(true);
    expect(result.data?.cuisine).toBe('Italian');
  });

  it('rejects a non-numeric page', () => {
    expect(
      listRecipesQuerySchema.safeParse({ page: 'not-a-number' }).success,
    ).toBe(false);
  });

  it('rejects a zero page', () => {
    expect(listRecipesQuerySchema.safeParse({ page: 0 }).success).toBe(
      false,
    );
  });

  it('rejects a negative pageSize', () => {
    expect(
      listRecipesQuerySchema.safeParse({ pageSize: -5 }).success,
    ).toBe(false);
  });

  it('rejects a non-integer page', () => {
    expect(listRecipesQuerySchema.safeParse({ page: 1.5 }).success).toBe(
      false,
    );
  });

  it('rejects a pageSize over 100', () => {
    expect(
      listRecipesQuerySchema.safeParse({ pageSize: 101 }).success,
    ).toBe(false);
  });

  it('accepts a pageSize of exactly 100', () => {
    expect(
      listRecipesQuerySchema.safeParse({ pageSize: 100 }).success,
    ).toBe(true);
  });
});

describe('createRecipeSchema', () => {
  it('accepts a minimal valid recipe and applies defaults', () => {
    const result = createRecipeSchema.safeParse(minimalCreateInput);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'Tomato Soup',
      instructions: 'Simmer everything.',
      dietTags: [],
      allergens: [],
      isPublished: true,
      ingredients: [{ ingredientId: 'ingredient-1', category: 'OTHER' }],
    });
  });

  it('accepts a fully populated valid recipe', () => {
    const result = createRecipeSchema.safeParse({
      name: '  Tomato Soup  ',
      description: '  A warm soup  ',
      instructions: 'Simmer everything.',
      cuisine: '  Italian  ',
      preparationTime: 20,
      servings: 4,
      imageUrl: 'https://example.com/soup.jpg',
      sourceUrl: 'https://example.com/recipe',
      dietTags: [' Vegan ', 'VEGAN', 'gluten-free'],
      allergens: [' Nuts '],
      isPublished: false,
      ingredients: [
        { ingredientId: 'ingredient-1', quantity: 2.5, unit: 'cup', category: 'MAIN' },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Tomato Soup');
    expect(result.data?.description).toBe('A warm soup');
    expect(result.data?.cuisine).toBe('Italian');
    expect(result.data?.dietTags).toEqual(['vegan', 'gluten-free']);
    expect(result.data?.allergens).toEqual(['nuts']);
    expect(result.data?.isPublished).toBe(false);
  });

  it('rejects a name that is too short', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      name: 'A',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a name that is too long', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      name: 'A'.repeat(151),
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty instructions', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      instructions: '   ',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a zero preparation time', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      preparationTime: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a preparation time over the maximum', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      preparationTime: 1441,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a zero servings value', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      servings: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a servings value over the maximum', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      servings: 101,
    });

    expect(result.success).toBe(false);
  });

  it('accepts a null preparationTime and servings', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      preparationTime: null,
      servings: null,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid imageUrl', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      imageUrl: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid sourceUrl', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      sourceUrl: 'not-a-url',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty ingredients array', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      ingredients: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects duplicate ingredientIds', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      ingredients: [
        { ingredientId: 'ingredient-1' },
        { ingredientId: 'ingredient-1' },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a zero quantity', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      ingredients: [{ ingredientId: 'ingredient-1', quantity: 0 }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a negative quantity', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      ingredients: [{ ingredientId: 'ingredient-1', quantity: -1 }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a non-finite quantity', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      ingredients: [
        { ingredientId: 'ingredient-1', quantity: Number.POSITIVE_INFINITY },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid category', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      ingredients: [{ ingredientId: 'ingredient-1', category: 'DESSERT' }],
    });

    expect(result.success).toBe(false);
  });

  it('defaults category to OTHER when omitted', () => {
    const result = createRecipeSchema.safeParse(minimalCreateInput);

    expect(result.data?.ingredients[0]?.category).toBe('OTHER');
  });

  it('rejects an empty entry inside dietTags', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      dietTags: ['vegan', ''],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a whitespace-only entry inside allergens', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      allergens: ['   '],
    });

    expect(result.success).toBe(false);
  });

  it('trims, lowercases, and deduplicates dietTags', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      dietTags: [' Vegan ', 'vegan', 'VEGAN', 'Gluten-Free'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.dietTags).toEqual(['vegan', 'gluten-free']);
  });

  it('trims, lowercases, and deduplicates allergens', () => {
    const result = createRecipeSchema.safeParse({
      ...minimalCreateInput,
      allergens: [' Nuts ', 'nuts', 'NUTS'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.allergens).toEqual(['nuts']);
  });
});

describe('updateRecipeSchema', () => {
  it('accepts a valid partial update with a single field', () => {
    const result = updateRecipeSchema.safeParse({ name: 'Updated Soup' });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Updated Soup');
    expect(result.data?.ingredients).toBeUndefined();
  });

  it('rejects a completely empty update', () => {
    expect(updateRecipeSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an update where every field is explicitly undefined', () => {
    expect(
      updateRecipeSchema.safeParse({ name: undefined, cuisine: undefined })
        .success,
    ).toBe(false);
  });

  it('rejects an empty ingredients array when ingredients are provided', () => {
    const result = updateRecipeSchema.safeParse({ ingredients: [] });

    expect(result.success).toBe(false);
  });

  it('rejects duplicate ingredientIds when ingredients are provided', () => {
    const result = updateRecipeSchema.safeParse({
      ingredients: [
        { ingredientId: 'ingredient-1' },
        { ingredientId: 'ingredient-1' },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects an unknown category when ingredients are provided', () => {
    const result = updateRecipeSchema.safeParse({
      ingredients: [{ ingredientId: 'ingredient-1', category: 'DESSERT' }],
    });

    expect(result.success).toBe(false);
  });

  it('accepts a valid ingredient replacement', () => {
    const result = updateRecipeSchema.safeParse({
      ingredients: [{ ingredientId: 'ingredient-2', unit: 'cup' }],
    });

    expect(result.success).toBe(true);
    expect(result.data?.ingredients).toEqual([
      { ingredientId: 'ingredient-2', unit: 'cup', category: 'OTHER' },
    ]);
  });

  it('rejects an invalid name when provided', () => {
    expect(updateRecipeSchema.safeParse({ name: 'A' }).success).toBe(false);
  });

  it('rejects an invalid preparation time when provided', () => {
    expect(
      updateRecipeSchema.safeParse({ preparationTime: -5 }).success,
    ).toBe(false);
  });

  it('rejects an invalid URL when provided', () => {
    expect(
      updateRecipeSchema.safeParse({ imageUrl: 'not-a-url' }).success,
    ).toBe(false);
  });

  it('preserves nullable fields when explicitly set to null', () => {
    const result = updateRecipeSchema.safeParse({
      description: null,
      cuisine: null,
    });

    expect(result.success).toBe(true);
    expect(result.data?.description).toBeNull();
    expect(result.data?.cuisine).toBeNull();
  });

  it('leaves dietTags and allergens keys absent when omitted', () => {
    const result = updateRecipeSchema.safeParse({ name: 'Updated Soup' });

    expect(result.success).toBe(true);
    expect(result.data?.dietTags).toBeUndefined();
    expect(result.data?.allergens).toBeUndefined();
  });

  it('trims, lowercases, and deduplicates dietTags when provided', () => {
    const result = updateRecipeSchema.safeParse({
      dietTags: [' Vegan ', 'VEGAN'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.dietTags).toEqual(['vegan']);
  });
});
