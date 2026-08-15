import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { ShoppingListRouteState } from '../types/shopping-list';
import { ShoppingListPage } from './ShoppingListPage';

const validState: ShoppingListRouteState = {
  items: [
    { id: 'ingredient-basil', name: 'basil' },
    { id: 'ingredient-garlic', name: 'garlic' },
  ],
  recipe: {
    id: 'recipe/one?',
    name: 'Tomato Pasta',
  },
};

const renderPage = (state?: unknown) =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/shopping-list', state }]}
    >
      <Routes>
        <Route path="/shopping-list" element={<ShoppingListPage />} />
      </Routes>
    </MemoryRouter>,
  );

const addManualItem = async (value: string): Promise<void> => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Add an item'), value);
  await user.click(screen.getByRole('button', { name: 'Add' }));
};

describe('ShoppingListPage', () => {
  it('renders valid route-state items and the source recipe link', () => {
    renderPage(validState);

    expect(screen.getByRole('heading', { name: 'Shopping list' }))
      .toBeInTheDocument();
    expect(screen.getByText('Shopping list for', { exact: false }))
      .toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tomato Pasta' })).toHaveAttribute(
      'href',
      '/recipes/recipe%2Fone%3F',
    );
    expect(screen.getByRole('checkbox', { name: 'basil' }))
      .toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'garlic' }))
      .toBeInTheDocument();
  });

  it('preserves generated item order', () => {
    renderPage(validState);

    const list = screen.getByRole('list', { name: 'Shopping list items' });
    const items = within(list).getAllByRole('listitem');

    expect(items.map((item) => item.textContent)).toEqual([
      'basilRemove basil',
      'garlicRemove garlic',
    ]);
  });

  it('deduplicates generated items by canonical ID using the first value', () => {
    renderPage({
      ...validState,
      items: [
        { id: 'ingredient-basil', name: 'basil' },
        { id: 'ingredient-basil', name: 'renamed basil' },
      ],
    });

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'basil' }))
      .toBeInTheDocument();
    expect(screen.queryByText('renamed basil')).not.toBeInTheDocument();
  });

  it('ignores malformed generated entries and trims valid names', () => {
    renderPage({
      ...validState,
      items: [
        null,
        { id: '', name: 'empty id' },
        { id: 'missing-name' },
        { id: 'wrong-name', name: 42 },
        { id: 'ingredient-basil', name: '  basil  ' },
      ],
    });

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'basil' }))
      .toBeInTheDocument();
  });

  it.each([
    ['missing state', undefined],
    ['non-object state', 'invalid'],
    ['missing items', { recipe: validState.recipe }],
    ['malformed recipe', { items: validState.items, recipe: { id: '' } }],
    ['no valid items', { items: [null, { id: '', name: 'bad' }], recipe: validState.recipe }],
  ])('shows a safe empty state for %s', (_name, state) => {
    renderPage(state);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Create a shopping list from a recommendation with missing ingredients.',
    );
    expect(screen.queryByRole('list', { name: 'Shopping list items' })).not
      .toBeInTheDocument();
    expect(screen.getByLabelText('Add an item')).toBeInTheDocument();
  });

  it('checks and unchecks an item without removing it', async () => {
    const user = userEvent.setup();
    renderPage(validState);
    const checkbox = screen.getByRole('checkbox', { name: 'basil' });

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText('basil')).toBeInTheDocument();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('removes an item with an ingredient-specific button', async () => {
    const user = userEvent.setup();
    renderPage(validState);

    await user.click(screen.getByRole('button', { name: 'Remove basil' }));

    expect(screen.queryByRole('checkbox', { name: 'basil' })).not
      .toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'garlic' }))
      .toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Removed basil.');
  });

  it('shows the valid-list empty state after all generated items are removed', async () => {
    const user = userEvent.setup();
    renderPage({ ...validState, items: [validState.items[0]!] });

    await user.click(screen.getByRole('button', { name: 'Remove basil' }));

    expect(screen.getByText('Your shopping list is empty.')).toHaveAttribute(
      'role',
      'status',
    );
    expect(screen.getByLabelText('Add an item')).toBeInTheDocument();
  });

  it('adds a valid manual item', async () => {
    renderPage();

    await addManualItem('Milk');

    expect(screen.getByRole('checkbox', { name: 'Milk' })).toBeInTheDocument();
    expect(screen.getByLabelText('Add an item')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Added Milk.');
  });

  it('trims and collapses whitespace in manual items', async () => {
    renderPage();

    await addManualItem('  olive   oil  ');

    expect(screen.getByRole('checkbox', { name: 'olive oil' }))
      .toBeInTheDocument();
  });

  it('rejects an empty manual item', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Add an item'), '   ');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter an item to add.',
    );
    expect(screen.queryByRole('list', { name: 'Shopping list items' })).not
      .toBeInTheDocument();
  });

  it('rejects a manual item over 100 characters', async () => {
    renderPage();

    await addManualItem('a'.repeat(101));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Items must be 100 characters or fewer.',
    );
  });

  it('rejects case-insensitive manual duplicates', async () => {
    renderPage();
    await addManualItem('Milk');

    await addManualItem('  MILK  ');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'MILK is already on the list.',
    );
    expect(screen.getAllByRole('checkbox', { name: /milk/i })).toHaveLength(1);
  });

  it('rejects a manual duplicate of a generated name', async () => {
    renderPage(validState);

    await addManualItem('  BASIL  ');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'BASIL is already on the list.',
    );
    expect(screen.getAllByRole('checkbox', { name: /basil/i })).toHaveLength(1);
  });

  it('allows a manual item to be checked and removed', async () => {
    const user = userEvent.setup();
    renderPage();
    await addManualItem('bread');
    const checkbox = screen.getByRole('checkbox', { name: 'bread' });

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Remove bread' }));

    expect(screen.queryByRole('checkbox', { name: 'bread' })).not
      .toBeInTheDocument();
  });

  it('cleans checked state when an item is removed', async () => {
    const user = userEvent.setup();
    renderPage();
    await addManualItem('bread');
    await user.click(screen.getByRole('checkbox', { name: 'bread' }));
    await user.click(screen.getByRole('button', { name: 'Remove bread' }));

    await addManualItem('bread');

    expect(screen.getByRole('checkbox', { name: 'bread' })).not.toBeChecked();
  });

  it('links back to Recommendations', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/shopping-list']}>
        <Routes>
          <Route path="/shopping-list" element={<ShoppingListPage />} />
          <Route path="/recommendations" element={<p>Recommendations destination</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole('link', { name: 'Back to Recommendations' }),
    );

    expect(screen.getByText('Recommendations destination')).toBeInTheDocument();
  });
});
