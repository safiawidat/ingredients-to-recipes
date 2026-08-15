import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createRecipeMock,
  findAllRecipesMock,
  findIngredientsByIdsMock,
  findPublishedRecipesMock,
  findRecipeByIdMock,
  findRecipeByIdForUserMock,
  updateRecipeMock,
} = vi.hoisted(() => ({
  createRecipeMock: vi.fn(),
  findAllRecipesMock: vi.fn(),
  findIngredientsByIdsMock: vi.fn(),
  findPublishedRecipesMock: vi.fn(),
  findRecipeByIdMock: vi.fn(),
  findRecipeByIdForUserMock: vi.fn(),
  updateRecipeMock: vi.fn(),
}));

vi.mock('../repositories/recipe-repository.js', () => ({
  createRecipe: createRecipeMock,
  findAllRecipes: findAllRecipesMock,
  findPublishedRecipes: findPublishedRecipesMock,
  findRecipeById: findRecipeByIdMock,
  findRecipeByIdForUser: findRecipeByIdForUserMock,
  updateRecipe: updateRecipeMock,
}));

vi.mock('../repositories/ingredient-repository.js', () => ({
  findIngredientsByIds: findIngredientsByIdsMock,
}));

import {
  createRecipe,
  getRecipeByIdForUser,
  listAllRecipes,
  listPublishedRecipes,
  updateRecipe,
} from './recipe-service.js';

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

const decimalQuantity = { toNumber: () => 2.5 };

const publishedRecipeDetail = {
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
      quantity: decimalQuantity,
      unit: 'cup',
      category: 'MAIN',
      ingredient: { id: 'ingredient-1', name: 'tomato' },
    },
  ],
};

const publishedRecipeDetailForUser = {
  ...publishedRecipeDetail,
  favorites: [],
};

