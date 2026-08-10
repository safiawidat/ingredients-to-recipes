import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api';
import type { RecipeDetail, RecipeResponse } from '../types/recipe';

const { getRecipeMock } = vi.hoisted(() => ({
  getRecipeMock: vi.fn(),
}));

vi.mock('../services/recipe-api', () => ({
  getRecipe: getRecipeMock,
}));

import { RecipeDetailPage } from './RecipeDetailPage';

const recipe: RecipeDetail = {
  id: 'recipe-1',
  name: 'Tomato Soup',
  description: 'A warm and simple soup.',
  instructions: 'Chop the tomatoes.\nSimmer until tender.',
  cuisine: 'Italian',
  preparationTime: 20,
  servings: 4,
  imageUrl: 'https://example.com/tomato-soup.jpg',
  sourceUrl: 'https://example.com/source',
  dietTags: ['vegetarian'],
  allergens: ['dairy'],
  isPublished: true,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
  ingredients: [
    {
      id: 'recipe-ingredient-1',
      ingredientId: 'ingredient-1',
      ingredientName: 'tomato',
      quantity: 2.5,
      unit: 'cups',
      category: 'MAIN',
    },
  ],
};

const responseFor = (value: RecipeDetail): RecipeResponse => ({
  data: { recipe: value },
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/recipes/recipe-1']}>
      <Routes>
        <Route path="/recipes/:id" element={<RecipeDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
});

describe('RecipeDetailPage', () => {
  it('shows a loading state while the recipe is requested', () => {
    getRecipeMock.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading recipe');
  });

  it('renders full recipe details and structured ingredients', async () => {
    getRecipeMock.mockResolvedValue(responseFor(recipe));

    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tomato Soup' }),
    ).toBeInTheDocument();
    expect(screen.getByText('A warm and simple soup.')).toBeInTheDocument();
    expect(screen.getByText('Italian')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('vegetarian')).toBeInTheDocument();
    expect(screen.getByText('dairy')).toBeInTheDocument();
    expect(screen.getByText('tomato')).toBeInTheDocument();
    expect(screen.getByText('2.5 cups')).toBeInTheDocument();
    expect(screen.getByText('MAIN')).toBeInTheDocument();
    expect(
      screen.getByText(/Chop the tomatoes\.\s+Simmer until tender\./),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to recipes' })).toHaveAttribute(
      'href',
      '/recipes',
    );
    expect(screen.getByRole('link', { name: 'View recipe source' }))
      .toHaveAttribute('href', 'https://example.com/source');
    expect(screen.getByRole('img', { name: 'Tomato Soup' })).toHaveAttribute(
      'src',
      'https://example.com/tomato-soup.jpg',
    );
  });

  it('handles nullable and unsafe optional values without broken output', async () => {
    getRecipeMock.mockResolvedValue(
      responseFor({
        ...recipe,
        description: null,
        cuisine: null,
        preparationTime: null,
        servings: null,
        imageUrl: 'javascript:alert(1)',
        sourceUrl: null,
        dietTags: [],
        allergens: [],
        ingredients: [
          {
            ...recipe.ingredients[0]!,
            quantity: null,
            unit: null,
          },
        ],
      }),
    );

    renderPage();

    expect(await screen.findByText('Quantity not specified')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View recipe source' })).not
      .toBeInTheDocument();
    expect(document.body.textContent).not.toContain('null');
    expect(document.body.textContent).not.toContain('undefined');
  });

  it('shows a not-found state for a 404 response', async () => {
    getRecipeMock.mockRejectedValue(
      new ApiError(404, 'RECIPE_NOT_FOUND', 'private backend message'),
    );

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Recipe not found' }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('private backend message');
  });

  it('shows a safe retryable state for a non-404 error', async () => {
    getRecipeMock.mockRejectedValue(new Error('private failure'));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load recipe',
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('private failure');
  });

  it('retries a failed recipe request', async () => {
    const user = userEvent.setup();
    getRecipeMock
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(responseFor(recipe));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tomato Soup' }),
    ).toBeInTheDocument();
    expect(getRecipeMock).toHaveBeenCalledTimes(2);
    expect(getRecipeMock).toHaveBeenLastCalledWith('recipe-1');
  });
});
