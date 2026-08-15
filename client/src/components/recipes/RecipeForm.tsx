import { useState } from 'react';

import { getSafeHttpUrl } from '../../lib/safe-url';
import type { CanonicalIngredientReference } from '../../types/ingredient';
import {
  ingredientCategories,
  type CreateRecipeInput,
  type IngredientCategory,
} from '../../types/recipe';
import {
  emptyRecipeFormValues,
  type RecipeFormValues,
  type RecipeIngredientFormValue,
} from './recipe-form-values';

interface IngredientRow extends RecipeIngredientFormValue {
  key: number;
}

interface RecipeFormState extends Omit<RecipeFormValues, 'ingredients'> {
  ingredients: IngredientRow[];
}

interface RecipeFormProps {
  mode: 'create' | 'edit';
  canonicalIngredients: CanonicalIngredientReference[];
  initialValues?: RecipeFormValues;
  isSubmitting: boolean;
  submissionError?: string | null;
  successMessage?: string | null;
  onSubmit: (input: CreateRecipeInput) => void | Promise<void>;
}

type FormErrors = Record<string, string>;

const emptyIngredient = (): RecipeIngredientFormValue => ({
  ingredientId: '',
  quantity: '',
  unit: '',
  category: 'OTHER',
});

const parseList = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

const categoryLabel = (category: IngredientCategory): string =>
  category.charAt(0) + category.slice(1).toLowerCase();

const validateAndBuildInput = (
  values: RecipeFormState,
): { errors: FormErrors; input: CreateRecipeInput | null } => {
  const errors: FormErrors = {};
  const name = values.name.trim();
  const instructions = values.instructions.trim();
  const preparationTimeValue = values.preparationTime.trim();
  const servingsValue = values.servings.trim();
  const imageUrl = values.imageUrl.trim();
  const sourceUrl = values.sourceUrl.trim();

  if (name.length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!instructions) {
    errors.instructions = 'Instructions are required.';
  }

  let preparationTime: number | null = null;
  if (preparationTimeValue) {
    preparationTime = Number(preparationTimeValue);
    if (
      !Number.isInteger(preparationTime) ||
      preparationTime <= 0 ||
      preparationTime > 1440
    ) {
      errors.preparationTime =
        'Preparation time must be a whole number from 1 to 1440.';
    }
  }

  let servings: number | null = null;
  if (servingsValue) {
    servings = Number(servingsValue);
    if (!Number.isInteger(servings) || servings <= 0 || servings > 100) {
      errors.servings = 'Servings must be a whole number from 1 to 100.';
    }
  }

  if (imageUrl && getSafeHttpUrl(imageUrl) === null) {
    errors.imageUrl = 'Image URL must start with http:// or https://.';
  }

  if (sourceUrl && getSafeHttpUrl(sourceUrl) === null) {
    errors.sourceUrl = 'Source URL must start with http:// or https://.';
  }

  if (values.ingredients.length === 0) {
    errors.ingredients = 'Add at least one ingredient.';
  }

  const selectedIngredientIds = values.ingredients
    .map((ingredient) => ingredient.ingredientId)
    .filter(Boolean);
  if (new Set(selectedIngredientIds).size !== selectedIngredientIds.length) {
    errors.ingredients = 'Each canonical ingredient can only be selected once.';
  }

  const ingredients = values.ingredients.map((ingredient, index) => {
    if (!ingredient.ingredientId) {
      errors[`ingredient-${ingredient.key}`] =
        `Ingredient ${index + 1} needs a canonical ingredient selection.`;
    }

    const quantityValue = ingredient.quantity.trim();
    let quantity: number | undefined;
    if (quantityValue) {
      quantity = Number(quantityValue);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors[`quantity-${ingredient.key}`] =
          `Ingredient ${index + 1} quantity must be a positive number.`;
      }
    }

    const unit = ingredient.unit.trim();

    return {
      ingredientId: ingredient.ingredientId,
      ...(quantity !== undefined ? { quantity } : {}),
      ...(unit ? { unit } : {}),
      category: ingredient.category,
    };
  });

  if (Object.keys(errors).length > 0) {
    return { errors, input: null };
  }

  return {
    errors,
    input: {
      name,
      description: values.description.trim() || null,
      instructions,
      cuisine: values.cuisine.trim() || null,
      preparationTime,
      servings,
      imageUrl: imageUrl || null,
      sourceUrl: sourceUrl || null,
      dietTags: parseList(values.dietTags),
      allergens: parseList(values.allergens),
      isPublished: values.isPublished,
      ingredients,
    },
  };
};