const unpublishedRecipeDetail = {
  ...publishedRecipeDetail,
  id: 'recipe-2',
  isPublished: false,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('listPublishedRecipes', () => {
  it('converts page and pageSize into skip and take for the repository', async () => {
    findPublishedRecipesMock.mockResolvedValue({
      recipes: [recipeSummary],
      total: 1,
    });

    await listPublishedRecipes({ page: 2, pageSize: 10 });

    expect(findPublishedRecipesMock).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
    });
  });

  it('returns the mapped recipes with pagination metadata', async () => {
    findPublishedRecipesMock.mockResolvedValue({
      recipes: [recipeSummary],
      total: 25,
    });

    const result = await listPublishedRecipes({ page: 1, pageSize: 10 });

    expect(result).toEqual({
      recipes: [recipeSummary],
      page: 1,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it('preserves the repository ordering of returned recipes', async () => {
    const first = { ...recipeSummary, id: 'recipe-1', name: 'Apple Pie' };
    const second = { ...recipeSummary, id: 'recipe-2', name: 'Banana Bread' };
    findPublishedRecipesMock.mockResolvedValue({
      recipes: [first, second],
      total: 2,
    });

    const result = await listPublishedRecipes({ page: 1, pageSize: 10 });

    expect(result.recipes.map((recipe) => recipe.id)).toEqual([
      'recipe-1',
      'recipe-2',
    ]);
  });

  it('rejects a zero page', async () => {
    await expect(
      listPublishedRecipes({ page: 0, pageSize: 10 }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PAGINATION' });
    expect(findPublishedRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects a negative page', async () => {
    await expect(
      listPublishedRecipes({ page: -1, pageSize: 10 }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PAGINATION' });
    expect(findPublishedRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects a non-integer page', async () => {
    await expect(
      listPublishedRecipes({ page: 1.5, pageSize: 10 }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PAGINATION' });
    expect(findPublishedRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects a zero pageSize', async () => {
    await expect(
      listPublishedRecipes({ page: 1, pageSize: 0 }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PAGINATION' });
    expect(findPublishedRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects a negative pageSize', async () => {
    await expect(
      listPublishedRecipes({ page: 1, pageSize: -5 }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PAGINATION' });
    expect(findPublishedRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects a non-integer pageSize', async () => {
    await expect(
      listPublishedRecipes({ page: 1, pageSize: 2.5 }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_PAGINATION' });
    expect(findPublishedRecipesMock).not.toHaveBeenCalled();
  });
});

describe('listAllRecipes', () => {
  it('returns published and unpublished summaries with pagination', async () => {
    const unpublished = {
      ...recipeSummary,
      id: 'recipe-2',
      isPublished: false,
    };
    findAllRecipesMock.mockResolvedValue({
      recipes: [recipeSummary, unpublished],
      total: 12,
    });

    const result = await listAllRecipes({ page: 2, pageSize: 10 });

    expect(findAllRecipesMock).toHaveBeenCalledWith({ skip: 10, take: 10 });
    expect(result).toEqual({
      recipes: [recipeSummary, unpublished],
      page: 2,
      pageSize: 10,
      total: 12,
      totalPages: 2,
    });
  });

  it('returns valid pagination metadata for an empty list', async () => {
    findAllRecipesMock.mockResolvedValue({ recipes: [], total: 0 });

    await expect(
      listAllRecipes({ page: 1, pageSize: 20 }),
    ).resolves.toEqual({
      recipes: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });
});

describe('getRecipeByIdForUser', () => {
  it('returns a published recipe to a regular user', async () => {
    findRecipeByIdForUserMock.mockResolvedValue(publishedRecipeDetailForUser);

    const result = await getRecipeByIdForUser('recipe-1', 'user-1', 'USER');

    expect(result.id).toBe('recipe-1');
    expect(result.isPublished).toBe(true);
    expect(result.isFavorite).toBe(false);
    expect(findRecipeByIdForUserMock).toHaveBeenCalledWith(
      'recipe-1',
      'user-1',
    );
  });

  it('hides an unpublished recipe from a regular user', async () => {
    findRecipeByIdForUserMock.mockResolvedValue({
      ...unpublishedRecipeDetail,
      favorites: [],
    });

    await expect(
      getRecipeByIdForUser('recipe-2', 'user-1', 'USER'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
  });

  it('returns an unpublished recipe to an admin', async () => {
    findRecipeByIdForUserMock.mockResolvedValue({
      ...unpublishedRecipeDetail,
      favorites: [],
    });

    const result = await getRecipeByIdForUser('recipe-2', 'admin-1', 'ADMIN');

    expect(result.id).toBe('recipe-2');
    expect(result.isPublished).toBe(false);
  });

  it('throws RECIPE_NOT_FOUND when the recipe does not exist', async () => {
    findRecipeByIdForUserMock.mockResolvedValue(null);

    await expect(
      getRecipeByIdForUser('missing-recipe', 'admin-1', 'ADMIN'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
  });

  it('converts a Decimal quantity to a plain JSON-safe number', async () => {
    findRecipeByIdForUserMock.mockResolvedValue(publishedRecipeDetailForUser);

    const result = await getRecipeByIdForUser('recipe-1', 'admin-1', 'ADMIN');

    expect(result.ingredients[0]).toEqual({
      id: 'recipe-ingredient-1',
      ingredientId: 'ingredient-1',
      ingredientName: 'tomato',
      quantity: 2.5,
      unit: 'cup',
      category: 'MAIN',
    });
  });

  it('maps a filtered favorite relation to isFavorite true', async () => {
    findRecipeByIdForUserMock.mockResolvedValue({
      ...publishedRecipeDetailForUser,
      favorites: [{ id: 'favorite-1' }],
    });

    const result = await getRecipeByIdForUser(
      'recipe-1',
      'user-1',
      'USER',
    );

    expect(result.isFavorite).toBe(true);
    expect(result).not.toHaveProperty('favorites');
  });
});

describe('createRecipe', () => {
  const validInput = {
    name: 'Tomato Soup',
    instructions: 'Simmer everything.',
    ingredients: [{ ingredientId: 'ingredient-1', category: 'MAIN' as const }],
  };

  it('validates ingredients then creates the recipe and returns a mapped DTO', async () => {
    findIngredientsByIdsMock.mockResolvedValue(
      new Map([['ingredient-1', { id: 'ingredient-1', name: 'tomato' }]]),
    );
    createRecipeMock.mockResolvedValue(publishedRecipeDetail);

    const result = await createRecipe(validInput);

    expect(findIngredientsByIdsMock).toHaveBeenCalledWith(['ingredient-1']);
    expect(createRecipeMock).toHaveBeenCalledWith({
      name: 'Tomato Soup',
      instructions: 'Simmer everything.',
      ingredients: [{ ingredientId: 'ingredient-1', category: 'MAIN' }],
    });
    expect(result.id).toBe('recipe-1');
    expect(result.ingredients[0]?.quantity).toBe(2.5);
  });

  it('rejects duplicate ingredientIds before touching any repository', async () => {
    await expect(
      createRecipe({
        ...validInput,
        ingredients: [
          { ingredientId: 'ingredient-1' },
          { ingredientId: 'ingredient-1' },
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'DUPLICATE_RECIPE_INGREDIENT',
    });

    expect(findIngredientsByIdsMock).not.toHaveBeenCalled();
    expect(createRecipeMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown ingredientId and does not call the recipe repository', async () => {
    findIngredientsByIdsMock.mockResolvedValue(
      new Map([['ingredient-1', null]]),
    );

    await expect(createRecipe(validInput)).rejects.toMatchObject({
      statusCode: 404,
      code: 'INGREDIENT_NOT_FOUND',
    });

    expect(createRecipeMock).not.toHaveBeenCalled();
  });
});

describe('updateRecipe', () => {
  it('passes an explicit null through to the repository to clear a field', async () => {
    updateRecipeMock.mockResolvedValue(publishedRecipeDetail);

    await updateRecipe('recipe-1', { description: null });

    expect(updateRecipeMock).toHaveBeenCalledWith('recipe-1', {
      description: null,
    });
  });

  it('performs a partial update without touching ingredient validation', async () => {
    updateRecipeMock.mockResolvedValue({
      ...publishedRecipeDetail,
      name: 'Updated Soup',
    });

    const result = await updateRecipe('recipe-1', { name: 'Updated Soup' });

    expect(findIngredientsByIdsMock).not.toHaveBeenCalled();
    expect(updateRecipeMock).toHaveBeenCalledWith('recipe-1', {
      name: 'Updated Soup',
    });
    expect(result.name).toBe('Updated Soup');
  });

  it('replaces the ingredient set when ingredients are provided and valid', async () => {
    findIngredientsByIdsMock.mockResolvedValue(
      new Map([['ingredient-2', { id: 'ingredient-2', name: 'onion' }]]),
    );
    updateRecipeMock.mockResolvedValue(publishedRecipeDetail);

    await updateRecipe('recipe-1', {
      ingredients: [{ ingredientId: 'ingredient-2', unit: 'cup' }],
    });

    expect(findIngredientsByIdsMock).toHaveBeenCalledWith(['ingredient-2']);
    expect(updateRecipeMock).toHaveBeenCalledWith('recipe-1', {
      ingredients: [{ ingredientId: 'ingredient-2', unit: 'cup' }],
    });
  });

  it('rejects duplicate ingredientIds during update before calling the repository', async () => {
    await expect(
      updateRecipe('recipe-1', {
        ingredients: [
          { ingredientId: 'ingredient-1' },
          { ingredientId: 'ingredient-1' },
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'DUPLICATE_RECIPE_INGREDIENT',
    });

    expect(findIngredientsByIdsMock).not.toHaveBeenCalled();
    expect(updateRecipeMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown ingredientId during update before calling the repository', async () => {
    findIngredientsByIdsMock.mockResolvedValue(
      new Map([['missing-ingredient', null]]),
    );

    await expect(
      updateRecipe('recipe-1', {
        ingredients: [{ ingredientId: 'missing-ingredient' }],
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'INGREDIENT_NOT_FOUND',
    });

    expect(updateRecipeMock).not.toHaveBeenCalled();
  });

  it('throws RECIPE_NOT_FOUND when the repository returns null', async () => {
    updateRecipeMock.mockResolvedValue(null);

    await expect(
      updateRecipe('missing-recipe', { name: 'Updated Soup' }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'RECIPE_NOT_FOUND',
    });
  });

  it('leaves existing ingredient relations untouched when ingredients are omitted', async () => {
    updateRecipeMock.mockResolvedValue(publishedRecipeDetail);

    await updateRecipe('recipe-1', { isPublished: false });

    const [, dataArgument] = updateRecipeMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(dataArgument).not.toHaveProperty('ingredients');
  });
});
