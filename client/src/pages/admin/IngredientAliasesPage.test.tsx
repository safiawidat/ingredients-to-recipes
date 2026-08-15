import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/api';
import type { IngredientAlias } from '../../types/ingredient';

const {
  createIngredientAliasMock,
  deleteIngredientAliasMock,
  listCanonicalIngredientsMock,
  listIngredientAliasesMock,
  updateIngredientAliasMock,
} = vi.hoisted(() => ({
  createIngredientAliasMock: vi.fn(),
  deleteIngredientAliasMock: vi.fn(),
  listCanonicalIngredientsMock: vi.fn(),
  listIngredientAliasesMock: vi.fn(),
  updateIngredientAliasMock: vi.fn(),
}));

vi.mock('../../services/ingredient-alias-api', () => ({
  createIngredientAlias: createIngredientAliasMock,
  deleteIngredientAlias: deleteIngredientAliasMock,
  listIngredientAliases: listIngredientAliasesMock,
  updateIngredientAlias: updateIngredientAliasMock,
}));

vi.mock('../../services/ingredient-api', () => ({
  listCanonicalIngredients: listCanonicalIngredientsMock,
}));

import { IngredientAliasesPage } from './IngredientAliasesPage';

const loveAppleAlias: IngredientAlias = {
  id: 'alias-1',
  alias: 'love apple',
  ingredientId: 'ingredient-1',
  createdAt: '2026-07-28T00:00:00.000Z',
  ingredient: { id: 'ingredient-1', name: 'tomato' },
};

const scallionAlias: IngredientAlias = {
  id: 'alias-2',
  alias: 'scallion',
  ingredientId: 'ingredient-2',
  createdAt: '2026-07-28T00:00:00.000Z',
  ingredient: { id: 'ingredient-2', name: 'onion' },
};

const canonicalResponse = {
  data: {
    ingredients: [
      { id: 'ingredient-1', name: 'tomato' },
      { id: 'ingredient-2', name: 'onion' },
    ],
  },
};

const aliasesResponse = (aliases: IngredientAlias[]) => ({
  data: { aliases },
});

const renderPage = () => render(<IngredientAliasesPage />);

const findAliasCard = (name: string) =>
  screen.findByRole('article', { name });

const completeCreateForm = async (alias = 'New Alias') => {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Alias'), alias);
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Canonical ingredient' }),
    'ingredient-1',
  );
  return user;
};

beforeEach(() => {
  vi.resetAllMocks();
  listIngredientAliasesMock.mockResolvedValue(
    aliasesResponse([loveAppleAlias, scallionAlias]),
  );
  listCanonicalIngredientsMock.mockResolvedValue(canonicalResponse);
});

