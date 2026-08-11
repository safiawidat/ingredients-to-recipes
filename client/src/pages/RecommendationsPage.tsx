import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '../lib/api';
import { getSafeHttpUrl } from '../lib/safe-url';
import { recommendRecipes } from '../services/recommendation-api';
import type {
  RecommendationIngredient,
  RecommendationResponse,
} from '../types/recommendation';

const MAX_INGREDIENTS = 50;
const MAX_INGREDIENT_LENGTH = 100;
const DEFAULT_LIMIT = 5;
const LIMIT_OPTIONS = [5, 10, 20] as const;
const NO_RECOGNIZED_INGREDIENTS = 'NO_RECOGNIZED_INGREDIENTS';

const parseIngredients = (value: string): string[] =>
  value
    .split(/[,\r\n]+/)
    .map((ingredient) => ingredient.trim())
    .filter((ingredient) => ingredient.length > 0);

const validateIngredients = (ingredients: string[]): string | null => {
  if (ingredients.length === 0) {
    return 'Enter at least one ingredient.';
  }

  if (ingredients.length > MAX_INGREDIENTS) {
    return `Enter no more than ${MAX_INGREDIENTS} ingredients.`;
  }

  if (
    ingredients.some(
      (ingredient) => ingredient.length > MAX_INGREDIENT_LENGTH,
    )
  ) {
    return `Each ingredient must be ${MAX_INGREDIENT_LENGTH} characters or fewer.`;
  }

  return null;
};

interface IngredientGroupProps {
  ingredients: RecommendationIngredient[];
  label: string;
  recipeName: string;
}

const IngredientGroup = ({
  ingredients,
  label,
  recipeName,
}: IngredientGroupProps) => (
  <section className="recommendation-ingredient-group">
    <h3>{label}</h3>
    {ingredients.length === 0 ? (
      <p>None</p>
    ) : (
      <ul
        className="recommendation-ingredient-list"
        aria-label={`${label} for ${recipeName}`}
      >
        {ingredients.map((ingredient) => (
          <li key={ingredient.id}>{ingredient.name}</li>
        ))}
      </ul>
    )}
  </section>
);

export const RecommendationsPage = () => {
  const [inputText, setInputText] = useState('');
  const [limit, setLimit] = useState<number>(DEFAULT_LIMIT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    RecommendationResponse['data'] | null
  >(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const ingredients = parseIngredients(inputText);
    const validationError = validateIngredients(ingredients);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await recommendRecipes({ ingredients, limit });
      setResult(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError &&
          requestError.code === NO_RECOGNIZED_INGREDIENTS
          ? requestError.message
          : 'Unable to get recommendations. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="page-panel recommendations-page">
      <div className="page-heading">
        <div>
          <h1>Recipe recommendations</h1>
          <p>
            Enter ingredients you have to rank recipes by ingredient match.
            Each result shows what you matched and what you are missing.
          </p>
        </div>
      </div>

      <form className="recommendation-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="available-ingredients">Available ingredients</label>
          <p className="form-help" id="available-ingredients-help">
            Enter ingredients separated by commas or new lines.
          </p>
          <textarea
            id="available-ingredients"
            aria-describedby="available-ingredients-help"
            disabled={isLoading}
            onChange={(event) => setInputText(event.target.value)}
            rows={6}
            value={inputText}
          />
        </div>

        <div className="recommendation-form-actions">
          <div className="form-field recommendation-limit-field">
            <label htmlFor="recommendation-limit">Number of results</label>
            <select
              id="recommendation-limit"
              disabled={isLoading}
              onChange={(event) => setLimit(Number(event.target.value))}
              value={limit}
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? 'Finding recipes...' : 'Find recipes'}
          </button>
        </div>
      </form>

      {isLoading && (
        <p className="recommendation-status" role="status">
          Finding the best recipe matches...
        </p>
      )}

      {error && (
        <p className="form-message form-message-error" role="alert">
          {error}
        </p>
      )}

      {!result && !isLoading && !error && (
        <p className="state-panel recommendation-intro">
          Add the ingredients available in your kitchen to get started.
        </p>
      )}

      {result && (
        <div className="recommendation-results">
          <section
            className="recommendation-input-summary"
            aria-labelledby="recognized-ingredients-heading"
          >
            <h2 id="recognized-ingredients-heading">
              Recognized ingredients
            </h2>
            <ul
              className="tag-list"
              aria-label="Recognized ingredients"
            >
              {result.recognizedIngredients.map((ingredient) => (
                <li key={ingredient.id}>{ingredient.name}</li>
              ))}
            </ul>
          </section>

          {result.unknownIngredients.length > 0 && (
            <section
              className="recommendation-input-summary recommendation-unknown-summary"
              aria-labelledby="unknown-ingredients-heading"
            >
              <h2 id="unknown-ingredients-heading">Not recognized</h2>
              <p>These ingredients were not used in matching.</p>
              <ul className="tag-list" aria-label="Not recognized ingredients">
                {result.unknownIngredients.map((ingredient) => (
                  <li key={ingredient}>{ingredient}</li>
                ))}
              </ul>
            </section>
          )}

          {result.recommendations.length === 0 ? (
            <p className="state-panel" role="status">
              No published recipes currently overlap with the recognized
              ingredients. Try adding another ingredient.
            </p>
          ) : (
            <ol className="recommendation-list" aria-label="Ranked recommendations">
              {result.recommendations.map((recommendation, index) => {
                const { recipe } = recommendation;
                const imageUrl = getSafeHttpUrl(recipe.imageUrl);

                return (
                  <li key={recipe.id}>
                    <article className="recommendation-card">
                      {imageUrl && (
                        <img
                          className="recommendation-card-image"
                          src={imageUrl}
                          alt=""
                        />
                      )}

                      <div className="recommendation-card-content">
                        <header className="recommendation-card-heading">
                          <div>
                            <p className="recommendation-rank">
                              Recommendation #{index + 1}
                            </p>
                            <h2>
                              <Link
                                to={`/recipes/${encodeURIComponent(recipe.id)}`}
                              >
                                {recipe.name}
                              </Link>
                            </h2>
                          </div>
                          <strong className="match-percentage">
                            {recommendation.matchPercentage}% match
                          </strong>
                        </header>

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

                        <div className="recommendation-ingredient-groups">
                          <IngredientGroup
                            ingredients={recommendation.matchedIngredients}
                            label="Matched ingredients"
                            recipeName={recipe.name}
                          />
                          <IngredientGroup
                            ingredients={recommendation.missingIngredients}
                            label="Missing ingredients"
                            recipeName={recipe.name}
                          />
                        </div>

                        {recipe.dietTags.length > 0 && (
                          <div className="tag-group">
                            <span className="tag-label">Diet</span>
                            <ul className="tag-list" aria-label={`Diet tags for ${recipe.name}`}>
                              {recipe.dietTags.map((tag) => (
                                <li key={tag}>{tag}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {recipe.allergens.length > 0 && (
                          <div className="tag-group">
                            <span className="tag-label">Allergens</span>
                            <ul className="tag-list" aria-label={`Allergens for ${recipe.name}`}>
                              {recipe.allergens.map((allergen) => (
                                <li key={allergen}>{allergen}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </section>
  );
};
