import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getSafeHttpUrl } from '../lib/safe-url';
import { listRecipes } from '../services/recipe-api';
import type {
  RecipePagination,
  RecipeSummary,
} from '../types/recipe';

const PAGE_SIZE = 20;

export const RecipesPage = () => {
  const [page, setPage] = useState(1);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [pagination, setPagination] = useState<RecipePagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    void listRecipes({ page, pageSize: PAGE_SIZE })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setRecipes(response.data.recipes);
        setPagination(response.data.pagination);
      })
      .catch(() => {
        if (isMounted) {
          setError('Unable to load recipes. Please try again.');
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
  }, [page, retryKey]);

  const retry = () => {
    setIsLoading(true);
    setError(null);
    setRetryKey((current) => current + 1);
  };

  const goToPreviousPage = () => {
    setIsLoading(true);
    setError(null);
    setPage((current) => Math.max(1, current - 1));
  };

  const goToNextPage = () => {
    if (pagination && page < pagination.totalPages) {
      setIsLoading(true);
      setError(null);
      setPage((current) => current + 1);
    }
  };

  return (
    <section className="page-panel recipes-page">
      <div className="page-heading">
        <div>
          <h1>Recipes</h1>
          <p>Browse published recipes and open one for full instructions.</p>
        </div>
      </div>

      {isLoading && <p role="status">Loading recipes...</p>}

      {!isLoading && error && (
        <div className="state-panel" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !error && recipes.length === 0 && (
        <p className="state-panel" role="status">
          No recipes are available yet.
        </p>
      )}

      {!isLoading && !error && recipes.length > 0 && pagination && (
        <>
          <div className="recipe-grid">
            {recipes.map((recipe) => {
              const imageUrl = getSafeHttpUrl(recipe.imageUrl);

              return (
                <article className="recipe-card" key={recipe.id}>
                  {imageUrl && (
                    <img src={imageUrl} alt="" className="recipe-card-image" />
                  )}
                  <div className="recipe-card-content">
                    <h2>
                      <Link to={`/recipes/${encodeURIComponent(recipe.id)}`}>
                        {recipe.name}
                      </Link>
                    </h2>
                    {recipe.description && <p>{recipe.description}</p>}

                    {(recipe.cuisine ||
                      recipe.preparationTime !== null ||
                      recipe.servings !== null) && (
                      <dl className="recipe-meta">
                        {recipe.cuisine && (
                          <div>
                            <dt>Cuisine</dt>
                            <dd>{recipe.cuisine}</dd>
                          </div>
                        )}
                        {recipe.preparationTime !== null && (
                          <div>
                            <dt>Preparation</dt>
                            <dd>{recipe.preparationTime} min</dd>
                          </div>
                        )}
                        {recipe.servings !== null && (
                          <div>
                            <dt>Servings</dt>
                            <dd>{recipe.servings}</dd>
                          </div>
                        )}
                      </dl>
                    )}

                    {recipe.dietTags.length > 0 && (
                      <div className="tag-group">
                        <span className="tag-label">Diet</span>
                        <ul className="tag-list" aria-label="Diet tags">
                          {recipe.dietTags.map((tag) => (
                            <li key={tag}>{tag}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recipe.allergens.length > 0 && (
                      <div className="tag-group">
                        <span className="tag-label">Allergens</span>
                        <ul className="tag-list" aria-label="Allergens">
                          {recipe.allergens.map((allergen) => (
                            <li key={allergen}>{allergen}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <nav className="pagination" aria-label="Recipe pagination">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={goToPreviousPage}
            >
              Previous
            </button>
            <p aria-live="polite">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={goToNextPage}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  );
};
