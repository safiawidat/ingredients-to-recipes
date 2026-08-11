import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '../lib/api';
import { getSafeHttpUrl } from '../lib/safe-url';
import {
  getFavorites,
  unfavoriteRecipe,
} from '../services/favorite-api';
import type { RecipeSummary } from '../types/recipe';

export const FavoritesPage = () => {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [pendingRecipeIds, setPendingRecipeIds] = useState<Set<string>>(
    new Set(),
  );
  const [removalErrors, setRemovalErrors] = useState<Record<string, string>>(
    {},
  );
  const pendingRecipeIdsRef = useRef(new Set<string>());

  useEffect(() => {
    let isMounted = true;

    void getFavorites()
      .then((response) => {
        if (isMounted) {
          setRecipes(response.data.recipes);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError(true);
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
  }, [retryKey]);

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(false);
    setRetryKey((current) => current + 1);
  };

  const removeFavorite = async (recipeId: string) => {
    if (pendingRecipeIdsRef.current.has(recipeId)) {
      return;
    }

    pendingRecipeIdsRef.current.add(recipeId);
    setPendingRecipeIds((current) => new Set(current).add(recipeId));
    setRemovalErrors((current) => {
      const next = { ...current };
      delete next[recipeId];
      return next;
    });

    try {
      await unfavoriteRecipe(recipeId);
      setRecipes((current) =>
        current.filter((recipe) => recipe.id !== recipeId),
      );
    } catch (requestError) {
      setRemovalErrors((current) => ({
        ...current,
        [recipeId]:
          requestError instanceof ApiError && requestError.status === 404
            ? 'This recipe is no longer available. Try removing it again.'
            : 'Unable to remove this favorite. Please try again.',
      }));
    } finally {
      pendingRecipeIdsRef.current.delete(recipeId);
      setPendingRecipeIds((current) => {
        const next = new Set(current);
        next.delete(recipeId);
        return next;
      });
    }
  };

  return (
    <section className="page-panel favorites-page">
      <div className="page-heading">
        <div>
          <h1>Favorites</h1>
          <p>Your saved published recipes, newest first.</p>
        </div>
      </div>

      {isLoading && <p role="status">Loading favorites...</p>}

      {!isLoading && loadError && (
        <div className="state-panel" role="alert">
          <p>Unable to load favorites. Please try again.</p>
          <button type="button" onClick={retryLoad}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !loadError && recipes.length === 0 && (
        <p className="state-panel" role="status">
          You have no favorite recipes yet.
        </p>
      )}

      {!isLoading && !loadError && recipes.length > 0 && (
        <ul className="recipe-grid favorites-list" aria-label="Favorite recipes">
          {recipes.map((recipe) => {
            const imageUrl = getSafeHttpUrl(recipe.imageUrl);
            const isPending = pendingRecipeIds.has(recipe.id);
            const removalError = removalErrors[recipe.id];

            return (
              <li key={recipe.id}>
                <article className="recipe-card">
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

                    <div className="favorite-card-actions">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => void removeFavorite(recipe.id)}
                      >
                        {isPending ? 'Removing...' : 'Remove from favorites'}
                      </button>
                      {removalError && (
                        <p className="action-error" role="alert">
                          {removalError}
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
