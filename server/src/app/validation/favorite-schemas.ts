import { z } from 'zod';

export const favoriteRecipeIdParamSchema = z.object({
  recipeId: z.string().trim().min(1, 'Recipe id is required'),
});
