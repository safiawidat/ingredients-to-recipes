import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/api';
import type { RecommendationResponse } from '../types/recommendation';

const { recommendRecipesMock } = vi.hoisted(() => ({
  recommendRecipesMock: vi.fn(),
}));

vi.mock('../services/recommendation-api', () => ({
  recommendRecipes: recommendRecipesMock,
}));

import { RecommendationsPage } from './RecommendationsPage';

const successfulResponse: RecommendationResponse = {
  data: {
    recognizedIngredients: [
      { id: 'ingredient-tomato', name: 'tomato' },
      { id: 'ingredient-onion', name: 'onion' },
    ],
    unknownIngredients: ['dragon fruit'],
    recommendations: [
      {
        recipe: {
          id: 'recipe/first?',
          name: 'First Recipe',
          description: 'The highest-ranked recipe.',
          cuisine: 'Italian',
          preparationTime: 25,
          servings: 4,
          imageUrl: 'https://example.com/first.jpg',
          dietTags: ['vegetarian'],
          allergens: ['dairy'],
        },
        score: 0.75,
        distance: 0.25,
        matchPercentage: 75,
        matchedIngredients: [
          { id: 'ingredient-tomato', name: 'tomato' },
        ],
        missingIngredients: [
          { id: 'ingredient-basil', name: 'basil' },
        ],
      },
      {
        recipe: {
          id: 'recipe-second',
          name: 'Second Recipe',
          description: null,
          cuisine: null,
          preparationTime: null,
          servings: null,
          imageUrl: 'javascript:alert(1)',
          dietTags: [],
          allergens: [],
        },
        score: 0.5,
        distance: 0.5,
        matchPercentage: 50,
        matchedIngredients: [
          { id: 'ingredient-onion', name: 'onion' },
        ],
        missingIngredients: [],
      },
    ],
  },
};

const emptyResponse: RecommendationResponse = {
  data: {
    recognizedIngredients: [
      { id: 'ingredient-tomato', name: 'tomato' },
    ],
    unknownIngredients: [],
    recommendations: [],
  },
};

const renderPage = (routeState?: unknown) =>
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/recommendations', state: routeState },
      ]}
    >
      <RecommendationsPage />
    </MemoryRouter>,
  );

const ShoppingListDestination = () => {
  const location = useLocation();

  return (
    <div>
      <h1>Shopping list destination</h1>
      <pre>{JSON.stringify(location.state)}</pre>
    </div>
  );
};

const renderPageWithShoppingDestination = () =>
  render(
    <MemoryRouter initialEntries={['/recommendations']}>
      <Routes>
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route
          path="/shopping-list"
          element={<ShoppingListDestination />}
        />
      </Routes>
    </MemoryRouter>,
  );

const setInput = (value: string): void => {
  fireEvent.change(screen.getByRole('textbox', { name: 'Available ingredients' }), {
    target: { value },
  });
};

const submit = async (): Promise<void> => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Find recipes' }));
};

beforeEach(() => {
  vi.resetAllMocks();
  recommendRecipesMock.mockResolvedValue(emptyResponse);
});

describe('RecommendationsPage', () => {
  it('prefills valid history navigation state without submitting', () => {
    renderPage({
      ingredients: ['tomato', 'garbanzo bean'],
      limit: 10,
    });

    expect(screen.getByRole('textbox', { name: 'Available ingredients' }))
      .toHaveValue('tomato\ngarbanzo bean');
    expect(screen.getByLabelText('Number of results')).toHaveValue('10');
    expect(recommendRecipesMock).not.toHaveBeenCalled();
  });

  it('prefills filters from history without submitting', () => {
    renderPage({
      ingredients: ['tomato'],
      limit: 10,
      filters: {
        cuisine: 'Mediterranean-inspired',
        maxPreparationTime: 30,
        dietaryType: 'vegan',
        excludeAllergens: ['soy', 'peanut'],
      },
    });

    expect(screen.getByLabelText('Cuisine')).toHaveValue(
      'Mediterranean-inspired',
    );
    expect(screen.getByLabelText('Maximum preparation time')).toHaveValue(
      '30',
    );
    expect(screen.getByLabelText('Dietary type')).toHaveValue('vegan');
    expect(screen.getByRole('checkbox', { name: 'Peanut' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Soy' })).toBeChecked();
    expect(recommendRecipesMock).not.toHaveBeenCalled();
  });

  it('keeps a valid non-preset backend time visible in history prefill', () => {
    renderPage({
      ingredients: ['tomato'],
      limit: 5,
      filters: { maxPreparationTime: 20 },
    });

    expect(screen.getByLabelText('Maximum preparation time')).toHaveValue(
      '20',
    );
    expect(
      within(screen.getByLabelText('Maximum preparation time')).getByRole(
        'option',
        { name: '20 minutes' },
      ),
    ).toBeInTheDocument();
    expect(recommendRecipesMock).not.toHaveBeenCalled();
  });

  it('allows editing prefilled history values', async () => {
    const user = userEvent.setup();
    renderPage({ ingredients: ['tomato'], limit: 20 });

    const textbox = screen.getByRole('textbox', {
      name: 'Available ingredients',
    });
    await user.clear(textbox);
    await user.type(textbox, 'onion');
    await user.selectOptions(screen.getByLabelText('Number of results'), '5');

    expect(textbox).toHaveValue('onion');
    expect(screen.getByLabelText('Number of results')).toHaveValue('5');
  });

  it.each([
    ['non-object state', 'invalid'],
    ['non-string ingredients', { ingredients: ['tomato', 2], limit: 5 }],
    ['unsupported limit', { ingredients: ['tomato'], limit: 3 }],
    ['missing limit', { ingredients: ['tomato'] }],
  ])('ignores malformed route state: %s', (_name, state) => {
    renderPage(state);

    expect(screen.getByRole('textbox', { name: 'Available ingredients' }))
      .toHaveValue('');
    expect(screen.getByLabelText('Number of results')).toHaveValue('5');
    expect(recommendRecipesMock).not.toHaveBeenCalled();
  });

  it('shows concise initial instructions and labelled controls', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Recipe recommendations' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/rank recipes by ingredient match/i))
      .toBeInTheDocument();
    expect(screen.getByText(/matched and what you are missing/i))
      .toBeInTheDocument();
    expect(screen.getByText(/separated by commas or new lines/i))
      .toBeInTheDocument();
    expect(screen.getByLabelText('Number of results')).toHaveValue('5');
  });

  it('renders the exact default filter controls and options', () => {
    renderPage();

    expect(
      within(screen.getByLabelText('Cuisine')).getAllByRole('option').map(
        (option) => option.textContent,
      ),
    ).toEqual([
      'Any cuisine',
      'Mediterranean-inspired',
      'Home-style',
      'General',
      'Italian-inspired',
      'Asian-inspired',
      'Middle Eastern-inspired',
      'Mexican-inspired',
    ]);
    expect(
      within(screen.getByLabelText('Maximum preparation time'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Any time',
      '15 minutes',
      '30 minutes',
      '45 minutes',
      '60 minutes',
      '75 minutes',
    ]);
    expect(
      within(screen.getByLabelText('Dietary type')).getAllByRole('option').map(
        (option) => option.textContent,
      ),
    ).toEqual([
      'Any diet',
      'Vegan',
      'Vegetarian',
      'Dairy-free',
      'Gluten-free',
    ]);
    expect(
      within(
        screen.getByRole('group', { name: 'Allergens to exclude' }),
      )
        .getAllByRole('checkbox')
        .map((checkbox) => checkbox.parentElement?.textContent),
    ).toEqual([
      'Dairy',
      'Egg',
      'Fish',
      'Gluten',
      'Peanut',
      'Sesame',
      'Soy',
      'Tree nut',
    ]);
    expect(screen.getByRole('checkbox', { name: 'Tree nut' }))
      .not.toBeChecked();
  });

  it('sends selected filters exactly with stable allergen ordering', async () => {
    const user = userEvent.setup();
    renderPage();
    setInput('tomato');

    await user.selectOptions(
      screen.getByLabelText('Cuisine'),
      'Mediterranean-inspired',
    );
    await user.selectOptions(
      screen.getByLabelText('Maximum preparation time'),
      '30',
    );
    await user.selectOptions(screen.getByLabelText('Dietary type'), 'vegan');
    await user.click(screen.getByRole('checkbox', { name: 'Soy' }));
    await user.click(screen.getByRole('checkbox', { name: 'Peanut' }));
    await user.click(screen.getByRole('checkbox', { name: 'Soy' }));
    await user.click(screen.getByRole('checkbox', { name: 'Soy' }));
    await submit();

    expect(recommendRecipesMock).toHaveBeenCalledWith({
      ingredients: ['tomato'],
      limit: 5,
      filters: {
        cuisine: 'Mediterranean-inspired',
        maxPreparationTime: 30,
        dietaryType: 'vegan',
        excludeAllergens: ['peanut', 'soy'],
      },
    });
  });

  it('clears only filters while preserving ingredients, limit, and results', async () => {
    recommendRecipesMock.mockResolvedValue(successfulResponse);
    const user = userEvent.setup();
    renderPage();
    setInput('tomato');
    await user.selectOptions(screen.getByLabelText('Number of results'), '10');
    await user.selectOptions(screen.getByLabelText('Cuisine'), 'General');
    await user.selectOptions(
      screen.getByLabelText('Maximum preparation time'),
      '45',
    );
    await user.selectOptions(
      screen.getByLabelText('Dietary type'),
      'vegetarian',
    );
    await user.click(screen.getByRole('checkbox', { name: 'Dairy' }));
    await submit();
    await screen.findByRole('heading', { name: 'First Recipe' });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(screen.getByRole('textbox')).toHaveValue('tomato');
    expect(screen.getByLabelText('Number of results')).toHaveValue('10');
    expect(screen.getByLabelText('Cuisine')).toHaveValue('');
    expect(screen.getByLabelText('Maximum preparation time')).toHaveValue('');
    expect(screen.getByLabelText('Dietary type')).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Dairy' })).not.toBeChecked();
    expect(screen.getByRole('heading', { name: 'First Recipe' }))
      .toBeInTheDocument();
    expect(recommendRecipesMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['comma-separated input', 'tomato, onion,garlic', ['tomato', 'onion', 'garlic']],
    ['newline-separated input', 'tomato\nonion\ngarlic', ['tomato', 'onion', 'garlic']],
    ['CRLF-separated input', 'tomato\r\nonion\r\ngarlic', ['tomato', 'onion', 'garlic']],
  ])('parses %s', async (_name, value, ingredients) => {
    renderPage();
    setInput(value);

    await submit();

    expect(recommendRecipesMock).toHaveBeenCalledWith({
      ingredients,
      limit: 5,
    });
  });

  it('removes blank entries while preserving duplicate values', async () => {
    renderPage();
    setInput('tomato, , tomato,\n\n onion,');

    await submit();

    expect(recommendRecipesMock).toHaveBeenCalledWith({
      ingredients: ['tomato', 'tomato', 'onion'],
      limit: 5,
    });
  });

  it('preserves ingredient casing and performs no client canonicalization', async () => {
    renderPage();
    setInput(' Tomatoes , Garbanzo Bean ');

    await submit();

    expect(recommendRecipesMock).toHaveBeenCalledWith({
      ingredients: ['Tomatoes', 'Garbanzo Bean'],
      limit: 5,
    });
  });

  it.each(['10', '20'])('sends selected limit %s as a number', async (limit) => {
    const user = userEvent.setup();
    renderPage();
    setInput('tomato');

    await user.selectOptions(screen.getByLabelText('Number of results'), limit);
    await submit();

    expect(recommendRecipesMock).toHaveBeenCalledWith({
      ingredients: ['tomato'],
      limit: Number(limit),
    });
  });

  it('rejects zero parsed ingredients locally and preserves the input', async () => {
    renderPage();
    setInput(' , \n,   ');

    await submit();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter at least one ingredient.',
    );
    expect(screen.getByRole('textbox')).toHaveValue(' , \n,   ');
    expect(recommendRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects more than 50 parsed ingredients locally', async () => {
    renderPage();
    setInput(Array.from({ length: 51 }, (_, index) => `item-${index}`).join(','));

    await submit();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter no more than 50 ingredients.',
    );
    expect(recommendRecipesMock).not.toHaveBeenCalled();
  });

  it('rejects an ingredient longer than 100 characters locally', async () => {
    renderPage();
    setInput('a'.repeat(101));

    await submit();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Each ingredient must be 100 characters or fewer.',
    );
    expect(recommendRecipesMock).not.toHaveBeenCalled();
  });

  it('shows loading state and prevents duplicate submission while pending', async () => {
    let resolveRequest: ((value: RecommendationResponse) => void) | undefined;
    recommendRecipesMock.mockReturnValue(
      new Promise<RecommendationResponse>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const user = userEvent.setup();
    renderPage();
    setInput('tomato');
    await user.selectOptions(screen.getByLabelText('Cuisine'), 'General');
    await user.click(screen.getByRole('checkbox', { name: 'Soy' }));

    await user.click(screen.getByRole('button', { name: 'Find recipes' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      'Finding the best recipe matches',
    );
    expect(screen.getByRole('button', { name: 'Finding recipes...' }))
      .toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByLabelText('Number of results')).toBeDisabled();
    expect(screen.getByLabelText('Cuisine')).toHaveValue('General');
    expect(screen.getByRole('checkbox', { name: 'Soy' })).toBeChecked();
    expect(screen.getByLabelText('Cuisine')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Finding recipes...' }));
    expect(recommendRecipesMock).toHaveBeenCalledTimes(1);

    resolveRequest?.(emptyResponse);
    expect(
      await screen.findByRole('heading', { name: 'Recognized ingredients' }),
    ).toBeInTheDocument();
  });

  it('renders recognized and unknown ingredients with an ignored explanation', async () => {
    recommendRecipesMock.mockResolvedValue(successfulResponse);
    renderPage();
    setInput('tomato, onion, dragon fruit');

    await submit();

    const recognized = await screen.findByRole('list', {
      name: 'Recognized ingredients',
    });
    expect(within(recognized).getByText('tomato')).toBeInTheDocument();
    expect(within(recognized).getByText('onion')).toBeInTheDocument();
    const unknown = screen.getByRole('list', {
      name: 'Not recognized ingredients',
    });
    expect(within(unknown).getByText('dragon fruit')).toBeInTheDocument();
    expect(screen.getByText('These ingredients were not used in matching.'))
      .toBeInTheDocument();
  });

  it('preserves backend ranking and renders provided match percentages', async () => {
    recommendRecipesMock.mockResolvedValue(successfulResponse);
    renderPage();
    setInput('tomato');

    await submit();

    const rankedList = await screen.findByRole('list', {
      name: 'Ranked recommendations',
    });
    const links = within(rankedList).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'First Recipe',
      'Second Recipe',
    ]);
    expect(within(rankedList).getByText('75% match')).toBeInTheDocument();
    expect(within(rankedList).getByText('50% match')).toBeInTheDocument();
    expect(within(rankedList).getByText('Recommendation #1'))
      .toBeInTheDocument();
    expect(within(rankedList).getByText('Recommendation #2'))
      .toBeInTheDocument();
  });

  it('renders matched and missing canonical ingredients including empty groups', async () => {
    recommendRecipesMock.mockResolvedValue(successfulResponse);
    renderPage();
    setInput('tomato');

    await submit();

    const matched = await screen.findByRole('list', {
      name: 'Matched ingredients for First Recipe',
    });
    const missing = screen.getByRole('list', {
      name: 'Missing ingredients for First Recipe',
    });
    expect(within(matched).getByText('tomato')).toBeInTheDocument();
    expect(within(missing).getByText('basil')).toBeInTheDocument();

    const secondCard = screen.getByRole('heading', { name: 'Second Recipe' })
      .closest('article');
    expect(secondCard).not.toBeNull();
    expect(within(secondCard!).getByRole('heading', { name: 'Missing ingredients' }))
      .toBeInTheDocument();
    expect(within(secondCard!).getByText('None')).toBeInTheDocument();
  });

  it('shows a shopping-list action only when missing ingredients exist', async () => {
    recommendRecipesMock.mockResolvedValue(successfulResponse);
    renderPage();
    setInput('tomato');

    await submit();

    const firstCard = screen.getByRole('heading', { name: 'First Recipe' })
      .closest('article');
    const secondCard = screen.getByRole('heading', { name: 'Second Recipe' })
      .closest('article');
    expect(firstCard).not.toBeNull();
    expect(secondCard).not.toBeNull();
    expect(
      within(firstCard!).getByRole('button', {
        name: 'Add missing ingredients to shopping list',
      }),
    ).toBeInTheDocument();
    expect(
      within(secondCard!).queryByRole('button', {
        name: 'Add missing ingredients to shopping list',
      }),
    ).not.toBeInTheDocument();
    expect(within(secondCard!).getByText('None')).toBeInTheDocument();
  });

  it('navigates with exact missing items and source recipe without another API call', async () => {
    recommendRecipesMock.mockResolvedValue(successfulResponse);
    const user = userEvent.setup();
    renderPageWithShoppingDestination();
    setInput('tomato');
    await submit();

    await user.click(
      screen.getByRole('button', {
        name: 'Add missing ingredients to shopping list',
      }),
    );

    expect(
      screen.getByRole('heading', { name: 'Shopping list destination' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/"items":\[\{"id":"ingredient-basil","name":"basil"\}\]/))
      .toBeInTheDocument();
    expect(screen.getByText(/"recipe":\{"id":"recipe\/first\?","name":"First Recipe"\}/))
      .toBeInTheDocument();
    expect(recommendRecipesMock).toHaveBeenCalledTimes(1);
  });

  it('renders encoded detail links and optional recipe metadata', async () => {
    recommendRecipesMock.mockResolvedValue(successfulResponse);
    renderPage();
    setInput('tomato');

    await submit();

    const recipeLink = await screen.findByRole('link', { name: 'First Recipe' });
    expect(recipeLink).toHaveAttribute('href', '/recipes/recipe%2Ffirst%3F');
    expect(screen.getByText('The highest-ranked recipe.')).toBeInTheDocument();
    expect(screen.getByText('Italian')).toBeInTheDocument();
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('vegetarian')).toBeInTheDocument();
    expect(screen.getByText('dairy')).toBeInTheDocument();
  });

  it('renders recognized ingredients and a successful empty state', async () => {
    const user = userEvent.setup();
    renderPage();
    setInput('tomato');
    await user.selectOptions(screen.getByLabelText('Cuisine'), 'General');

    await submit();

    expect(
      await screen.findByRole('heading', { name: 'Recognized ingredients' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No published recipes currently overlap',
    );
    expect(screen.getByLabelText('Cuisine')).toHaveValue('General');
  });

  it('shows the safe NO_RECOGNIZED_INGREDIENTS message', async () => {
    recommendRecipesMock.mockRejectedValue(
      new ApiError(
        400,
        'NO_RECOGNIZED_INGREDIENTS',
        'At least one ingredient must match a known ingredient',
      ),
    );
    renderPage();
    setInput('unknown thing');

    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'At least one ingredient must match a known ingredient',
    );
    expect(screen.getByRole('textbox')).toHaveValue('unknown thing');
  });

  it('shows a generic safe error and preserves input and limit', async () => {
    recommendRecipesMock.mockRejectedValue(new Error('private network detail'));
    const user = userEvent.setup();
    renderPage();
    setInput('Tomato');
    await user.selectOptions(screen.getByLabelText('Number of results'), '10');
    await user.selectOptions(screen.getByLabelText('Dietary type'), 'vegan');
    await user.click(screen.getByRole('checkbox', { name: 'Peanut' }));

    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to get recommendations. Please try again.',
    );
    expect(document.body.textContent).not.toContain('private network detail');
    expect(screen.getByRole('textbox')).toHaveValue('Tomato');
    expect(screen.getByLabelText('Number of results')).toHaveValue('10');
    expect(screen.getByLabelText('Dietary type')).toHaveValue('vegan');
    expect(screen.getByRole('checkbox', { name: 'Peanut' })).toBeChecked();
  });

  it('allows retry after failure with the preserved input', async () => {
    recommendRecipesMock
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce(emptyResponse);
    renderPage();
    setInput('tomato');

    await submit();
    await screen.findByRole('alert');
    await submit();

    expect(
      await screen.findByRole('heading', { name: 'Recognized ingredients' }),
    ).toBeInTheDocument();
    expect(recommendRecipesMock).toHaveBeenCalledTimes(2);
    expect(recommendRecipesMock).toHaveBeenLastCalledWith({
      ingredients: ['tomato'],
      limit: 5,
    });
  });

  it('keeps a previous successful result visible when a later request fails', async () => {
    recommendRecipesMock
      .mockResolvedValueOnce(successfulResponse)
      .mockRejectedValueOnce(new Error('failed'));
    renderPage();
    setInput('tomato');

    await submit();
    await screen.findByRole('heading', { name: 'First Recipe' });
    setInput('new ingredient');
    await submit();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'First Recipe' }))
      .toBeInTheDocument();
  });

  it('renders only safe HTTP(S) recommendation images', async () => {
    recommendRecipesMock.mockResolvedValue(successfulResponse);
    const { container } = renderPage();
    setInput('tomato');

    await submit();
    await screen.findByRole('heading', { name: 'First Recipe' });

    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0]).toHaveAttribute('src', 'https://example.com/first.jpg');
    expect(images[0]).toHaveAttribute('alt', '');
  });

  it('clears a stale error before retrying', async () => {
    let resolveRequest: ((value: RecommendationResponse) => void) | undefined;
    recommendRecipesMock
      .mockRejectedValueOnce(new Error('failed'))
      .mockReturnValueOnce(
        new Promise<RecommendationResponse>((resolve) => {
          resolveRequest = resolve;
        }),
      );
    renderPage();
    setInput('tomato');

    await submit();
    await screen.findByRole('alert');
    await submit();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    resolveRequest?.(emptyResponse);
    await waitFor(() => {
      expect(screen.queryByText('Finding the best recipe matches...')).not
        .toBeInTheDocument();
    });
  });
});
