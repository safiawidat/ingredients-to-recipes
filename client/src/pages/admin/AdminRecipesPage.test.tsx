import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  RecipeListResponse,
  RecipeSummary,
} from '../../types/recipe';

const { listAdminRecipesMock, updateRecipeMock } = vi.hoisted(() => ({
  listAdminRecipesMock: vi.fn(),
  updateRecipeMock: vi.fn(),
}));

vi.mock('../../services/admin-recipe-api', () => ({
  listAdminRecipes: listAdminRecipesMock,
  updateRecipe: updateRecipeMock,
}));

import { AdminRecipesPage } from './AdminRecipesPage';

const publishedRecipe: RecipeSummary = {
  id: 'recipe-1',
  name: 'Tomato Soup',
  description: null,
  cuisine: 'Italian',
  preparationTime: 20,
  servings: 4,
  imageUrl: null,
  dietTags: ['vegetarian'],
  allergens: ['dairy'],
  isPublished: true,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
};

const inactiveRecipe: RecipeSummary = {
  ...publishedRecipe,
  id: 'recipe-2',
  name: 'Archived Stew',
  isPublished: false,
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
      <AdminRecipesPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AdminRecipesPage', () => {
  it('shows a loading state', () => {
    listAdminRecipesMock.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading admin recipes',
    );
  });

  it('renders published and inactive recipes with management navigation', async () => {
    listAdminRecipesMock.mockResolvedValue(
      createResponse([publishedRecipe, inactiveRecipe]),
    );

    renderPage();

    const publishedCard = await screen.findByRole('article', {
      name: 'Tomato Soup',
    });
    const inactiveCard = screen.getByRole('article', {
      name: 'Archived Stew',
    });
    expect(within(publishedCard).getByText('Published / Active'))
      .toBeInTheDocument();
    expect(within(inactiveCard).getByText('Inactive / Unpublished'))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Recipe' })).toHaveAttribute(
      'href',
      '/admin/recipes/new',
    );
    expect(screen.getByRole('link', { name: 'Import Recipes' })).toHaveAttribute(
      'href',
      '/admin/recipes/import',
    );
    expect(within(publishedCard).getByRole('link', { name: 'Edit' }))
      .toHaveAttribute('href', '/admin/recipes/recipe-1/edit');
  });

  it('shows an empty state', async () => {
    listAdminRecipesMock.mockResolvedValue(createResponse([], 1, 0));

    renderPage();

    expect(
      await screen.findByText('No recipes are available to manage.'),
    ).toBeInTheDocument();
  });

  it('shows a retryable list error', async () => {
    const user = userEvent.setup();
    listAdminRecipesMock
      .mockRejectedValueOnce(new Error('private failure'))
      .mockResolvedValueOnce(createResponse([], 1, 0));
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Unable to load admin recipes. Please try again.',
    );
    expect(alert).not.toHaveTextContent('private failure');

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByText('No recipes are available to manage.'),
    ).toBeInTheDocument();
    expect(listAdminRecipesMock).toHaveBeenCalledTimes(2);
  });

  it('requests the correct pages with previous and next controls', async () => {
    const user = userEvent.setup();
    listAdminRecipesMock
      .mockResolvedValueOnce(createResponse([publishedRecipe], 1, 2))
      .mockResolvedValueOnce(createResponse([publishedRecipe], 2, 2))
      .mockResolvedValueOnce(createResponse([publishedRecipe], 1, 2));
    renderPage();

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(listAdminRecipesMock).toHaveBeenNthCalledWith(1, {
      page: 1,
      pageSize: 20,
    });

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(listAdminRecipesMock).toHaveBeenNthCalledWith(2, {
      page: 2,
      pageSize: 20,
    });

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() => {
      expect(listAdminRecipesMock).toHaveBeenNthCalledWith(3, {
        page: 1,
        pageSize: 20,
      });
    });
  });

  it('disables pagination controls at both boundaries', async () => {
    listAdminRecipesMock.mockResolvedValue(
      createResponse([publishedRecipe], 1, 1),
    );

    renderPage();

    await screen.findByText('Page 1 of 1');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('requires confirmation and cancel does not deactivate', async () => {
    const user = userEvent.setup();
    listAdminRecipesMock.mockResolvedValue(createResponse([publishedRecipe]));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Deactivate' }));

    const dialog = screen.getByRole('dialog', {
      name: 'Deactivate Tomato Soup',
    });
    expect(dialog).toHaveTextContent(
      'This recipe will stop appearing to regular users.',
    );
    expect(updateRecipeMock).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(updateRecipeMock).not.toHaveBeenCalled();
  });

  it('deactivates after confirmation and updates the displayed status', async () => {
    const user = userEvent.setup();
    listAdminRecipesMock.mockResolvedValue(createResponse([publishedRecipe]));
    updateRecipeMock.mockResolvedValue({});
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await user.click(
      screen.getByRole('button', { name: 'Confirm deactivate' }),
    );

    expect(updateRecipeMock).toHaveBeenCalledWith('recipe-1', {
      isPublished: false,
    });
    const card = await screen.findByRole('article', { name: 'Tomato Soup' });
    expect(within(card).getByText('Inactive / Unpublished'))
      .toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables duplicate deactivation while the request is pending', async () => {
    const user = userEvent.setup();
    let resolveUpdate: ((value: unknown) => void) | undefined;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });
    listAdminRecipesMock.mockResolvedValue(createResponse([publishedRecipe]));
    updateRecipeMock.mockReturnValue(updatePromise);
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await user.click(
      screen.getByRole('button', { name: 'Confirm deactivate' }),
    );

    expect(
      screen.getByRole('button', { name: 'Deactivating...' }),
    ).toBeDisabled();
    expect(updateRecipeMock).toHaveBeenCalledOnce();

    resolveUpdate?.({});
    await screen.findByText('Inactive / Unpublished');
  });

  it('keeps the row visible and shows a local mutation error', async () => {
    const user = userEvent.setup();
    listAdminRecipesMock.mockResolvedValue(createResponse([publishedRecipe]));
    updateRecipeMock.mockRejectedValue(new Error('private failure'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await user.click(
      screen.getByRole('button', { name: 'Confirm deactivate' }),
    );

    const card = await screen.findByRole('article', { name: 'Tomato Soup' });
    expect(within(card).getByRole('alert')).toHaveTextContent(
      'Unable to deactivate Tomato Soup. Please try again.',
    );
    expect(within(card).getByText('Published / Active')).toBeInTheDocument();
    expect(within(card).getByRole('alert')).not.toHaveTextContent(
      'private failure',
    );
  });

  it('publishes an inactive recipe and updates the displayed status', async () => {
    const user = userEvent.setup();
    listAdminRecipesMock.mockResolvedValue(createResponse([inactiveRecipe]));
    updateRecipeMock.mockResolvedValue({});
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Publish' }));

    expect(updateRecipeMock).toHaveBeenCalledWith('recipe-2', {
      isPublished: true,
    });
    const card = await screen.findByRole('article', { name: 'Archived Stew' });
    expect(within(card).getByText('Published / Active')).toBeInTheDocument();
  });
});
