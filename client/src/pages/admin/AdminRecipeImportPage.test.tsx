import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/api';

const { importRecipesMock } = vi.hoisted(() => ({
  importRecipesMock: vi.fn(),
}));

vi.mock('../../services/recipe-import-api', () => ({
  importRecipes: importRecipesMock,
}));

import { AdminRecipeImportPage } from './AdminRecipeImportPage';

const validPayload = {
  recipes: [
    {
      name: 'Tomato Soup',
      description: null,
      instructions: 'Cook it.',
      cuisine: null,
      preparationTime: null,
      servings: null,
      imageUrl: null,
      sourceUrl: null,
      dietTags: [],
      allergens: [],
      isPublished: true,
      ingredients: [
        { name: 'tomato', quantity: null, unit: null, category: 'MAIN' },
      ],
    },
  ],
};

const createJsonFile = (
  contents: string,
  name = 'recipes.json',
  size?: number,
): File => {
  const file = new File([contents], name, { type: 'application/json' });
  Object.defineProperty(file, 'text', {
    value: vi.fn().mockResolvedValue(contents),
  });
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminRecipeImportPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AdminRecipeImportPage', () => {
  it('starts with a labelled file input and disabled import action', () => {
    renderPage();

    expect(screen.getByLabelText('Recipe JSON file')).toHaveAttribute(
      'accept',
      '.json,application/json',
    );
    expect(screen.getByRole('button', { name: 'Import Recipes' })).toBeDisabled();
  });

  it('shows the selected filename and size and clears stale results on replacement', async () => {
    const user = userEvent.setup();
    importRecipesMock.mockResolvedValue({
      data: { received: 1, imported: 1, skippedDuplicates: 0, duplicates: [] },
    });
    renderPage();

    const input = screen.getByLabelText('Recipe JSON file');
    await user.upload(input, createJsonFile(JSON.stringify(validPayload)));
    expect(screen.getByRole('status')).toHaveTextContent('recipes.json');
    await user.click(screen.getByRole('button', { name: 'Import Recipes' }));
    expect(await screen.findByText('Import complete')).toBeInTheDocument();

    await user.upload(input, createJsonFile('{}', 'replacement.json'));
    expect(screen.queryByText('Import complete')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('replacement.json');
  });

  it('rejects an oversized file before reading or submitting it', async () => {
    const user = userEvent.setup();
    const file = createJsonFile('{}', 'large.json', 1024 * 1024 + 1);
    renderPage();

    await user.upload(screen.getByLabelText('Recipe JSON file'), file);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'exceeds the 1 MiB size limit',
    );
    expect(screen.getByRole('button', { name: 'Import Recipes' })).toBeDisabled();
    expect(file.text).not.toHaveBeenCalled();
    expect(importRecipesMock).not.toHaveBeenCalled();
  });

  it('keeps a malformed selected file and makes no API call', async () => {
    const user = userEvent.setup();
    renderPage();

    const input = screen.getByLabelText('Recipe JSON file');
    await user.upload(input, createJsonFile('{bad json'));
    await user.click(screen.getByRole('button', { name: 'Import Recipes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'does not contain valid JSON',
    );
    expect(screen.getByRole('status')).toHaveTextContent('recipes.json');
    expect(importRecipesMock).not.toHaveBeenCalled();
  });

  it('sends parsed JSON unchanged and prevents duplicate pending submissions', async () => {
    const user = userEvent.setup();
    let resolveImport: ((value: unknown) => void) | undefined;
    importRecipesMock.mockReturnValue(
      new Promise((resolve) => {
        resolveImport = resolve;
      }),
    );
    renderPage();

    await user.upload(
      screen.getByLabelText('Recipe JSON file'),
      createJsonFile(JSON.stringify(validPayload)),
    );
    const button = screen.getByRole('button', { name: 'Import Recipes' });
    await user.dblClick(button);

    await waitFor(() => expect(importRecipesMock).toHaveBeenCalledTimes(1));
    expect(importRecipesMock).toHaveBeenCalledWith(validPayload);
    expect(screen.getByLabelText('Recipe JSON file')).toBeDisabled();

    resolveImport?.({
      data: { received: 1, imported: 1, skippedDuplicates: 0, duplicates: [] },
    });
    expect(await screen.findByText('Import complete')).toBeInTheDocument();
  });

  it('renders success counts and semantic duplicate details, including all-duplicate success', async () => {
    const user = userEvent.setup();
    importRecipesMock.mockResolvedValue({
      data: {
        received: 2,
        imported: 0,
        skippedDuplicates: 2,
        duplicates: [
          { recordIndex: 0, name: 'Soup A', reason: 'EXISTING_RECIPE' },
          {
            recordIndex: 1,
            name: 'Soup A',
            reason: 'DUPLICATE_IN_PAYLOAD',
          },
        ],
      },
    });
    renderPage();

    await user.upload(
      screen.getByLabelText('Recipe JSON file'),
      createJsonFile(JSON.stringify(validPayload)),
    );
    await user.click(screen.getByRole('button', { name: 'Import Recipes' }));

    const resultHeading = await screen.findByRole('heading', {
      name: 'Import complete',
    });
    const result = resultHeading.closest('section');
    expect(result).not.toBeNull();
    const resultView = within(result as HTMLElement);
    expect(resultView.getByText('Received').nextSibling).toHaveTextContent('2');
    expect(resultView.getByText('Imported').nextSibling).toHaveTextContent('0');
    expect(resultView.getAllByRole('listitem')).toHaveLength(2);
    expect(result).toHaveTextContent('Record index 0');
    expect(result).toHaveTextContent('already exists');
    expect(result).toHaveTextContent('duplicate in this file');
  });

  it('shows only safe structured API details and preserves the file for retry', async () => {
    const user = userEvent.setup();
    importRecipesMock.mockRejectedValue(
      new ApiError(422, 'UNKNOWN_INGREDIENTS', 'Unknown ingredients found', {
        recordErrors: [
          {
            recordIndex: 0,
            recipeName: 'Tomato Soup',
            path: 'ingredients[0].name',
            code: 'UNKNOWN_INGREDIENT',
            message: 'Ingredient "dragon fruit" is not recognized',
          },
        ],
        totalErrors: 1,
        errorsTruncated: false,
        unknownIngredients: ['dragon fruit'],
      }),
    );
    renderPage();

    await user.upload(
      screen.getByLabelText('Recipe JSON file'),
      createJsonFile(JSON.stringify(validPayload)),
    );
    await user.click(screen.getByRole('button', { name: 'Import Recipes' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Record index 0');
    expect(alert).toHaveTextContent('Tomato Soup');
    expect(alert).toHaveTextContent('ingredients[0].name');
    expect(alert).toHaveTextContent('Unknown ingredients: dragon fruit');
    expect(screen.getByRole('status')).toHaveTextContent('recipes.json');
    expect(screen.getByRole('button', { name: 'Import Recipes' })).toBeEnabled();
  });

  it('uses a generic retryable message for non-API failures', async () => {
    const user = userEvent.setup();
    importRecipesMock.mockRejectedValue(new Error('private network details'));
    renderPage();

    await user.upload(
      screen.getByLabelText('Recipe JSON file'),
      createJsonFile(JSON.stringify(validPayload)),
    );
    await user.click(screen.getByRole('button', { name: 'Import Recipes' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to import recipes. Please try again.');
    expect(alert).not.toHaveTextContent('private network details');
  });
});
