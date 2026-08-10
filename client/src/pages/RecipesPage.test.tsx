import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  RecipeListResponse,
  RecipeSummary,
} from '../types/recipe';

const { listRecipesMock } = vi.hoisted(() => ({
  listRecipesMock: vi.fn(),
}));

vi.mock('../services/recipe-api', () => ({
  listRecipes: listRecipesMock,
}));

import { RecipesPage } from './RecipesPage';

const recipe: RecipeSummary = {
  id: 'recipe-1',
  name: 'Tomato Soup',
  description: 'A warm and simple soup.',
  cuisine: 'Italian',
  preparationTime: 20,
  servings: 4,
  imageUrl: 'https://example.com/tomato-soup.jpg',
  dietTags: ['vegetarian'],
  allergens: ['dairy'],
  isPublished: true,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
};

const createResponse = (
  recipes: RecipeSummary[],
  page = 1,
  totalPages = 1,
): RecipeListResponse => ({
  data: {
    recipes,
    pagination: {
      page,
      pageSize: 20,
      total: totalPages === 0 ? 0 : totalPages * 20,
      totalPages,
    },
  },
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <RecipesPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
});

describe('RecipesPage', () => {
  it('shows a loading state while recipes are requested', () => {
    listRecipesMock.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading recipes');
  });

  it('renders recipe summaries and links to recipe details', async () => {
    listRecipesMock.mockResolvedValue(createResponse([recipe]));

    renderPage();

    const recipeLink = await screen.findByRole('link', {
      name: 'Tomato Soup',
    });
    expect(recipeLink).toHaveAttribute('href', '/recipes/recipe-1');
    expect(screen.getByText('A warm and simple soup.')).toBeInTheDocument();
    expect(screen.getByText('Italian')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('vegetarian')).toBeInTheDocument();
    expect(screen.getByText('dairy')).toBeInTheDocument();
  });

  it('shows an empty state when no recipes are available', async () => {
    listRecipesMock.mockResolvedValue(createResponse([], 1, 0));

    renderPage();

    expect(
      await screen.findByText('No recipes are available yet.'),
    ).toBeInTheDocument();
  });

  it('shows a safe API error state', async () => {
    listRecipesMock.mockRejectedValue(new Error('private failure'));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load recipes. Please try again.',
    );
    expect(JSON.stringify(document.body.textContent)).not.toContain(
      'private failure',
    );
  });

  it('retries a failed request', async () => {
    const user = userEvent.setup();
    listRecipesMock
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(createResponse([], 1, 0));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByText('No recipes are available yet.'),
    ).toBeInTheDocument();
    expect(listRecipesMock).toHaveBeenCalledTimes(2);
  });

  it('requests the correct pages with previous and next controls', async () => {
    const user = userEvent.setup();
    listRecipesMock
      .mockResolvedValueOnce(createResponse([recipe], 1, 2))
      .mockResolvedValueOnce(createResponse([recipe], 2, 2))
      .mockResolvedValueOnce(createResponse([recipe], 1, 2));
    renderPage();

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(listRecipesMock).toHaveBeenNthCalledWith(1, {
      page: 1,
      pageSize: 20,
    });

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(listRecipesMock).toHaveBeenNthCalledWith(2, {
      page: 2,
      pageSize: 20,
    });
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() => {
      expect(listRecipesMock).toHaveBeenNthCalledWith(3, {
        page: 1,
        pageSize: 20,
      });
    });
  });

  it('disables pagination controls at both boundaries', async () => {
    listRecipesMock.mockResolvedValue(createResponse([recipe], 1, 1));

    renderPage();

    await screen.findByText('Page 1 of 1');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});
