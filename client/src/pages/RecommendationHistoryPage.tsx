import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getRecommendationHistory } from '../services/recommendation-history-api';
import type { RecommendationHistoryEntry } from '../types/recommendation-history';
import type { RecommendationFilters } from '../types/recommendation';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

interface IngredientListProps {
  ingredients: string[];
  label: string;
}

const IngredientList = ({ ingredients, label }: IngredientListProps) => (
  <div className="history-ingredient-group">
    <h3>{label}</h3>
    <ul className="history-ingredient-list" aria-label={label}>
      {ingredients.map((ingredient) => (
        <li key={ingredient}>{ingredient}</li>
      ))}
    </ul>
  </div>
);

const formatFilterValue = (value: string): string =>
  value
    .split('-')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const HistoryFilterSummary = ({ filters }: { filters: RecommendationFilters }) => (
  <section
    className="history-filter-summary"
    aria-label="Applied recommendation filters"
  >
    <h3>Filters</h3>
    <dl>
      {filters.cuisine !== undefined && (
        <div>
          <dt>Cuisine</dt>
          <dd>{filters.cuisine}</dd>
        </div>
      )}
      {filters.maxPreparationTime !== undefined && (
        <div>
          <dt>Max time</dt>
          <dd>{filters.maxPreparationTime} min</dd>
        </div>
      )}
      {filters.dietaryType !== undefined && (
        <div>
          <dt>Diet</dt>
          <dd>{formatFilterValue(filters.dietaryType)}</dd>
        </div>
      )}
      {filters.excludeAllergens !== undefined &&
        filters.excludeAllergens.length > 0 && (
          <div>
            <dt>Excluded allergens</dt>
            <dd>
              {filters.excludeAllergens.map(formatFilterValue).join(', ')}
            </dd>
          </div>
        )}
    </dl>
  </section>
);

export const RecommendationHistoryPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<RecommendationHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const retryLoad = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getRecommendationHistory();
      setHistory(response.data.history);
    } catch {
      setError('Unable to load search history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    void getRecommendationHistory()
      .then((response) => {
        if (isMounted) {
          setHistory(response.data.history);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Unable to load search history. Please try again.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleUseAgain = (entry: RecommendationHistoryEntry) => {
    navigate('/recommendations', {
      state: {
        ingredients: entry.ingredients,
        limit: entry.limit,
        ...(entry.filters !== undefined ? { filters: entry.filters } : {}),
      },
    });
  };

  return (
    <section className="page-panel history-page">
      <div className="page-heading">
        <div>
          <h1>Search history</h1>
          <p>Your latest recommendation searches, newest first.</p>
        </div>
      </div>

      {isLoading && <p role="status">Loading search history...</p>}

      {!isLoading && error && (
        <div className="state-panel" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void retryLoad()}>
            Try Again
          </button>
        </div>
      )}

      {!isLoading && !error && history.length === 0 && (
        <p className="state-panel" role="status">
          You have no previous recommendation searches yet.
        </p>
      )}

      {!isLoading && !error && history.length > 0 && (
        <ul className="history-list" aria-label="Recommendation search history">
          {history.map((entry) => (
            <li key={entry.id}>
              <article className="history-card">
                <div className="history-card-heading">
                  <h2>
                    <time dateTime={entry.createdAt}>
                      {dateTimeFormatter.format(new Date(entry.createdAt))}
                    </time>
                  </h2>
                  <button type="button" onClick={() => handleUseAgain(entry)}>
                    Use Again
                  </button>
                </div>

                <IngredientList
                  ingredients={entry.ingredients}
                  label="Searched ingredients"
                />
                <IngredientList
                  ingredients={entry.recognizedIngredients}
                  label="Recognized ingredients"
                />
                {entry.unknownIngredients.length > 0 && (
                  <IngredientList
                    ingredients={entry.unknownIngredients}
                    label="Unknown ingredients"
                  />
                )}

                {entry.filters !== undefined && (
                  <HistoryFilterSummary filters={entry.filters} />
                )}

                <dl className="history-meta">
                  <div>
                    <dt>Results</dt>
                    <dd>{entry.resultCount}</dd>
                  </div>
                  <div>
                    <dt>Selected limit</dt>
                    <dd>{entry.limit}</dd>
                  </div>
                </dl>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
