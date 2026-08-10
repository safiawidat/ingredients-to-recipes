import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/api';
import type { RecipeDetail } from '../../types/recipe';

const { getRecipeMock, listCanonicalIngredientsMock, updateRecipeMock } =
  vi.hoisted(() => ({
    getRecipeMock: vi.fn(),
    listCanonicalIngredientsMock: vi.fn(),
    updateRecipeMock: vi.fn(),
  }));

vi.mock('../../services/recipe-api', () => ({
  getRecipe: getRecipeMock,
}));

vi.mock('../../services/ingredient-api', () => ({
  listCanonicalIngredients: listCanonicalIngredientsMock,
}));

vi.mock('../../services/admin-recipe-api', () => ({
  updateRecipe: updateRecipeMock,
}));

import { AdminRecipeEditPage } from './AdminRecipeEditPage';

const recipe: RecipeDetail = {
  id: 'recipe-1',
  name: 'Tomato Soup',
  description: 'A simple soup.',
  instructions: 'Simmer until tender.',
  cuisine: 'Italian',
  preparationTime: 20,
  servings: 4,
  imageUrl: 'https://example.com/soup.jpg',
  sourceUrl: 'https://example.com/source',
  dietTags: ['vegetarian'],
  allergens: ['dairy'],
  isPublished: false,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
  ingredients: [
    {
      id: 'recipe-ingredient-1',
      ingredientId: 'ingredient-1',
      ingredientName: 'tomato',
      quantity: 2,
      unit: 'cups',
      category: 'MAIN',
    },
  ],
};

const recipeResponse = { data: { recipe } };
const ingredientResponse = {
  data: {
    ingredients: [
      { id: 'ingredient-1', name: 'tomato' },
      { id: 'ingredient-2', name: 'onion' },
    ],
  },
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/recipes/recipe-1/edit']}>
      <Routes>
        <Route
          path="/admin/recipes/:id/edit"
          element={<AdminRecipeEditPage />}
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AdminRecipeEditPage', () => {
  it('loads the recipe and canonical ingredients in parallel', () => {
    getRecipeMock.mockReturnValue(new Promise(() => undefined));
    listCanonicalIngredientsMock.mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading recipe editor',
    );
    expect(getRecipeMock).toHaveBeenCalledWith('recipe-1');
    expect(listCanonicalIngredientsMock).toHaveBeenCalledOnce();
  });

  it('populates all existing values, including an unpublished recipe', async () => {
    getRecipeMock.mockResolvedValue(recipeResponse);
    listCanonicalIngredientsMock.mockResolvedValue(ingredientResponse);
    renderPage();

    expect(await screen.findByLabelText('Name')).toHaveValue('Tomato Soup');
    expect(screen.getByLabelText('Description')).toHaveValue('A simple soup.');
    expect(screen.getByLabelText('Preparation time (minutes)')).toHaveValue(20);
    expect(screen.getByLabelText('Canonical ingredient')).toHaveValue(
      'ingredient-1',
    );
    expect(screen.getByLabelText('Category')).toHaveValue('MAIN');
    expect(
      screen.getByLabelText('Published and visible to regular users'),
    ).not.toBeChecked();
    expect(screen.getByRole('option', { name: 'onion' })).toBeInTheDocument();
  });

  it('shows a safe recipe-not-found state for 404', async () => {
    getRecipeMock.mockRejectedValue(
      new ApiError(404, 'RECIPE_NOT_FOUND', 'private message'),
    );
    listCanonicalIngredientsMock.mockResolvedValue(ingredientResponse);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Recipe not found' }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('private message');
  });

  it('shows a safe general load error and retries both requests', async () => {
    const user = userEvent.setup();
    getRecipeMock
      .mockRejectedValueOnce(new Error('private failure'))
      .mockResolvedValueOnce(recipeResponse);
    listCanonicalIngredientsMock.mockResolvedValue(ingredientResponse);
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to load the recipe editor');
    expect(alert).not.toHaveTextContent('private failure');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByLabelText('Name')).toHaveValue('Tomato Soup');
    expect(getRecipeMock).toHaveBeenCalledTimes(2);
    expect(listCanonicalIngredientsMock).toHaveBeenCalledTimes(2);
  });

  it('submits a full valid update and shows success', async () => {
    const user = userEvent.setup();
    getRecipeMock.mockResolvedValue(recipeResponse);
    listCanonicalIngredientsMock.mockResolvedValue(ingredientResponse);
    updateRecipeMock.mockResolvedValue(recipeResponse);
    renderPage();

    const nameInput = await screen.findByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Roasted Tomato Soup');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(updateRecipeMock).toHaveBeenCalledWith('recipe-1', {
      name: 'Roasted Tomato Soup',
      description: 'A simple soup.',
      instructions: 'Simmer until tender.',
      cuisine: 'Italian',
      preparationTime: 20,
      servings: 4,
      imageUrl: 'https://example.com/soup.jpg',
      sourceUrl: 'https://example.com/source',
      dietTags: ['vegetarian'],
      allergens: ['dairy'],
      isPublished: false,
      ingredients: [
        {
          ingredientId: 'ingredient-1',
          quantity: 2,
          unit: 'cups',
          category: 'MAIN',
        },
      ],
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Recipe changes saved successfully.',
    );
  });

  it('keeps edits after a safe update failure', async () => {
    const user = userEvent.setup();
    getRecipeMock.mockResolvedValue(recipeResponse);
    listCanonicalIngredientsMock.mockResolvedValue(ingredientResponse);
    updateRecipeMock.mockRejectedValue(new Error('private failure'));
    renderPage();

    const description = await screen.findByLabelText('Description');
    await user.clear(description);
    await user.type(description, 'Edited description');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to save the recipe');
    expect(alert).not.toHaveTextContent('private failure');
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Edited description',
    );
  });
});
