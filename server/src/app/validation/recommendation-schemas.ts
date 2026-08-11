import { z } from 'zod';

const MAX_INGREDIENTS = 50;
const MAX_INGREDIENT_LENGTH = 100;
const DEFAULT_RECOMMENDATION_LIMIT = 5;
const MAX_RECOMMENDATION_LIMIT = 20;

export const recommendationRequestSchema = z.object({
  ingredients: z
    .array(
      z
        .string()
        .max(
          MAX_INGREDIENT_LENGTH,
          `Ingredients must be ${MAX_INGREDIENT_LENGTH} characters or fewer`,
        ),
    )
    .min(1, 'At least one ingredient is required')
    .max(
      MAX_INGREDIENTS,
      `No more than ${MAX_INGREDIENTS} ingredients are allowed`,
    )
    .refine(
      (ingredients) =>
        ingredients.some((ingredient) => ingredient.trim().length > 0),
      { message: 'At least one ingredient must not be empty' },
    ),
  limit: z
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(
      MAX_RECOMMENDATION_LIMIT,
      `Limit must be ${MAX_RECOMMENDATION_LIMIT} or fewer`,
    )
    .default(DEFAULT_RECOMMENDATION_LIMIT),
});
