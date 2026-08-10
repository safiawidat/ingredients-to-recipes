import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { RecipeForm } from '../../components/recipes/RecipeForm';
import { getRecipeFormError } from '../../lib/recipe-form-error';
import { createRecipe } from '../../services/admin-recipe-api';
import { listCanonicalIngredients } from '../../services/ingredient-api';
import type { CanonicalIngredientReference } from '../../types/ingredient';
import type { CreateRecipeInput } from '../../types/recipe';

export const AdminRecipeCreatePage = () => {
  const navigate = useNavigate();
  const [canonicalIngredients, setCanonicalIngredients] = useState<
    CanonicalIngredientReference[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void listCanonicalIngredients()
      .then((response) => {
        if (isMounted) {
          setCanonicalIngredients(response.data.ingredients);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadError(
            'Unable to load canonical ingredients. Please try again.',
          );
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
    setLoadError(null);
    setRetryKey((current) => current + 1);
  };

  const handleSubmit = async (input: CreateRecipeInput) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const response = await createRecipe(input);
      navigate(
        `/admin/recipes/${encodeURIComponent(response.data.recipe.id)}/edit`,
      );
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
          <h1>Create Recipe</h1>
          <p>Add recipe details and canonical ingredients.</p>
        </div>
        <Link to="/admin/recipes">Back to Admin recipes</Link>
      </div>

      {isLoading && <p role="status">Loading canonical ingredients...</p>}

      {!isLoading && loadError && (
        <div className="state-panel" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={retryLoad}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !loadError && (
        <RecipeForm
          mode="create"
          canonicalIngredients={canonicalIngredients}
          isSubmitting={isSubmitting}
          submissionError={submissionError}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
};
