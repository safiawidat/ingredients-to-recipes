import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { RecipeForm } from '../../components/recipes/RecipeForm';
import { recipeToFormValues } from '../../components/recipes/recipe-form-values';
import { ApiError } from '../../lib/api';
import { getRecipeFormError } from '../../lib/recipe-form-error';
import { updateRecipe } from '../../services/admin-recipe-api';
import { listCanonicalIngredients } from '../../services/ingredient-api';
import { getRecipe } from '../../services/recipe-api';
import type { CanonicalIngredientReference } from '../../types/ingredient';
import type { CreateRecipeInput, RecipeDetail } from '../../types/recipe';

type LoadState =
  | { status: 'loading'; recipeId: string }
  | {
      status: 'ready';
      recipeId: string;
      recipe: RecipeDetail;
      canonicalIngredients: CanonicalIngredientReference[];
    }
  | { status: 'not-found'; recipeId: string }
  | { status: 'error'; recipeId: string };

export const AdminRecipeEditPage = () => {
  const { id = '' } = useParams();
  const [loadState, setLoadState] = useState<LoadState>({
    status: 'loading',
    recipeId: id,
  });
  const [retryKey, setRetryKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([getRecipe(id), listCanonicalIngredients()])
      .then(([recipeResponse, ingredientResponse]) => {
        if (isMounted) {
          setLoadState({
            status: 'ready',
            recipeId: id,
            recipe: recipeResponse.data.recipe,
            canonicalIngredients: ingredientResponse.data.ingredients,
          });
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setLoadState({ status: 'not-found', recipeId: id });
        } else {
          setLoadState({ status: 'error', recipeId: id });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id, retryKey]);

  const currentLoadState: LoadState =
    loadState.recipeId === id
      ? loadState
      : { status: 'loading', recipeId: id };

  const retryLoad = () => {
    setLoadState({ status: 'loading', recipeId: id });
    setRetryKey((current) => current + 1);
  };

  const handleSubmit = async (input: CreateRecipeInput) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setSuccessMessage(null);

    try {
      await updateRecipe(id, input);
      setSuccessMessage('Recipe changes saved successfully.');
    } catch (error) {
      setSubmissionError(getRecipeFormError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="page-panel admin-recipe-form-page">
      <div className="page-heading">
        <div>
          <h1>Edit Recipe</h1>
          <p>Update recipe details, ingredients, and publication status.</p>
        </div>
        <Link to="/admin/recipes">Back to Admin recipes</Link>
      </div>

      {currentLoadState.status === 'loading' && (
        <p role="status">Loading recipe editor...</p>
      )}

      {currentLoadState.status === 'not-found' && (
        <div className="state-panel">
          <h2>Recipe not found</h2>
          <p>The requested recipe is unavailable.</p>
          <Link to="/admin/recipes">Return to Admin recipes</Link>
        </div>
      )}

      {currentLoadState.status === 'error' && (
        <div className="state-panel" role="alert">
          <p>Unable to load the recipe editor. Please try again.</p>
          <button type="button" onClick={retryLoad}>
            Try again
          </button>
        </div>
      )}

      {currentLoadState.status === 'ready' && (
        <RecipeForm
          mode="edit"
          canonicalIngredients={currentLoadState.canonicalIngredients}
          initialValues={recipeToFormValues(currentLoadState.recipe)}
          isSubmitting={isSubmitting}
          submissionError={submissionError}
          successMessage={successMessage}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
};
