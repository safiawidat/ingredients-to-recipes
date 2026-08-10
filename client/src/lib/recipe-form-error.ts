import { ApiError } from './api';

export const getRecipeFormError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.code === 'INGREDIENT_NOT_FOUND') {
      return 'One or more selected ingredients no longer exist. Refresh and choose valid ingredients.';
    }

    if (error.code === 'DUPLICATE_RECIPE_INGREDIENT') {
      return 'Each canonical ingredient can only be included once.';
    }

    if (error.status === 400) {
      return 'Some recipe fields were rejected. Review the form and try again.';
    }
  }

  return 'Unable to save the recipe. Please try again.';
};
