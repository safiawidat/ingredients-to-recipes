import { z } from 'zod';

import { IngredientCategory } from '../../generated/prisma/enums.js';
import {
  recipeInstructionsSchema,
  recipeNameSchema,
  recipePreparationTimeSchema,
  recipeServingsSchema,
} from './recipe-schemas.js';

export const MAX_IMPORT_RECIPES = 500;
export const MAX_IMPORT_ERROR_DETAILS = 100;

const nonBlankNullableString = (maximum: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} must not be blank`)
    .max(maximum, `${label} must be ${maximum} characters or fewer`)
    .nullable();

const httpUrlSchema = (label: string) =>
  z
    .string()
    .trim()
    .max(2048, `${label} must be 2048 characters or fewer`)
    .url(`${label} must be a valid URL`)
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === 'http:' || protocol === 'https:';
    }, `${label} must use HTTP or HTTPS`)
    .nullable();

const tagArraySchema = z
  .array(
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Entries must not be empty')
      .max(100, 'Entries must be 100 characters or fewer'),
  )
  .max(50, 'No more than 50 entries are allowed')
  .transform((values) => Array.from(new Set(values)));

export const recipeImportIngredientSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, 'Ingredient name is required')
    .max(100, 'Ingredient name must be 100 characters or fewer'),
  quantity: z.number().positive().finite().nullable(),
  unit: nonBlankNullableString(50, 'Unit'),
  category: z.enum(IngredientCategory),
});

export const recipeImportRecipeSchema = z.strictObject({
  name: recipeNameSchema,
  description: nonBlankNullableString(2000, 'Description'),
  instructions: recipeInstructionsSchema,
  cuisine: nonBlankNullableString(100, 'Cuisine'),
  preparationTime: recipePreparationTimeSchema,
  servings: recipeServingsSchema,
  imageUrl: httpUrlSchema('Image URL'),
  sourceUrl: httpUrlSchema('Source URL'),
  dietTags: tagArraySchema,
  allergens: tagArraySchema,
  isPublished: z.boolean(),
  ingredients: z
    .array(recipeImportIngredientSchema)
    .min(1, 'At least one ingredient is required')
    .max(100, 'No more than 100 ingredients are allowed'),
});

export const recipeImportRequestSchema = z.strictObject({
  recipes: z
    .array(recipeImportRecipeSchema)
    .min(1, 'At least one recipe is required')
    .max(
      MAX_IMPORT_RECIPES,
      `No more than ${MAX_IMPORT_RECIPES} recipes are allowed`,
    ),
});

export type RecipeImportRequest = z.infer<typeof recipeImportRequestSchema>;
export type RecipeImportRecipe = z.infer<typeof recipeImportRecipeSchema>;