export const RecipeForm = ({
  mode,
  canonicalIngredients,
  initialValues,
  isSubmitting,
  submissionError = null,
  successMessage = null,
  onSubmit,
}: RecipeFormProps) => {
  const startingValues = initialValues ?? emptyRecipeFormValues();
  const [values, setValues] = useState<RecipeFormState>(() => {
    return {
      ...startingValues,
      ingredients: startingValues.ingredients.map((ingredient, index) => ({
        ...ingredient,
        key: index,
      })),
    };
  });
  const [nextIngredientKey, setNextIngredientKey] = useState(
    startingValues.ingredients.length,
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = <Key extends keyof Omit<RecipeFormState, 'ingredients'>>(
    field: Key,
    value: RecipeFormState[Key],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const updateIngredient = <Key extends keyof RecipeIngredientFormValue>(
    rowKey: number,
    field: Key,
    value: RecipeIngredientFormValue[Key],
  ) => {
    setValues((current) => ({
      ...current,
      ingredients: current.ingredients.map((ingredient) =>
        ingredient.key === rowKey
          ? { ...ingredient, [field]: value }
          : ingredient,
      ),
    }));
  };

  const addIngredient = () => {
    const key = nextIngredientKey;
    setNextIngredientKey((current) => current + 1);
    setValues((current) => ({
      ...current,
      ingredients: [...current.ingredients, { ...emptyIngredient(), key }],
    }));
  };

  const removeIngredient = (key: number) => {
    setValues((current) => ({
      ...current,
      ingredients: current.ingredients.filter(
        (ingredient) => ingredient.key !== key,
      ),
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const result = validateAndBuildInput(values);
    setErrors(result.errors);
    if (result.input) {
      void onSubmit(result.input);
    }
  };

  const errorMessages = Array.from(new Set(Object.values(errors)));

  return (
    <form className="recipe-form" noValidate onSubmit={handleSubmit}>
      {errorMessages.length > 0 && (
        <div className="form-message form-message-error" role="alert">
          <p>Please correct the following:</p>
          <ul>
            {errorMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {submissionError && (
        <p className="form-message form-message-error" role="alert">
          {submissionError}
        </p>
      )}

      {successMessage && (
        <p className="form-message form-message-success" role="status">
          {successMessage}
        </p>
      )}

      <fieldset className="recipe-form-section">
        <legend>Recipe details</legend>
        <div className="recipe-form-grid">
          <div className="form-field form-field-wide">
            <label htmlFor="recipe-name">Name</label>
            <input
              id="recipe-name"
              value={values.name}
              aria-invalid={Boolean(errors.name)}
              onChange={(event) => updateField('name', event.target.value)}
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="recipe-description">Description</label>
            <textarea
              id="recipe-description"
              rows={3}
              value={values.description}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
            />
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="recipe-instructions">Instructions</label>
            <textarea
              id="recipe-instructions"
              rows={9}
              value={values.instructions}
              aria-invalid={Boolean(errors.instructions)}
              onChange={(event) =>
                updateField('instructions', event.target.value)
              }
            />
            {errors.instructions && (
              <p className="field-error">{errors.instructions}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="recipe-cuisine">Cuisine</label>
            <input
              id="recipe-cuisine"
              value={values.cuisine}
              onChange={(event) => updateField('cuisine', event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="recipe-preparation-time">
              Preparation time (minutes)
            </label>
            <input
              id="recipe-preparation-time"
              type="number"
              inputMode="numeric"
              value={values.preparationTime}
              aria-invalid={Boolean(errors.preparationTime)}
              onChange={(event) =>
                updateField('preparationTime', event.target.value)
              }
            />
            {errors.preparationTime && (
              <p className="field-error">{errors.preparationTime}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="recipe-servings">Servings</label>
            <input
              id="recipe-servings"
              type="number"
              inputMode="numeric"
              value={values.servings}
              aria-invalid={Boolean(errors.servings)}
              onChange={(event) => updateField('servings', event.target.value)}
            />
            {errors.servings && (
              <p className="field-error">{errors.servings}</p>
            )}
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="recipe-image-url">Image URL</label>
            <input
              id="recipe-image-url"
              type="url"
              value={values.imageUrl}
              aria-invalid={Boolean(errors.imageUrl)}
              onChange={(event) => updateField('imageUrl', event.target.value)}
            />
            {errors.imageUrl && (
              <p className="field-error">{errors.imageUrl}</p>
            )}
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="recipe-source-url">Source URL</label>
            <input
              id="recipe-source-url"
              type="url"
              value={values.sourceUrl}
              aria-invalid={Boolean(errors.sourceUrl)}
              onChange={(event) => updateField('sourceUrl', event.target.value)}
            />
            {errors.sourceUrl && (
              <p className="field-error">{errors.sourceUrl}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="recipe-diet-tags">Dietary tags</label>
            <input
              id="recipe-diet-tags"
              value={values.dietTags}
              aria-describedby="recipe-tags-help"
              onChange={(event) => updateField('dietTags', event.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="recipe-allergens">Allergens</label>
            <input
              id="recipe-allergens"
              value={values.allergens}
              aria-describedby="recipe-tags-help"
              onChange={(event) => updateField('allergens', event.target.value)}
            />
          </div>
          <p className="form-help form-field-wide" id="recipe-tags-help">
            Separate tags and allergens with commas.
          </p>

          <label className="checkbox-field form-field-wide">
            <input
              type="checkbox"
              checked={values.isPublished}
              onChange={(event) =>
                updateField('isPublished', event.target.checked)
              }
            />
            Published and visible to regular users
          </label>
        </div>
      </fieldset>

      <fieldset className="recipe-form-section ingredient-editor">
        <legend>Ingredients</legend>
        <p className="form-help">
          Select each canonical ingredient once. Quantity and unit are optional.
        </p>

        {values.ingredients.length === 0 && (
          <p className="empty-ingredient-message">No ingredients added.</p>
        )}

        <div className="ingredient-editor-list">
          {values.ingredients.map((ingredient, index) => (
            <fieldset className="ingredient-editor-row" key={ingredient.key}>
              <legend>Ingredient {index + 1}</legend>
              <div className="form-field ingredient-select-field">
                <label htmlFor={`ingredient-${ingredient.key}`}>
                  Canonical ingredient
                </label>
                <select
                  id={`ingredient-${ingredient.key}`}
                  value={ingredient.ingredientId}
                  aria-invalid={Boolean(errors[`ingredient-${ingredient.key}`])}
                  onChange={(event) =>
                    updateIngredient(
                      ingredient.key,
                      'ingredientId',
                      event.target.value,
                    )
                  }
                >
                  <option value="">Select an ingredient</option>
                  {canonicalIngredients.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor={`quantity-${ingredient.key}`}>Quantity</label>
                <input
                  id={`quantity-${ingredient.key}`}
                  type="number"
                  inputMode="decimal"
                  value={ingredient.quantity}
                  aria-invalid={Boolean(errors[`quantity-${ingredient.key}`])}
                  onChange={(event) =>
                    updateIngredient(
                      ingredient.key,
                      'quantity',
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="form-field">
                <label htmlFor={`unit-${ingredient.key}`}>Unit</label>
                <input
                  id={`unit-${ingredient.key}`}
                  value={ingredient.unit}
                  onChange={(event) =>
                    updateIngredient(
                      ingredient.key,
                      'unit',
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="form-field">
                <label htmlFor={`category-${ingredient.key}`}>Category</label>
                <select
                  id={`category-${ingredient.key}`}
                  value={ingredient.category}
                  onChange={(event) =>
                    updateIngredient(
                      ingredient.key,
                      'category',
                      event.target.value as IngredientCategory,
                    )
                  }
                >
                  {ingredientCategories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabel(category)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="secondary-button ingredient-remove-button"
                type="button"
                onClick={() => removeIngredient(ingredient.key)}
              >
                Remove ingredient {index + 1}
              </button>
            </fieldset>
          ))}
        </div>

        <button
          className="secondary-button ingredient-add-button"
          type="button"
          onClick={addIngredient}
        >
          Add ingredient
        </button>
      </fieldset>

      <div className="recipe-form-actions">
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === 'create'
              ? 'Creating...'
              : 'Saving...'
            : mode === 'create'
              ? 'Create recipe'
              : 'Save changes'}
        </button>
      </div>
    </form>
  );
};
