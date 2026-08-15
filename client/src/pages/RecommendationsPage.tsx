import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { ApiError } from '../lib/api';
import { getSafeHttpUrl } from '../lib/safe-url';
import { recommendRecipes } from '../services/recommendation-api';
import type {
  RecommendationAllergen,
  RecommendationCuisine,
  RecommendationDietaryType,
  RecommendationFilters,
  RecommendationIngredient,
  RecommendationResponse,
} from '../types/recommendation';
import {
  recommendationAllergenOptions,
  recommendationCuisineOptions,
  recommendationDietaryOptions,
} from '../types/recommendation';

const MAX_INGREDIENTS = 50;
const MAX_INGREDIENT_LENGTH = 100;
const DEFAULT_LIMIT = 5;
const LIMIT_OPTIONS = [5, 10, 20] as const;
const PREPARATION_TIME_OPTIONS = [15, 30, 45, 60, 75] as const;
const NO_RECOGNIZED_INGREDIENTS = 'NO_RECOGNIZED_INGREDIENTS';

const filterLabels: Record<
  RecommendationDietaryType | RecommendationAllergen,
  string
> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  'dairy-free': 'Dairy-free',
  'gluten-free': 'Gluten-free',
  dairy: 'Dairy',
  egg: 'Egg',
  fish: 'Fish',
  gluten: 'Gluten',
  peanut: 'Peanut',
  sesame: 'Sesame',
  soy: 'Soy',
  'tree-nut': 'Tree nut',
};

interface RecommendationPrefill {
  ingredients: string[];
  limit: (typeof LIMIT_OPTIONS)[number];
  filters?: RecommendationFilters;
}

const isOption = <Option extends string>(
  value: unknown,
  options: readonly Option[],
): value is Option =>
  typeof value === 'string' && options.some((option) => option === value);

const getFiltersPrefill = (value: unknown): RecommendationFilters | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const filters = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'cuisine',
    'maxPreparationTime',
    'dietaryType',
    'excludeAllergens',
  ]);

  if (Object.keys(filters).some((key) => !allowedKeys.has(key))) {
    return null;
  }

  if (
    filters.cuisine !== undefined &&
    !isOption(filters.cuisine, recommendationCuisineOptions)
  ) {
    return null;
  }
  if (
    filters.maxPreparationTime !== undefined &&
    (!Number.isInteger(filters.maxPreparationTime) ||
      (filters.maxPreparationTime as number) < 1 ||
      (filters.maxPreparationTime as number) > 1440)
  ) {
    return null;
  }
  if (
    filters.dietaryType !== undefined &&
    !isOption(filters.dietaryType, recommendationDietaryOptions)
  ) {
    return null;
  }
  if (
    filters.excludeAllergens !== undefined &&
    (!Array.isArray(filters.excludeAllergens) ||
      filters.excludeAllergens.length > recommendationAllergenOptions.length ||
      !filters.excludeAllergens.every((allergen) =>
        isOption(allergen, recommendationAllergenOptions),
      ))
  ) {
    return null;
  }

  const excluded = new Set(
    (filters.excludeAllergens ?? []) as RecommendationAllergen[],
  );

  return {
    ...(filters.cuisine !== undefined
      ? { cuisine: filters.cuisine as RecommendationCuisine }
      : {}),
    ...(filters.maxPreparationTime !== undefined
      ? { maxPreparationTime: filters.maxPreparationTime as number }
      : {}),
    ...(filters.dietaryType !== undefined
      ? { dietaryType: filters.dietaryType as RecommendationDietaryType }
      : {}),
    ...(filters.excludeAllergens !== undefined
      ? {
          excludeAllergens: recommendationAllergenOptions.filter((allergen) =>
            excluded.has(allergen),
          ),
        }
      : {}),
  };
};

