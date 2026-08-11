import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecipeSummary } from '../types/recipe';

const { getFavoritesMock, unfavoriteRecipeMock } = vi.hoisted(() => ({
  getFavoritesMock: vi.fn(),
  unfavoriteRecipeMock: vi.fn(),
}));

vi.mock('../services/favorite-api', () => ({
  getFavorites: getFavoritesMock,
  unfavoriteRecipe: unfavoriteRecipeMock,
}));

import { FavoritesPage } from './FavoritesPage';

const firstRecipe: RecipeSummary = {
  id: 'recipe-newer',
  name: 'Newer Soup',
  description: 'Newest favorite',
  cuisine: 'Italian',
  preparationTime: 20,
  servings: 4,
  imageUrl: 'https://example.com/soup.jpg',
  dietTags: ['vegetarian'],
  allergens: ['dairy'],
  isPublished: true,
  createdAt: '2026-08-02T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
};

const secondRecipe: RecipeSummary = {
  ...firstRecipe,
  id: 'recipe-older',
  name: 'Older Salad',
  description: null,
  imageUrl: null,
};

const responseWith = (recipes: RecipeSummary[]) => ({
  data: { recipes },
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <FavoritesPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
});

describe('FavoritesPage', () => {
  it('shows loading while favorites are requested', () => {
    getFavoritesMock.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading favorites');
  });

  it('renders summary cards, links, and backend order', async () => {
    getFavoritesMock.mockResolvedValue(
      responseWith([firstRecipe, secondRecipe]),
    );

    renderPage();

    const list = await screen.findByRole('list', {
      name: 'Favorite recipes',
    });
    const articles = within(list).getAllByRole('article');
    expect(articles).toHaveLength(2);
    expect(within(articles[0]!).getByRole('heading')).toHaveTextContent(
      'Newer Soup',
    );
    expect(within(articles[1]!).getByRole('heading')).toHaveTextContent(
      'Older Salad',
    );
    expect(screen.getByRole('link', { name: 'Newer Soup' })).toHaveAttribute(
      'href',
      '/recipes/recipe-newer',
    );
    expect(within(articles[0]!).getByText('Italian')).toBeInTheDocument();
    expect(within(articles[0]!).getByText('20 min')).toBeInTheDocument();
    expect(within(articles[0]!).getByText('vegetarian')).toBeInTheDocument();
    expect(within(articles[0]!).getByText('dairy')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    getFavoritesMock.mockResolvedValue(responseWith([]));

    renderPage();

    expect(await screen.findByText('You have no favorite recipes yet.'))
      .toHaveAttribute('role', 'status');
  });

  it('shows a safe load error and retries', async () => {
    const user = userEvent.setup();
    getFavoritesMock
      .mockRejectedValueOnce(new Error('private failure'))
      .mockResolvedValueOnce(responseWith([firstRecipe]));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load favorites',
    );
    expect(document.body.textContent).not.toContain('private failure');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Newer Soup')).toBeInTheDocument();
    expect(getFavoritesMock).toHaveBeenCalledTimes(2);
  });

  it('removes a card locally after a successful unfavorite', async () => {
    const user = userEvent.setup();
    getFavoritesMock.mockResolvedValue(
      responseWith([firstRecipe, secondRecipe]),
    );
    unfavoriteRecipeMock.mockResolvedValue(undefined);
    renderPage();

    const buttons = await screen.findAllByRole('button', {
      name: 'Remove from favorites',
    });
    await user.click(buttons[0]!);

    expect(unfavoriteRecipeMock).toHaveBeenCalledWith('recipe-newer');
    expect(screen.queryByText('Newer Soup')).not.toBeInTheDocument();
    expect(screen.getByText('Older Salad')).toBeInTheDocument();
  });

  it('disables the pending control and prevents duplicate removals', async () => {
    const user = userEvent.setup();
    let resolveRemoval!: () => void;
    unfavoriteRecipeMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRemoval = resolve;
      }),
    );
    getFavoritesMock.mockResolvedValue(responseWith([firstRecipe]));
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Remove from favorites' }),
    );

    const pendingButton = screen.getByRole('button', { name: 'Removing...' });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(unfavoriteRecipeMock).toHaveBeenCalledOnce();

    resolveRemoval();
    expect(await screen.findByText('no favorite recipes', { exact: false }))
      .toBeInTheDocument();
  });

  it('keeps a failed card visible and allows retry', async () => {
    const user = userEvent.setup();
    getFavoritesMock.mockResolvedValue(responseWith([firstRecipe]));
    unfavoriteRecipeMock
      .mockRejectedValueOnce(new Error('private failure'))
      .mockResolvedValueOnce(undefined);
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Remove from favorites' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to remove this favorite',
    );
    expect(screen.getByText('Newer Soup')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Remove from favorites' }),
    );

    expect(await screen.findByText('no favorite recipes', { exact: false }))
      .toBeInTheDocument();
    expect(unfavoriteRecipeMock).toHaveBeenCalledTimes(2);
  });
});
