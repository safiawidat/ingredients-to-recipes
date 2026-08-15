import { z } from 'zod';

import { IngredientCategory } from '../../generated/prisma/enums.js';

const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 10_000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_TAGS = 50;
const MAX_TAG_LENGTH = 100;
const MAX_URL_LENGTH = 2048;

const hasDuplicateIngredientIds = (
  ingredients: { ingredientId: string }[],
): boolean => {
  const ingredientIds = ingredients.map(
    (ingredient) => ingredient.ingredientId,
  );

  return new Set(ingredientIds).size !== ingredientIds.length;
};

const recipeIngredientInputSchema = z.object({
  ingredientId: z.string().trim().min(1, 'Ingredient id is required'),
  quantity: z.number().positive().finite().optional(),
  unit: z
    .string()
    .trim()
    .min(1, 'Unit must not be empty')
    .max(50, 'Unit must be 50 characters or fewer')
    .optional(),
  category: z.enum(IngredientCategory).default(IngredientCategory.OTHER),
});

const recipeIngredientsArraySchema = z
  .array(recipeIngredientInputSchema)
  .min(1, 'At least one ingredient is required')
  .refine((ingredients) => !hasDuplicateIngredientIds(ingredients), {
    message:
      'Recipe ingredients must not contain duplicate ingredient references',
  });

const tagArraySchema = z
  .array(
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Entries must not be empty')
      .max(
        MAX_TAG_LENGTH,
        `Entries must be ${MAX_TAG_LENGTH} characters or fewer`,
      ),
  )
  .max(MAX_TAGS, `No more than ${MAX_TAGS} entries are allowed`)
  .default([])
  .transform((values) => Array.from(new Set(values)));

export const recipeNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(150, 'Name must be 150 characters or fewer');

const descriptionSchema = z
  .string()
  .trim()
  .min(1, 'Description must not be empty')
  .max(2000, 'Description must be 2000 characters or fewer')
  .nullable();

export const recipeInstructionsSchema = z
  .string()
  .trim()
  .min(1, 'Instructions are required')
  .max(10000, 'Instructions must be 10000 characters or fewer');

const cuisineSchema = z
  .string()
  .trim()
  .min(1, 'Cuisine must not be empty')
  .max(100, 'Cuisine must be 100 characters or fewer')
  .nullable();

export const recipePreparationTimeSchema = z
  .number()
  .int()
  .positive('Preparation time must be a positive integer')
  .max(1440, 'Preparation time must be 1440 minutes or fewer')
  .nullable();

export const recipeServingsSchema = z
  .number()
  .int()
  .positive('Servings must be a positive integer')
  .max(100, 'Servings must be 100 or fewer')
  .nullable();

const httpUrlSchema = (label: string) =>
  z
    .string()
    .trim()
    .max(MAX_URL_LENGTH, `${label} must be ${MAX_URL_LENGTH} characters or fewer`)
    .url(`${label} must be a valid URL`)
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    }, `${label} must use HTTP or HTTPS`)
    .nullable();

const imageUrlSchema = httpUrlSchema('Image URL');
const sourceUrlSchema = httpUrlSchema('Source URL');

export const recipeIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Recipe id is required'),
});

export const listRecipesQuerySchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .max(MAX_PAGE, `Page must be ${MAX_PAGE} or fewer`)
    .default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'Page size must be at least 1')
    .max(MAX_PAGE_SIZE, `Page size must be ${MAX_PAGE_SIZE} or fewer`)
    .default(DEFAULT_PAGE_SIZE),
  cuisine: z
    .string()
    .trim()
    .min(1, 'Cuisine must not be empty')
    .max(100, 'Cuisine must be 100 characters or fewer')
    .optional(),
  maxPreparationTime: z.coerce
    .number()
    .int()
    .positive('Maximum preparation time must be a positive integer')
    .optional(),
});

export const createRecipeSchema = z.object({
  name: recipeNameSchema,
  description: descriptionSchema.optional(),
  instructions: recipeInstructionsSchema,
  cuisine: cuisineSchema.optional(),
  preparationTime: recipePreparationTimeSchema.optional(),
  servings: recipeServingsSchema.optional(),
  imageUrl: imageUrlSchema.optional(),
  sourceUrl: sourceUrlSchema.optional(),
  dietTags: tagArraySchema,
  allergens: tagArraySchema,
  isPublished: z.boolean().default(true),
  ingredients: recipeIngredientsArraySchema,
});

export const updateRecipeSchema = z
  .object({
    name: recipeNameSchema.optional(),
    description: descriptionSchema.optional(),
    instructions: recipeInstructionsSchema.optional(),
    cuisine: cuisineSchema.optional(),
    preparationTime: recipePreparationTimeSchema.optional(),
    servings: recipeServingsSchema.optional(),
    imageUrl: imageUrlSchema.optional(),
    sourceUrl: sourceUrlSchema.optional(),
    dietTags: tagArraySchema.optional(),
    allergens: tagArraySchema.optional(),
    isPublished: z.boolean().optional(),
    ingredients: recipeIngredientsArraySchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });
