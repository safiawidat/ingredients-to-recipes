import { ApplicationError } from '../errors/application-error.js';
import {
  importRecipesAtomically,
  type PreparedRecipeImportRecord,
} from '../repositories/recipe-import-repository.js';
import { normalizeIngredientInput } from '../utils/ingredient-normalization.js';
import {
  MAX_IMPORT_ERROR_DETAILS,
  recipeImportRequestSchema,
  type RecipeImportRecipe,
} from '../validation/recipe-import-schemas.js';
import { findIngredientsByNormalizedValues } from './ingredient-lookup-service.js';

export type RecipeImportDuplicateReason =
  | 'EXISTING_RECIPE'
  | 'DUPLICATE_IN_PAYLOAD';

export interface RecipeImportDuplicate {
  recordIndex: number;
  name: string;
  reason: RecipeImportDuplicateReason;
}

export interface RecipeImportSummary {
  received: number;
  imported: number;
  skippedDuplicates: number;
  duplicates: RecipeImportDuplicate[];
}

export interface RecipeImportRecordError {
  recordIndex: number | null;
  recipeName: string | null;
  path: string;
  code: string;
  message: string;
}

export interface RecipeImportErrorDetails {
  recordErrors: RecipeImportRecordError[];
  totalErrors: number;
  errorsTruncated: boolean;
  unknownIngredients?: string[];
  totalUnknownIngredients?: number;
  unknownIngredientsTruncated?: boolean;
}

const RECIPE_WHITESPACE_PATTERN = /\s+/g;

export const toRecipeDuplicateKey = (name: string): string =>
  name.trim().toLowerCase().replace(RECIPE_WHITESPACE_PATTERN, ' ');

const formatPath = (parts: PropertyKey[]): string => {
  let result = '';

  for (const part of parts) {
    if (typeof part === 'number') {
      result += `[${part}]`;
    } else {
      result += `${result ? '.' : ''}${String(part)}`;
    }
  }

  return result || 'recipes';
};

const getRawRecipeName = (input: unknown, recordIndex: number): string | null => {
  if (typeof input !== 'object' || input === null || !('recipes' in input)) {
    return null;
  }

  const recipes = input.recipes;
  if (!Array.isArray(recipes)) {
    return null;
  }

  const recipe = recipes[recordIndex];
  if (typeof recipe !== 'object' || recipe === null || !('name' in recipe)) {
    return null;
  }

  return typeof recipe.name === 'string'
    ? recipe.name.trim().slice(0, 150) || null
    : null;
};

const validationDetails = (
  input: unknown,
  issues: { path: PropertyKey[]; code: string; message: string }[],
): RecipeImportErrorDetails => {
  const recordErrors = issues.slice(0, MAX_IMPORT_ERROR_DETAILS).map((issue) => {
    const recordIndex =
      issue.path[0] === 'recipes' && typeof issue.path[1] === 'number'
        ? issue.path[1]
        : null;
    const fieldParts = recordIndex === null ? issue.path : issue.path.slice(2);

    return {
      recordIndex,
      recipeName:
        recordIndex === null ? null : getRawRecipeName(input, recordIndex),
      path: formatPath(fieldParts),
      code: issue.code.toUpperCase(),
      message: issue.message,
    };
  });

  return {
    recordErrors,
    totalErrors: issues.length,
    errorsTruncated: issues.length > recordErrors.length,
  };
};

const validationError = (
  details: RecipeImportErrorDetails,
): ApplicationError =>
  new ApplicationError(
    400,
    'VALIDATION_ERROR',
    'Recipe import validation failed',
    details,
  );

interface NormalizedRecipeIngredient {
  normalizedName: string;
  ingredientIndex: number;
}

interface NormalizedRecipe {
  recipe: RecipeImportRecipe;
  recordIndex: number;
  ingredients: NormalizedRecipeIngredient[];
}