describe('IngredientAliasesPage', () => {
  it('loads aliases and canonical ingredients in parallel', () => {
    listIngredientAliasesMock.mockReturnValue(new Promise(() => undefined));
    listCanonicalIngredientsMock.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading ingredient aliases',
    );
    expect(listIngredientAliasesMock).toHaveBeenCalledOnce();
    expect(listCanonicalIngredientsMock).toHaveBeenCalledOnce();
  });

  it('renders aliases with canonical names and canonical create options', async () => {
    renderPage();

    const loveAppleCard = await findAliasCard('love apple');
    expect(loveAppleCard).toHaveTextContent('Canonical ingredient: tomato');
    expect(await findAliasCard('scallion')).toHaveTextContent(
      'Canonical ingredient: onion',
    );
    expect(screen.getByRole('option', { name: 'tomato' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'onion' })).toBeInTheDocument();
  });

  it('shows an empty alias state while retaining the create form', async () => {
    listIngredientAliasesMock.mockResolvedValue(aliasesResponse([]));
    renderPage();

    expect(
      await screen.findByText('No ingredient aliases have been created.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create alias' })).toBeEnabled();
  });

  it('shows a safe load error and retries both requests', async () => {
    const user = userEvent.setup();
    listIngredientAliasesMock
      .mockRejectedValueOnce(new Error('private failure'))
      .mockResolvedValueOnce(aliasesResponse([loveAppleAlias]));
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to load ingredient aliases');
    expect(alert).not.toHaveTextContent('private failure');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await findAliasCard('love apple')).toBeInTheDocument();
    expect(listIngredientAliasesMock).toHaveBeenCalledTimes(2);
    expect(listCanonicalIngredientsMock).toHaveBeenCalledTimes(2);
  });

  it('keeps aliases visible but disables create and edit without canonical ingredients', async () => {
    listCanonicalIngredientsMock.mockResolvedValue({
      data: { ingredients: [] },
    });
    renderPage();

    expect(
      await screen.findByRole('heading', {
        name: 'No canonical ingredients available',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create alias' })).toBeDisabled();
    const card = await findAliasCard('love apple');
    expect(within(card).getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(
      within(card).getByRole('button', { name: 'Remove alias' }),
    ).toBeEnabled();
  });

  it('validates both required create fields', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Create alias' }),
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Alias text is required.');
    expect(alert).toHaveTextContent('Select a canonical ingredient.');
    expect(createIngredientAliasMock).not.toHaveBeenCalled();
  });

  it('creates a normalized alias, sorts it, clears the form, and shows success', async () => {
    const artichokeAlias: IngredientAlias = {
      ...loveAppleAlias,
      id: 'alias-3',
      alias: 'artichoke heart',
    };
    createIngredientAliasMock.mockResolvedValue({
      data: { alias: artichokeAlias },
    });
    renderPage();

    const user = await completeCreateForm('  Artichoke Heart  ');
    await user.click(screen.getByRole('button', { name: 'Create alias' }));

    expect(createIngredientAliasMock).toHaveBeenCalledWith({
      alias: 'artichoke heart',
      ingredientId: 'ingredient-1',
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Alias “artichoke heart” created.',
    );
    expect(screen.getByLabelText('Alias')).toHaveValue('');
    expect(
      screen.getByRole('combobox', { name: 'Canonical ingredient' }),
    ).toHaveValue('');
    expect(screen.getAllByRole('article')[0]).toHaveAccessibleName(
      'artichoke heart',
    );
  });

  it('prevents duplicate create requests while pending', async () => {
    let resolveCreate: ((value: unknown) => void) | undefined;
    createIngredientAliasMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderPage();

    const user = await completeCreateForm();
    await user.click(screen.getByRole('button', { name: 'Create alias' }));

    const pendingButton = screen.getByRole('button', { name: 'Creating...' });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(createIngredientAliasMock).toHaveBeenCalledOnce();

    resolveCreate?.({
      data: {
        alias: {
          ...loveAppleAlias,
          id: 'alias-3',
          alias: 'new alias',
        },
      },
    });
    await screen.findByText('Alias “new alias” created.');
  });

  it('maps duplicate create errors and preserves entered values', async () => {
    createIngredientAliasMock.mockRejectedValue(
      new ApiError(409, 'ALIAS_ALREADY_EXISTS', 'private details'),
    );
    renderPage();

    const user = await completeCreateForm('Existing Alias');
    await user.click(screen.getByRole('button', { name: 'Create alias' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('An alias with this name already exists.');
    expect(alert).not.toHaveTextContent('private details');
    expect(screen.getByLabelText('Alias')).toHaveValue('Existing Alias');
    expect(
      screen.getByRole('combobox', { name: 'Canonical ingredient' }),
    ).toHaveValue('ingredient-1');
  });

  it('opens existing edit values and Cancel makes no request', async () => {
    const user = userEvent.setup();
    renderPage();

    const card = await findAliasCard('love apple');
    await user.click(within(card).getByRole('button', { name: 'Edit' }));

    expect(within(card).getByLabelText('Alias')).toHaveValue('love apple');
    expect(
      within(card).getByRole('combobox', { name: 'Canonical ingredient' }),
    ).toHaveValue('ingredient-1');
    await user.click(within(card).getByRole('button', { name: 'Cancel' }));

    expect(updateIngredientAliasMock).not.toHaveBeenCalled();
    expect(await findAliasCard('love apple')).toHaveTextContent('tomato');
  });

  it('updates alias text and canonical ingredient in place', async () => {
    const user = userEvent.setup();
    const updatedAlias: IngredientAlias = {
      ...loveAppleAlias,
      alias: 'green onion',
      ingredientId: 'ingredient-2',
      ingredient: { id: 'ingredient-2', name: 'onion' },
    };
    updateIngredientAliasMock.mockResolvedValue({
      data: { alias: updatedAlias },
    });
    renderPage();

    const card = await findAliasCard('love apple');
    await user.click(within(card).getByRole('button', { name: 'Edit' }));
    const aliasInput = within(card).getByLabelText('Alias');
    await user.clear(aliasInput);
    await user.type(aliasInput, ' Green Onion ');
    await user.selectOptions(
      within(card).getByRole('combobox', { name: 'Canonical ingredient' }),
      'ingredient-2',
    );
    await user.click(within(card).getByRole('button', { name: 'Save' }));

    expect(updateIngredientAliasMock).toHaveBeenCalledWith('alias-1', {
      alias: 'green onion',
      ingredientId: 'ingredient-2',
    });
    const updatedCard = await findAliasCard('green onion');
    expect(updatedCard).toHaveTextContent('Canonical ingredient: onion');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Alias “green onion” updated.',
    );
  });

  it('prevents duplicate edit requests while pending', async () => {
    const user = userEvent.setup();
    let resolveUpdate: ((value: unknown) => void) | undefined;
    updateIngredientAliasMock.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    renderPage();

    const card = await findAliasCard('love apple');
    await user.click(within(card).getByRole('button', { name: 'Edit' }));
    await user.click(within(card).getByRole('button', { name: 'Save' }));

    const pendingButton = within(card).getByRole('button', {
      name: 'Saving...',
    });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(updateIngredientAliasMock).toHaveBeenCalledOnce();

    resolveUpdate?.({ data: { alias: loveAppleAlias } });
    await screen.findByText('Alias “love apple” updated.');
  });

  it('keeps edited values after a safe edit failure', async () => {
    const user = userEvent.setup();
    updateIngredientAliasMock.mockRejectedValue(new Error('private failure'));
    renderPage();

    const card = await findAliasCard('love apple');
    await user.click(within(card).getByRole('button', { name: 'Edit' }));
    const aliasInput = within(card).getByLabelText('Alias');
    await user.clear(aliasInput);
    await user.type(aliasInput, 'changed alias');
    await user.click(within(card).getByRole('button', { name: 'Save' }));

    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent('Unable to edit the alias.');
    expect(alert).not.toHaveTextContent('private failure');
    expect(within(card).getByLabelText('Alias')).toHaveValue('changed alias');
  });

  it('requires named confirmation and Cancel does not remove', async () => {
    const user = userEvent.setup();
    renderPage();

    const card = await findAliasCard('love apple');
    await user.click(
      within(card).getByRole('button', { name: 'Remove alias' }),
    );

    const dialog = within(card).getByRole('dialog', {
      name: 'Remove alias love apple',
    });
    expect(dialog).toHaveTextContent('Remove alias “love apple”?');
    expect(dialog).toHaveTextContent('canonical ingredient “tomato”');
    expect(dialog).toHaveTextContent('will not be deleted');
    expect(deleteIngredientAliasMock).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(deleteIngredientAliasMock).not.toHaveBeenCalled();
    expect(within(card).queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('removes the final alias and shows the empty state', async () => {
    const user = userEvent.setup();
    listIngredientAliasesMock.mockResolvedValue(
      aliasesResponse([loveAppleAlias]),
    );
    deleteIngredientAliasMock.mockResolvedValue(undefined);
    renderPage();

    const card = await findAliasCard('love apple');
    await user.click(
      within(card).getByRole('button', { name: 'Remove alias' }),
    );
    await user.click(
      within(card).getByRole('button', { name: 'Confirm remove' }),
    );

    expect(deleteIngredientAliasMock).toHaveBeenCalledWith('alias-1');
    expect(
      await screen.findByText('No ingredient aliases have been created.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'love apple' })).not
      .toBeInTheDocument();
  });

  it('prevents duplicate remove requests while pending', async () => {
    const user = userEvent.setup();
    let resolveDelete: (() => void) | undefined;
    deleteIngredientAliasMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );
    renderPage();

    const card = await findAliasCard('love apple');
    await user.click(
      within(card).getByRole('button', { name: 'Remove alias' }),
    );
    await user.click(
      within(card).getByRole('button', { name: 'Confirm remove' }),
    );

    const pendingButton = within(card).getByRole('button', {
      name: 'Removing...',
    });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(deleteIngredientAliasMock).toHaveBeenCalledOnce();

    resolveDelete?.();
    await screen.findByText('Alias “love apple” removed.');
  });

  it('keeps the alias visible and shows a local remove error', async () => {
    const user = userEvent.setup();
    deleteIngredientAliasMock.mockRejectedValue(new Error('private failure'));
    renderPage();

    const card = await findAliasCard('love apple');
    await user.click(
      within(card).getByRole('button', { name: 'Remove alias' }),
    );
    await user.click(
      within(card).getByRole('button', { name: 'Confirm remove' }),
    );

    const alert = await within(card).findByRole('alert');
    expect(alert).toHaveTextContent('Unable to remove this alias.');
    expect(alert).not.toHaveTextContent('private failure');
    expect(await findAliasCard('love apple')).toBeInTheDocument();
  });
});
