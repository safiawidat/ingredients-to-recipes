import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  listAdminRecipes,
  updateRecipe,
} from '../../services/admin-recipe-api';
import type {
  RecipePagination,
  RecipeSummary,
} from '../../types/recipe';

const PAGE_SIZE = 20;

export const AdminRecipesPage = () => {
  const [page, setPage] = useState(1);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [pagination, setPagination] = useState<RecipePagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    void listAdminRecipes({ page, pageSize: PAGE_SIZE })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setRecipes(response.data.recipes);
        setPagination(response.data.pagination);
      })
      .catch(() => {
        if (isMounted) {
          setListError('Unable to load admin recipes. Please try again.');
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

  const prepareListRequest = () => {
    setIsLoading(true);
    setListError(null);
    setConfirmingId(null);
    setActionErrors({});
  };

  const retryList = () => {
    prepareListRequest();
    setRetryKey((current) => current + 1);
  };

  const goToPreviousPage = () => {
    prepareListRequest();
    setPage((current) => Math.max(1, current - 1));
  };

  const goToNextPage = () => {
    if (pagination && page < pagination.totalPages) {
      prepareListRequest();
      setPage((current) => current + 1);
    }
  };

  const clearActionError = (id: string) => {
    setActionErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[id];
      return nextErrors;
    });
  };

  const changePublicationStatus = async (
    recipe: RecipeSummary,
    isPublished: boolean,
  ) => {
    if (pendingRecipeId !== null) {
      return;
    }

    clearActionError(recipe.id);
    setPendingRecipeId(recipe.id);

    try {
      await updateRecipe(recipe.id, { isPublished });
      setRecipes((current) =>
        current.map((item) =>
          item.id === recipe.id ? { ...item, isPublished } : item,
        ),
      );
      setConfirmingId(null);
    } catch {
      setActionErrors((current) => ({
        ...current,
        [recipe.id]: `Unable to ${
          isPublished ? 'publish' : 'deactivate'
        } ${recipe.name}. Please try again.`,
      }));
    } finally {
      setPendingRecipeId(null);
    }
  };

  return (
    <section className="page-panel admin-recipes-page">
      <div className="page-heading">
        <div>
          <h1>Admin Recipes</h1>
          <p>Manage published and inactive recipes.</p>
        </div>
        <Link className="primary-link" to="/admin/recipes/new">
          Create Recipe
        </Link>
      </div>

      {isLoading && <p role="status">Loading admin recipes...</p>}

      {!isLoading && listError && (
        <div className="state-panel" role="alert">
          <p>{listError}</p>
          <button type="button" onClick={retryList}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !listError && recipes.length === 0 && (
        <p className="state-panel" role="status">
          No recipes are available to manage.
        </p>
      )}

      {!isLoading && !listError && recipes.length > 0 && pagination && (
        <>
          <div className="admin-recipe-list">
            {recipes.map((recipe) => {
              const isPending = pendingRecipeId === recipe.id;
              const isConfirming = confirmingId === recipe.id;

              return (
                <article
                  className="admin-recipe-card"
                  aria-labelledby={`admin-recipe-${recipe.id}`}
                  key={recipe.id}
                >
                  <div className="admin-recipe-summary">
                    <div>
                      <h2 id={`admin-recipe-${recipe.id}`}>{recipe.name}</h2>
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
                    </div>

                    <span
                      className={`publication-status ${
                        recipe.isPublished
                          ? 'publication-status-active'
                          : 'publication-status-inactive'
                      }`}
                    >
                      {recipe.isPublished
                        ? 'Published / Active'
                        : 'Inactive / Unpublished'}
                    </span>
                  </div>

                  {(recipe.dietTags.length > 0 ||
                    recipe.allergens.length > 0) && (
                    <div className="admin-recipe-tags">
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
                  )}

                  <div className="admin-recipe-actions">
                    <Link
                      to={`/admin/recipes/${encodeURIComponent(recipe.id)}/edit`}
                    >
                      Edit
                    </Link>
                    <Link to={`/recipes/${encodeURIComponent(recipe.id)}`}>
                      View details
                    </Link>
                    {recipe.isPublished ? (
                      <button
                        type="button"
                        disabled={pendingRecipeId !== null}
                        onClick={() => {
                          clearActionError(recipe.id);
                          setConfirmingId(recipe.id);
                        }}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pendingRecipeId !== null}
                        onClick={() => {
                          void changePublicationStatus(recipe, true);
                        }}
                      >
                        {isPending ? 'Publishing...' : 'Publish'}
                      </button>
                    )}
                  </div>

                  {isConfirming && (
                    <div
                      className="confirmation-panel"
                      role="dialog"
                      aria-label={`Deactivate ${recipe.name}`}
                    >
                      <h3>Deactivate {recipe.name}?</h3>
                      <p>
                        This recipe will stop appearing to regular users. Its
                        data will not be deleted.
                      </p>
                      {actionErrors[recipe.id] && (
                        <p className="action-error" role="alert">
                          {actionErrors[recipe.id]}
                        </p>
                      )}
                      <div className="confirmation-actions">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setConfirmingId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            void changePublicationStatus(recipe, false);
                          }}
                        >
                          {isPending ? 'Deactivating...' : 'Confirm deactivate'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isConfirming && actionErrors[recipe.id] && (
                    <p className="action-error" role="alert">
                      {actionErrors[recipe.id]}
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <nav className="pagination" aria-label="Admin recipe pagination">
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