const getRecommendationPrefill = (
  state: unknown,
): RecommendationPrefill | null => {
  if (typeof state !== 'object' || state === null) {
    return null;
  }

  const { ingredients, limit, filters } = state as Record<string, unknown>;

  if (
    !Array.isArray(ingredients) ||
    !ingredients.every((ingredient) => typeof ingredient === 'string') ||
    !LIMIT_OPTIONS.some((option) => option === limit)
  ) {
    return null;
  }

  const parsedFilters =
    filters === undefined ? undefined : getFiltersPrefill(filters);
  if (filters !== undefined && parsedFilters === null) {
    return null;
  }

  return {
    ingredients,
    limit: limit as RecommendationPrefill['limit'],
    ...(parsedFilters !== undefined && parsedFilters !== null
      ? { filters: parsedFilters }
      : {}),
  };
};

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
  const location = useLocation();
  const navigate = useNavigate();
  const [prefill] = useState(() => getRecommendationPrefill(location.state));
  const [inputText, setInputText] = useState(() =>
    prefill?.ingredients.join('\n') ?? '',
  );
  const [limit, setLimit] = useState<number>(
    prefill?.limit ?? DEFAULT_LIMIT,
  );
  const [cuisine, setCuisine] = useState<RecommendationCuisine | ''>(
    prefill?.filters?.cuisine ?? '',
  );
  const [maxPreparationTime, setMaxPreparationTime] = useState<number | ''>(
    prefill?.filters?.maxPreparationTime ?? '',
  );
  const [dietaryType, setDietaryType] = useState<
    RecommendationDietaryType | ''
  >(prefill?.filters?.dietaryType ?? '');
  const [excludedAllergens, setExcludedAllergens] = useState<
    RecommendationAllergen[]
  >(prefill?.filters?.excludeAllergens ?? []);
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
      const filters: RecommendationFilters = {
        ...(cuisine ? { cuisine } : {}),
        ...(maxPreparationTime ? { maxPreparationTime } : {}),
        ...(dietaryType ? { dietaryType } : {}),
        ...(excludedAllergens.length > 0
          ? { excludeAllergens: excludedAllergens }
          : {}),
      };
      const response = await recommendRecipes({
        ingredients,
        limit,
        ...(Object.keys(filters).length > 0 ? { filters } : {}),
      });
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

  const handleAllergenChange = (
    allergen: RecommendationAllergen,
    checked: boolean,
  ) => {
    setExcludedAllergens((current) => {
      const selected = new Set(current);
      if (checked) {
        selected.add(allergen);
      } else {
        selected.delete(allergen);
      }

      return recommendationAllergenOptions.filter((option) =>
        selected.has(option),
      );
    });
  };

  const handleClearFilters = () => {
    setCuisine('');
    setMaxPreparationTime('');
    setDietaryType('');
    setExcludedAllergens([]);
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

        <section
          className="recommendation-filter-section"
          aria-labelledby="recommendation-filters-heading"
        >
          <div className="recommendation-filter-heading">
            <div>
              <h2 id="recommendation-filters-heading">Optional filters</h2>
              <p>Limit eligible recipes without changing match ranking.</p>
            </div>
            <button
              className="secondary-button"
              disabled={isLoading}
              type="button"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          </div>

          <div className="recommendation-filter-grid">
            <div className="form-field">
              <label htmlFor="recommendation-cuisine">Cuisine</label>
              <select
                id="recommendation-cuisine"
                disabled={isLoading}
                value={cuisine}
                onChange={(event) =>
                  setCuisine(event.target.value as RecommendationCuisine | '')
                }
              >
                <option value="">Any cuisine</option>
                {recommendationCuisineOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="recommendation-max-time">
                Maximum preparation time
              </label>
              <select
                id="recommendation-max-time"
                disabled={isLoading}
                value={maxPreparationTime}
                onChange={(event) =>
                  setMaxPreparationTime(
                    event.target.value === ''
                      ? ''
                      : Number(event.target.value),
                  )
                }
              >
                <option value="">Any time</option>
                {maxPreparationTime !== '' &&
                  !PREPARATION_TIME_OPTIONS.some(
                    (option) => option === maxPreparationTime,
                  ) && (
                    <option value={maxPreparationTime}>
                      {maxPreparationTime} minutes
                    </option>
                  )}
                {PREPARATION_TIME_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} minutes
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="recommendation-diet">Dietary type</label>
              <select
                id="recommendation-diet"
                disabled={isLoading}
                value={dietaryType}
                onChange={(event) =>
                  setDietaryType(
                    event.target.value as RecommendationDietaryType | '',
                  )
                }
              >
                <option value="">Any diet</option>
                {recommendationDietaryOptions.map((option) => (
                  <option key={option} value={option}>
                    {filterLabels[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="recommendation-allergen-fieldset">
            <legend>Allergens to exclude</legend>
            <p className="form-help">
              Exclude recipes containing any selected allergen.
            </p>
            <div className="recommendation-allergen-options">
              {recommendationAllergenOptions.map((allergen) => (
                <label key={allergen}>
                  <input
                    type="checkbox"
                    checked={excludedAllergens.includes(allergen)}
                    disabled={isLoading}
                    onChange={(event) =>
                      handleAllergenChange(allergen, event.target.checked)
                    }
                  />
                  <span>{filterLabels[allergen]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

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

                        {recommendation.missingIngredients.length > 0 && (
                          <button
                            className="primary-button recommendation-shopping-action"
                            type="button"
                            onClick={() =>
                              navigate('/shopping-list', {
                                state: {
                                  items: recommendation.missingIngredients.map(
                                    ({ id, name }) => ({ id, name }),
                                  ),
                                  recipe: {
                                    id: recipe.id,
                                    name: recipe.name,
                                  },
                                },
                              })
                            }
                          >
                            Generate Shopping List
                          </button>
                        )}

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
