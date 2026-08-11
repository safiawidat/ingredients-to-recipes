import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ApiError } from '../lib/api';
import { getSafeHttpUrl } from '../lib/safe-url';
import {
  favoriteRecipe,
  unfavoriteRecipe,
} from '../services/favorite-api';
import { getRecipe } from '../services/recipe-api';
import type { AuthenticatedRecipeDetail } from '../types/recipe';

type LoadState = 'loading' | 'success' | 'not-found' | 'error';

export const RecipeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<AuthenticatedRecipeDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [resultId, setResultId] = useState(id);
  const [retryKey, setRetryKey] = useState(0);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [favoriteStatus, setFavoriteStatus] = useState<string | null>(null);
  const isSavingFavoriteRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    if (!id) {
      return () => {
        isMounted = false;
      };
    }

    void getRecipe(id)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setRecipe(response.data.recipe);
        setResultId(id);
        setLoadState('success');
      })
      .catch((requestError: unknown) => {
        if (!isMounted) {
          return;
        }

        setRecipe(null);
        setResultId(id);
        setLoadState(
          requestError instanceof ApiError && requestError.status === 404
            ? 'not-found'
            : 'error',
        );
      });

    return () => {
      isMounted = false;
    };
  }, [id, retryKey]);

  const retry = () => {
    setLoadState('loading');
    setRetryKey((current) => current + 1);
  };

  const toggleFavorite = async () => {
    if (!recipe || isSavingFavoriteRef.current) {
      return;
    }

    const wasFavorite = recipe.isFavorite;
    isSavingFavoriteRef.current = true;
    setIsSavingFavorite(true);
    setFavoriteError(null);
    setFavoriteStatus(null);

    try {
      if (wasFavorite) {
        await unfavoriteRecipe(recipe.id);
      } else {
        await favoriteRecipe(recipe.id);
      }

      setRecipe((current) =>
        current?.id === recipe.id
          ? { ...current, isFavorite: !wasFavorite }
          : current,
      );
      setFavoriteStatus(
        wasFavorite ? 'Removed from favorites.' : 'Added to favorites.',
      );
    } catch (requestError) {
      setFavoriteError(
        requestError instanceof ApiError && requestError.status === 404
          ? 'This recipe is no longer available.'
          : 'Unable to update this favorite. Please try again.',
      );
    } finally {
      isSavingFavoriteRef.current = false;
      setIsSavingFavorite(false);
    }
  };

  const visibleLoadState = !id
    ? 'not-found'
    : resultId === id
      ? loadState
      : 'loading';
  const imageUrl = recipe ? getSafeHttpUrl(recipe.imageUrl) : null;
  const sourceUrl = recipe ? getSafeHttpUrl(recipe.sourceUrl) : null;

  return (
    <section className="page-panel recipe-detail-page">
      <Link className="back-link" to="/recipes">
        Back to recipes
      </Link>

      {visibleLoadState === 'loading' && (
        <>
          <h1>Recipe details</h1>
          <p role="status">Loading recipe...</p>
        </>
      )}

      {visibleLoadState === 'not-found' && (
        <div className="state-panel">
          <h1>Recipe not found</h1>
          <p>The requested recipe is unavailable.</p>
        </div>
      )}

      {visibleLoadState === 'error' && (
        <div className="state-panel" role="alert">
          <h1>Unable to load recipe</h1>
          <p>Please try again.</p>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {visibleLoadState === 'success' && recipe && (
        <article>
          <header className="recipe-detail-header">
            <div>
              <h1>{recipe.name}</h1>
              {recipe.description && <p>{recipe.description}</p>}
              <div className="recipe-favorite-control">
                <button
                  type="button"
                  aria-pressed={recipe.isFavorite}
                  disabled={isSavingFavorite}
                  onClick={() => void toggleFavorite()}
                >
                  {isSavingFavorite
                    ? recipe.isFavorite
                      ? 'Removing...'
                      : 'Saving...'
                    : recipe.isFavorite
                      ? 'Remove from favorites'
                      : 'Add to favorites'}
                </button>
                {favoriteStatus && (
                  <p role="status">{favoriteStatus}</p>
                )}
                {favoriteError && <p role="alert">{favoriteError}</p>}
              </div>
            </div>
            {imageUrl && <img src={imageUrl} alt={recipe.name} />}
          </header>

          {(recipe.cuisine ||
            recipe.preparationTime !== null ||
            recipe.servings !== null) && (
            <dl className="recipe-meta recipe-detail-meta">
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

          <section className="recipe-section">
            <h2>Ingredients</h2>
            {recipe.ingredients.length === 0 ? (
              <p>No ingredients are listed.</p>
            ) : (
              <ul className="ingredient-list">
                {recipe.ingredients.map((ingredient) => {
                  const amount = [ingredient.quantity, ingredient.unit]
                    .filter(
                      (value): value is number | string => value !== null,
                    )
                    .join(' ');

                  return (
                    <li key={ingredient.id}>
                      <span className="ingredient-name">
                        {ingredient.ingredientName}
                      </span>
                      <span>{amount || 'Quantity not specified'}</span>
                      <span className="ingredient-category">
                        {ingredient.category}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="recipe-section">
            <h2>Instructions</h2>
            <p className="recipe-instructions">{recipe.instructions}</p>
          </section>

          {sourceUrl && (
            <p className="recipe-source">
              <a href={sourceUrl} target="_blank" rel="noreferrer">
                View recipe source
              </a>
            </p>
          )}
        </article>
      )}
    </section>
  );
};
