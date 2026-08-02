import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';

const {
  countRecipeMock,
  createRecipeMock,
  findManyRecipeMock,
  findUniqueRecipeMock,
  updateRecipeMock,
} = vi.hoisted(() => ({
  countRecipeMock: vi.fn(),
  createRecipeMock: vi.fn(),
  findManyRecipeMock: vi.fn(),
  findUniqueRecipeMock: vi.fn(),
  updateRecipeMock: vi.fn(),
}));

vi.mock('../../database/prisma.js', () => ({
  prisma: {
    recipe: {
      findMany: findManyRecipeMock,
      count: countRecipeMock,
      findUnique: findUniqueRecipeMock,
      create: createRecipeMock,
      update: updateRecipeMock,
    },
  },
}));

import {
  createRecipe,
  findPublishedRecipes,
  findRecipeById,
  updateRecipe,
} from './recipe-repository.js';

const createdAt = new Date('2026-07-28T00:00:00.000Z');
const updatedAt = new Date('2026-07-28T00:00:00.000Z');

const recipeSummary = {
  id: 'recipe-1',
  name: 'Tomato Soup',
  description: 'A warm soup',
  cuisine: 'Italian',
  preparationTime: 20,
  servings: 4,
  imageUrl: null,
  dietTags: ['vegetarian'],
  allergens: [],
  isPublished: true,
  createdAt,
  updatedAt,
};

const recipeDetail = {
  id: 'recipe-1',
  name: 'Tomato Soup',
  description: 'A warm soup',
  instructions: 'Simmer everything.',
  cuisine: 'Italian',
  preparationTime: 20,
  servings: 4,
  imageUrl: null,
  sourceUrl: null,
  dietTags: ['vegetarian'],
  allergens: [],
  isPublished: true,
  createdAt,
  updatedAt,
  ingredients: [
    {
      id: 'recipe-ingredient-1',
      quantity: null,
      unit: null,
      category: 'MAIN',
      ingredient: { id: 'ingredient-1', name: 'tomato' },
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('findPublishedRecipes', () => {
  it('returns published recipes with pagination and a total count', async () => {
    findManyRecipeMock.mockResolvedValue([recipeSummary]);
    countRecipeMock.mockResolvedValue(1);

    const result = await findPublishedRecipes({ skip: 0, take: 10 });

    expect(findManyRecipeMock).toHaveBeenCalledWith({
      where: { isPublished: true },
      skip: 0,
      take: 10,
      orderBy: { name: 'asc' },
      select: expect.any(Object),
    });
    expect(countRecipeMock).toHaveBeenCalledWith({
      where: { isPublished: true },
    });
    expect(result).toEqual({ recipes: [recipeSummary], total: 1 });
  });

  it('applies the requested skip and take values', async () => {
    findManyRecipeMock.mockResolvedValue([]);
    countRecipeMock.mockResolvedValue(0);

    await findPublishedRecipes({ skip: 20, take: 5 });

    expect(findManyRecipeMock).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 5 }),
    );
  });

  it('returns an empty result cleanly when no recipes are published', async () => {
    findManyRecipeMock.mockResolvedValue([]);
    countRecipeMock.mockResolvedValue(0);

    const result = await findPublishedRecipes({ skip: 0, take: 10 });

    expect(result).toEqual({ recipes: [], total: 0 });
  });
});

describe('findRecipeById', () => {
  it('returns the full recipe detail with ingredients when found', async () => {
    findUniqueRecipeMock.mockResolvedValue(recipeDetail);

    const result = await findRecipeById('recipe-1');

    expect(findUniqueRecipeMock).toHaveBeenCalledWith({
      where: { id: 'recipe-1' },
      select: expect.any(Object),
    });
    expect(result).toEqual(recipeDetail);
  });

  it('returns null instead of throwing when the recipe does not exist', async () => {
    findUniqueRecipeMock.mockResolvedValue(null);

    await expect(findRecipeById('missing-recipe')).resolves.toBeNull();
  });
});

