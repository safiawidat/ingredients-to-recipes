import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { RecipeFormValues } from './recipe-form-values';
import { RecipeForm } from './RecipeForm';

const canonicalIngredients = [
  { id: 'ingredient-1', name: 'tomato' },
  { id: 'ingredient-2', name: 'onion' },
];

const validValues = (
  overrides: Partial<RecipeFormValues> = {},
): RecipeFormValues => ({
  name: 'Tomato Soup',
  description: 'Simple soup',
  instructions: 'Simmer until tender.',
  cuisine: 'Italian',
  preparationTime: '20',
  servings: '4',
  imageUrl: 'https://example.com/soup.jpg',
  sourceUrl: 'https://example.com/recipe',
  dietTags: 'vegetarian',
  allergens: 'dairy',
  isPublished: false,
  ingredients: [
    {
      ingredientId: 'ingredient-1',
      quantity: '2.5',
      unit: 'cups',
      category: 'MAIN',
    },
  ],
  ...overrides,
});

const renderForm = (
  initialValues?: RecipeFormValues,
  onSubmit = vi.fn(),
  isSubmitting = false,
) => {
  render(
    <RecipeForm
      mode="edit"
      canonicalIngredients={canonicalIngredients}
      initialValues={initialValues}
      isSubmitting={isSubmitting}
      onSubmit={onSubmit}
    />,
  );

  return onSubmit;
};

describe('RecipeForm', () => {
  it('renders existing values, including ingredient category and publication', () => {
    renderForm(validValues());

    expect(screen.getByLabelText('Name')).toHaveValue('Tomato Soup');
    expect(screen.getByLabelText('Instructions')).toHaveValue(
      'Simmer until tender.',
    );
    expect(screen.getByLabelText('Canonical ingredient')).toHaveValue(
      'ingredient-1',
    );
    expect(screen.getByLabelText('Category')).toHaveValue('MAIN');
    expect(
      screen.getByLabelText('Published and visible to regular users'),
    ).not.toBeChecked();
  });

  it('shows required validation without submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Name must be at least 2 characters.');
    expect(alert).toHaveTextContent('Instructions are required.');
    expect(alert).toHaveTextContent(
      'Ingredient 1 needs a canonical ingredient selection.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('adds and removes ingredient rows', async () => {
    const user = userEvent.setup();
    renderForm(validValues());

    await user.click(screen.getByRole('button', { name: 'Add ingredient' }));
    expect(screen.getByRole('group', { name: 'Ingredient 2' }))
      .toBeInTheDocument();

    await user.click(
      within(screen.getByRole('group', { name: 'Ingredient 2' })).getByRole(
        'button',
        { name: 'Remove ingredient 2' },
      ),
    );
    expect(screen.queryByRole('group', { name: 'Ingredient 2' })).not
      .toBeInTheDocument();
  });

  it('allows the final row to be removed but rejects an ingredient-free submit', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm(validValues());

    await user.click(
      screen.getByRole('button', { name: 'Remove ingredient 1' }),
    );
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Add at least one ingredient.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects duplicate canonical ingredient selections', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm(
      validValues({
        ingredients: [
          validValues().ingredients[0]!,
          validValues().ingredients[0]!,
        ],
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Each canonical ingredient can only be selected once.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates quantity, preparation time, and servings', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm(
      validValues({
        preparationTime: '1441',
        servings: '1.5',
        ingredients: [
          { ...validValues().ingredients[0]!, quantity: '-2' },
        ],
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      'Preparation time must be a whole number from 1 to 1440.',
    );
    expect(alert).toHaveTextContent(
      'Servings must be a whole number from 1 to 100.',
    );
    expect(alert).toHaveTextContent(
      'Ingredient 1 quantity must be a positive number.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects non-HTTP image and source URLs', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm(
      validValues({ imageUrl: 'javascript:alert(1)', sourceUrl: 'ftp://x.test' }),
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      'Image URL must start with http:// or https://.',
    );
    expect(alert).toHaveTextContent(
      'Source URL must start with http:// or https://.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('normalizes optional blanks and lists while preserving category', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm(
      validValues({
        description: '   ',
        cuisine: '',
        preparationTime: '',
        servings: '',
        imageUrl: '',
        sourceUrl: ' ',
        dietTags: ' Vegetarian, vegan, vegetarian,  ',
        allergens: ' Dairy, nuts, dairy ',
        ingredients: [
          {
            ingredientId: 'ingredient-1',
            quantity: '',
            unit: '  ',
            category: 'SIDE',
          },
        ],
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Tomato Soup',
      description: null,
      instructions: 'Simmer until tender.',
      cuisine: null,
      preparationTime: null,
      servings: null,
      imageUrl: null,
      sourceUrl: null,
      dietTags: ['vegetarian', 'vegan'],
      allergens: ['dairy', 'nuts'],
      isPublished: false,
      ingredients: [
        { ingredientId: 'ingredient-1', category: 'SIDE' },
      ],
    });
  });

  it('disables submit and shows pending text', () => {
    renderForm(validValues(), vi.fn(), true);

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });
});