export const importRecipes = async (input: unknown): Promise<RecipeImportSummary> => {
  const parsed = recipeImportRequestSchema.safeParse(input);

  if (!parsed.success) {
    throw validationError(validationDetails(input, parsed.error.issues));
  }

  const normalizedRecipes: NormalizedRecipe[] = parsed.data.recipes.map(
    (recipe, recordIndex) => ({
      recipe,
      recordIndex,
      ingredients: recipe.ingredients.map((ingredient, ingredientIndex) => ({
        normalizedName: normalizeIngredientInput(ingredient.name),
        ingredientIndex,
      })),
    }),
  );
  const normalizedTerms = Array.from(
    new Set(
      normalizedRecipes.flatMap((recipe) =>
        recipe.ingredients.map((ingredient) => ingredient.normalizedName),
      ),
    ),
  );
  const lookupResults = await findIngredientsByNormalizedValues(normalizedTerms);
  const unknownTerms: string[] = [];
  const seenUnknownTerms = new Set<string>();
  const unknownRecordErrors: RecipeImportRecordError[] = [];
  let totalUnknownErrors = 0;

  for (const normalizedRecipe of normalizedRecipes) {
    for (const ingredient of normalizedRecipe.ingredients) {
      if (lookupResults.get(ingredient.normalizedName)) {
        continue;
      }

      totalUnknownErrors += 1;
      if (!seenUnknownTerms.has(ingredient.normalizedName)) {
        seenUnknownTerms.add(ingredient.normalizedName);
        unknownTerms.push(ingredient.normalizedName);
      }
      if (unknownRecordErrors.length < MAX_IMPORT_ERROR_DETAILS) {
        unknownRecordErrors.push({
          recordIndex: normalizedRecipe.recordIndex,
          recipeName: normalizedRecipe.recipe.name,
          path: `ingredients[${ingredient.ingredientIndex}].name`,
          code: 'UNKNOWN_INGREDIENT',
          message: `Ingredient "${ingredient.normalizedName}" is not recognized`,
        });
      }
    }
  }

  if (totalUnknownErrors > 0) {
    const returnedUnknownTerms = unknownTerms.slice(0, MAX_IMPORT_ERROR_DETAILS);
    throw new ApplicationError(
      422,
      'UNKNOWN_INGREDIENTS',
      'One or more recipe ingredients are not recognized',
      {
        recordErrors: unknownRecordErrors,
        totalErrors: totalUnknownErrors,
        errorsTruncated: totalUnknownErrors > unknownRecordErrors.length,
        unknownIngredients: returnedUnknownTerms,
        totalUnknownIngredients: unknownTerms.length,
        unknownIngredientsTruncated:
          unknownTerms.length > returnedUnknownTerms.length,
      } satisfies RecipeImportErrorDetails,
    );
  }

  const duplicateIngredientErrors: RecipeImportRecordError[] = [];
  let totalDuplicateIngredientErrors = 0;
  const preparedRecords: PreparedRecipeImportRecord[] = normalizedRecipes.map(
    (normalizedRecipe) => {
      const seenIngredientIds = new Set<string>();
      const ingredients = normalizedRecipe.recipe.ingredients.map(
        (ingredient, ingredientIndex) => {
          const normalizedName =
            normalizedRecipe.ingredients[ingredientIndex]?.normalizedName ?? '';
          const match = lookupResults.get(normalizedName);

          if (!match) {
            throw new Error('Resolved ingredient lookup became inconsistent');
          }

          if (seenIngredientIds.has(match.id)) {
            totalDuplicateIngredientErrors += 1;
            if (
              duplicateIngredientErrors.length < MAX_IMPORT_ERROR_DETAILS
            ) {
              duplicateIngredientErrors.push({
                recordIndex: normalizedRecipe.recordIndex,
                recipeName: normalizedRecipe.recipe.name,
                path: `ingredients[${ingredientIndex}].name`,
                code: 'DUPLICATE_RECIPE_INGREDIENT',
                message: `Ingredient "${normalizedName}" resolves to duplicate canonical ingredient "${match.name}"`,
              });
            }
          }
          seenIngredientIds.add(match.id);

          return {
            ingredientId: match.id,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.category,
          };
        },
      );

      return {
        recordIndex: normalizedRecipe.recordIndex,
        duplicateKey: toRecipeDuplicateKey(normalizedRecipe.recipe.name),
        ...normalizedRecipe.recipe,
        ingredients,
      };
    },
  );

  if (totalDuplicateIngredientErrors > 0) {
    throw validationError({
      recordErrors: duplicateIngredientErrors,
      totalErrors: totalDuplicateIngredientErrors,
      errorsTruncated:
        totalDuplicateIngredientErrors > duplicateIngredientErrors.length,
    });
  }

  const firstRecordByKey = new Map<string, number>();
  const payloadDuplicates: RecipeImportDuplicate[] = [];
  const uniqueRecords: PreparedRecipeImportRecord[] = [];

  for (const record of preparedRecords) {
    if (firstRecordByKey.has(record.duplicateKey)) {
      payloadDuplicates.push({
        recordIndex: record.recordIndex,
        name: record.name,
        reason: 'DUPLICATE_IN_PAYLOAD',
      });
      continue;
    }

    firstRecordByKey.set(record.duplicateKey, record.recordIndex);
    uniqueRecords.push(record);
  }

  const repositoryResult = await importRecipesAtomically(
    uniqueRecords,
    toRecipeDuplicateKey,
  );
  const recordsByIndex = new Map(
    uniqueRecords.map((record) => [record.recordIndex, record]),
  );
  const existingDuplicates: RecipeImportDuplicate[] =
    repositoryResult.existingDuplicateRecordIndexes.map((recordIndex) => {
      const record = recordsByIndex.get(recordIndex);
      if (!record) {
        throw new Error('Recipe import duplicate result is inconsistent');
      }

      return {
        recordIndex,
        name: record.name,
        reason: 'EXISTING_RECIPE',
      };
    });
  const duplicates = [...payloadDuplicates, ...existingDuplicates].sort(
    (left, right) => left.recordIndex - right.recordIndex,
  );

  return {
    received: parsed.data.recipes.length,
    imported: repositoryResult.importedRecordIndexes.length,
    skippedDuplicates: duplicates.length,
    duplicates,
  };
};
