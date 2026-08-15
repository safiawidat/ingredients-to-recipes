import { z } from 'zod';

const aliasTextSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Alias is required')
  .max(100, 'Alias must be 100 characters or fewer');

const ingredientIdSchema = z
  .string()
  .trim()
  .min(1, 'Ingredient id is required');

export const createIngredientAliasSchema = z.object({
  alias: aliasTextSchema,
  ingredientId: ingredientIdSchema,
});

export const updateIngredientAliasSchema = z
  .object({
    alias: aliasTextSchema.optional(),
    ingredientId: ingredientIdSchema.optional(),
  })
  .refine(
    (data) => data.alias !== undefined || data.ingredientId !== undefined,
    { message: 'At least one field must be provided' },
  );

export const ingredientAliasIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Alias id is required'),
});
