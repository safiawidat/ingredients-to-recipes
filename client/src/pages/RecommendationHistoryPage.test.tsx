import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecommendationHistoryResponse } from '../types/recommendation-history';

const { getRecommendationHistoryMock } = vi.hoisted(() => ({
  getRecommendationHistoryMock: vi.fn(),
}));

vi.mock('../services/recommendation-history-api', () => ({
  getRecommendationHistory: getRecommendationHistoryMock,
}));

import { RecommendationHistoryPage } from './RecommendationHistoryPage';

const historyResponse: RecommendationHistoryResponse = {
  data: {
    history: [
      {
        id: 'history-newest',
        ingredients: ['tomato', 'garbanzo bean'],
        recognizedIngredients: ['tomato', 'chickpea'],
        unknownIngredients: ['mystery item'],
        resultCount: 2,
        limit: 10,
        filters: {
          cuisine: 'Mediterranean-inspired',
          maxPreparationTime: 30,
          dietaryType: 'vegan',
          excludeAllergens: ['peanut', 'soy'],
        },
        createdAt: '2026-08-11T08:00:00.000Z',
      },
      {
        id: 'history-older',
        ingredients: ['onion'],
        recognizedIngredients: ['onion'],
        unknownIngredients: [],
        resultCount: 0,
        limit: 5,
        createdAt: '2026-08-10T08:00:00.000Z',
      },
    ],
  },
};

const emptyResponse: RecommendationHistoryResponse = {
  data: { history: [] },
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/history']}>
      <Routes>
        <Route path="/history" element={<RecommendationHistoryPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  getRecommendationHistoryMock.mockResolvedValue(emptyResponse);
});

describe('RecommendationHistoryPage', () => {
  it('shows an accessible loading state', () => {
    getRecommendationHistoryMock.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading search history...',
    );
  });

  it('renders backend order and compact history details', async () => {
    getRecommendationHistoryMock.mockResolvedValue(historyResponse);
    renderPage();

    const list = await screen.findByRole('list', {
      name: 'Recommendation search history',
    });
    const articles = within(list).getAllByRole('article');

    expect(articles).toHaveLength(2);
    expect(within(articles[0]!).getAllByText('tomato')).toHaveLength(2);
    expect(within(articles[0]!).getByText('garbanzo bean'))
      .toBeInTheDocument();
    expect(within(articles[0]!).getByText('chickpea')).toBeInTheDocument();
    expect(within(articles[0]!).getByText('mystery item'))
      .toBeInTheDocument();
    expect(within(articles[0]!).getByText('2')).toBeInTheDocument();
    expect(within(articles[0]!).getByText('10')).toBeInTheDocument();
    expect(within(articles[1]!).getAllByText('onion')).toHaveLength(2);

    const time = within(articles[0]!).getByText((_content, element) =>
      element?.tagName.toLowerCase() === 'time',
    );
    expect(time).toHaveAttribute(
      'datetime',
      '2026-08-11T08:00:00.000Z',
    );
    expect(time).not.toHaveTextContent('Invalid Date');
  });

  it('shows the empty state', async () => {
    renderPage();

    const message = await screen.findByText(
      'You have no previous recommendation searches yet.',
    );
    expect(message).toHaveAttribute('role', 'status');
  });

  it('shows a compact filter summary only for filtered entries', async () => {
    getRecommendationHistoryMock.mockResolvedValue(historyResponse);
    renderPage();

    const articles = within(
      await screen.findByRole('list', {
        name: 'Recommendation search history',
      }),
    ).getAllByRole('article');
    const summary = within(articles[0]!).getByRole('region', {
      name: 'Applied recommendation filters',
    });

    expect(summary).toHaveTextContent('CuisineMediterranean-inspired');
    expect(summary).toHaveTextContent('Max time30 min');
    expect(summary).toHaveTextContent('DietVegan');
    expect(summary).toHaveTextContent('Excluded allergensPeanut, Soy');
    expect(
      within(articles[1]!).queryByRole('region', {
        name: 'Applied recommendation filters',
      }),
    ).not.toBeInTheDocument();
  });

  it('shows a safe error and retries the list request', async () => {
    getRecommendationHistoryMock
      .mockRejectedValueOnce(new Error('private detail'))
      .mockResolvedValueOnce(historyResponse);
    const user = userEvent.setup();
    renderPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Unable to load search history. Please try again.',
    );
    expect(alert).not.toHaveTextContent('private detail');

    await user.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(
      await screen.findByRole('list', {
        name: 'Recommendation search history',
      }),
    ).toBeInTheDocument();
    expect(getRecommendationHistoryMock).toHaveBeenCalledTimes(2);
  });

  it('navigates Use Again with ingredients, limit, and filters state', async () => {
    const Destination = () => {
      const location = useLocation();
      return <pre>{JSON.stringify(location.state)}</pre>;
    };
    getRecommendationHistoryMock.mockResolvedValue(historyResponse);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<RecommendationHistoryPage />} />
          <Route path="/recommendations" element={<Destination />} />
        </Routes>
      </MemoryRouter>,
    );

    const buttons = await screen.findAllByRole('button', {
      name: 'Use Again',
    });
    await user.click(buttons[0]!);

    await waitFor(() => {
      expect(screen.getByText(/"ingredients":\["tomato","garbanzo bean"\]/))
        .toBeInTheDocument();
    });
    expect(screen.getByText(/"limit":10/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /"filters":\{"cuisine":"Mediterranean-inspired","maxPreparationTime":30,"dietaryType":"vegan","excludeAllergens":\["peanut","soy"\]\}/,
      ),
    ).toBeInTheDocument();
    expect(getRecommendationHistoryMock).toHaveBeenCalledTimes(1);
  });

  it('keeps filters absent when using an old history entry again', async () => {
    const Destination = () => {
      const location = useLocation();
      return <pre>{JSON.stringify(location.state)}</pre>;
    };
    getRecommendationHistoryMock.mockResolvedValue(historyResponse);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/history']}>
        <Routes>
          <Route path="/history" element={<RecommendationHistoryPage />} />
          <Route path="/recommendations" element={<Destination />} />
        </Routes>
      </MemoryRouter>,
    );

    const buttons = await screen.findAllByRole('button', { name: 'Use Again' });
    await user.click(buttons[1]!);

    expect(await screen.findByText('{"ingredients":["onion"],"limit":5}'))
      .toBeInTheDocument();
  });
});