describe('createRecipe', () => {
  it('creates a recipe with its nested ingredients and returns the detail', async () => {
    createRecipeMock.mockResolvedValue(recipeDetail);

    const result = await createRecipe({
      name: 'Tomato Soup',
      description: 'A warm soup',
      instructions: 'Simmer everything.',
      cuisine: 'Italian',
      preparationTime: 20,
      servings: 4,
      dietTags: ['vegetarian'],
      allergens: [],
      isPublished: true,
      ingredients: [{ ingredientId: 'ingredient-1', category: 'MAIN' }],
    });

    expect(createRecipeMock).toHaveBeenCalledWith({
      data: {
        name: 'Tomato Soup',
        description: 'A warm soup',
        instructions: 'Simmer everything.',
        cuisine: 'Italian',
        preparationTime: 20,
        servings: 4,
        imageUrl: null,
        sourceUrl: null,
        dietTags: ['vegetarian'],
        allergens: [],
        isPublished: true,
        ingredients: {
          create: [{ ingredientId: 'ingredient-1', category: 'MAIN' }],
        },
      },
      select: expect.any(Object),
    });
    expect(result).toEqual(recipeDetail);
  });

  it('defaults optional scalar fields when they are omitted', async () => {
    createRecipeMock.mockResolvedValue(recipeDetail);

    await createRecipe({
      name: 'Tomato Soup',
      instructions: 'Simmer everything.',
      ingredients: [],
    });

    expect(createRecipeMock).toHaveBeenCalledWith({
      data: {
        name: 'Tomato Soup',
        description: null,
        instructions: 'Simmer everything.',
        cuisine: null,
        preparationTime: null,
        servings: null,
        imageUrl: null,
        sourceUrl: null,
        dietTags: [],
        allergens: [],
        isPublished: true,
        ingredients: { create: [] },
      },
      select: expect.any(Object),
    });
  });

  it('omits unset quantity, unit, and category from each recipe ingredient', async () => {
    createRecipeMock.mockResolvedValue(recipeDetail);

    await createRecipe({
      name: 'Tomato Soup',
      instructions: 'Simmer everything.',
      ingredients: [{ ingredientId: 'ingredient-1' }],
    });

    expect(createRecipeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingredients: {
            create: [{ ingredientId: 'ingredient-1' }],
          },
        }),
      }),
    );
  });
});

describe('updateRecipe', () => {
  it('sends an explicit null to clear a nullable field, distinct from omitting it', async () => {
    updateRecipeMock.mockResolvedValue(recipeDetail);

    await updateRecipe('recipe-1', { description: null });

    expect(updateRecipeMock).toHaveBeenCalledWith({
      where: { id: 'recipe-1' },
      data: { description: null },
      select: expect.any(Object),
    });
  });

  it('updates only the fields that were provided', async () => {
    updateRecipeMock.mockResolvedValue({
      ...recipeDetail,
      name: 'Updated Soup',
    });

    await updateRecipe('recipe-1', { name: 'Updated Soup' });

    expect(updateRecipeMock).toHaveBeenCalledWith({
      where: { id: 'recipe-1' },
      data: { name: 'Updated Soup' },
      select: expect.any(Object),
    });
  });

  it('replaces the full ingredient set when ingredients are provided', async () => {
    updateRecipeMock.mockResolvedValue(recipeDetail);

    await updateRecipe('recipe-1', {
      ingredients: [{ ingredientId: 'ingredient-2', unit: 'cup' }],
    });

    expect(updateRecipeMock).toHaveBeenCalledWith({
      where: { id: 'recipe-1' },
      data: {
        ingredients: {
          deleteMany: {},
          create: [{ ingredientId: 'ingredient-2', unit: 'cup' }],
        },
      },
      select: expect.any(Object),
    });
  });

  it('leaves ingredients untouched when they are not provided', async () => {
    updateRecipeMock.mockResolvedValue(recipeDetail);

    await updateRecipe('recipe-1', { isPublished: false });

    expect(updateRecipeMock).toHaveBeenCalledWith({
      where: { id: 'recipe-1' },
      data: { isPublished: false },
      select: expect.any(Object),
    });
  });

  it('returns null instead of throwing when the recipe does not exist', async () => {
    updateRecipeMock.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record to update not found', {
        code: 'P2025',
        clientVersion: '7.9.0',
      }),
    );

    await expect(
      updateRecipe('missing-recipe', { name: 'Updated Soup' }),
    ).resolves.toBeNull();
  });

  it('propagates unrelated errors instead of swallowing them', async () => {
    const unrelatedError = new Error('Database connection lost');
    updateRecipeMock.mockRejectedValue(unrelatedError);

    await expect(
      updateRecipe('recipe-1', { name: 'Updated Soup' }),
    ).rejects.toBe(unrelatedError);
  });
});
