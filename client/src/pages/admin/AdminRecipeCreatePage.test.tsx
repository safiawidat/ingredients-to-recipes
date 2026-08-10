import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createRecipeMock, listCanonicalIngredientsMock } = vi.hoisted(() => ({
  createRecipeMock: vi.fn(),
  listCanonicalIngredientsMock: vi.fn(),
}));

vi.mock('../../services/admin-recipe-api', () => ({
  createRecipe: createRecipeMock,
}));

vi.mock('../../services/ingredient-api', () => ({
  listCanonicalIngredients: listCanonicalIngredientsMock,
}));

import { AdminRecipeCreatePage } from './AdminRecipeCreatePage';

const ingredientResponse = {
  data: {
    ingredients: [
      { id: 'ingredient-1', name: 'tomato' },
      { id: 'ingredient-2', name: 'onion' },
    ],
  },
};

const EditDestination = () => {
  const { id } = useParams();
  return <p>Editing created recipe {id}</p>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/recipes/new']}>
      <Routes>
        <Route
          path="/admin/recipes/new"
          element={<AdminRecipeCreatePage />}
        />
        <Route
          path="/admin/recipes/:id/edit"
          element={<EditDestination />}
        />
      </Routes>
    </MemoryRouter>,
  );

const completeRequiredFields = async () => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Name'), 'Tomato Soup');
  await user.type(screen.getByLabelText('Instructions'), 'Simmer slowly.');
  await user.selectOptions(
    screen.getByLabelText('Canonical ingredient'),
    'ingredient-1',
  );
  return user;
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AdminRecipeCreatePage', () => {
  it('shows ingredient loading', () => {
    listCanonicalIngredientsMock.mockReturnValue(new Promise(() => undefined));
    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading canonical ingredients',
    );
  });

  it('shows a safe load error and retries', async () => {
    const user = userEvent.setup();
    listCanonicalIngredientsMock
      .mockRejectedValueOnce(new Error('private failure'))
      .mockResolvedValueOnce(ingredientResponse);
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to load canonical ingredients');
    expect(alert).not.toHaveTextContent('private failure');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('option', { name: 'tomato' }))
      .toBeInTheDocument();
    expect(listCanonicalIngredientsMock).toHaveBeenCalledTimes(2);
  });

  it('renders canonical options and creates a normalized recipe', async () => {
    listCanonicalIngredientsMock.mockResolvedValue(ingredientResponse);
    createRecipeMock.mockResolvedValue({
      data: { recipe: { id: 'created/id' } },
    });
    renderPage();

    expect(await screen.findByRole('option', { name: 'onion' }))
      .toBeInTheDocument();
    const user = await completeRequiredFields();
    await user.click(screen.getByRole('button', { name: 'Create recipe' }));

    expect(createRecipeMock).toHaveBeenCalledWith({
      name: 'Tomato Soup',
      description: null,
      instructions: 'Simmer slowly.',
      cuisine: null,
      preparationTime: null,
      servings: null,
      imageUrl: null,
      sourceUrl: null,
      dietTags: [],
      allergens: [],
      isPublished: true,
      ingredients: [
        { ingredientId: 'ingredient-1', category: 'OTHER' },
      ],
    });
    expect(
      await screen.findByText('Editing created recipe created/id'),
    ).toBeInTheDocument();
  });

  it('disables duplicate create submissions while pending', async () => {
    let resolveCreate: ((value: unknown) => void) | undefined;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    listCanonicalIngredientsMock.mockResolvedValue(ingredientResponse);
    createRecipeMock.mockReturnValue(createPromise);
    renderPage();

    await screen.findByRole('option', { name: 'tomato' });
    const user = await completeRequiredFields();
    await user.click(screen.getByRole('button', { name: 'Create recipe' }));

    const pendingButton = screen.getByRole('button', { name: 'Creating...' });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(createRecipeMock).toHaveBeenCalledOnce();

    resolveCreate?.({ data: { recipe: { id: 'recipe-1' } } });
    expect(await screen.findByText('Editing created recipe recipe-1'))
      .toBeInTheDocument();
  });

  it('keeps entered values after a safe API failure', async () => {
    listCanonicalIngredientsMock.mockResolvedValue(ingredientResponse);
    createRecipeMock.mockRejectedValue(new Error('private failure'));
    renderPage();

    await screen.findByRole('option', { name: 'tomato' });
    const user = await completeRequiredFields();
    await user.click(screen.getByRole('button', { name: 'Create recipe' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to save the recipe');
    expect(alert).not.toHaveTextContent('private failure');
    expect(screen.getByLabelText('Name')).toHaveValue('Tomato Soup');
    expect(screen.getByLabelText('Canonical ingredient')).toHaveValue(
      'ingredient-1',
    );
  });
});
