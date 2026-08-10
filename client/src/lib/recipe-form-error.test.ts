import { describe, expect, it } from 'vitest';

import { ApiError } from './api';
import { getRecipeFormError } from './recipe-form-error';

describe('getRecipeFormError', () => {
  it('maps known ingredient errors to useful safe messages', () => {
    expect(
      getRecipeFormError(
        new ApiError(404, 'INGREDIENT_NOT_FOUND', 'private details'),
      ),
    ).toContain('selected ingredients no longer exist');
    expect(
      getRecipeFormError(
        new ApiError(409, 'DUPLICATE_RECIPE_INGREDIENT', 'private details'),
      ),
    ).toContain('only be included once');
  });

  it('maps validation and unexpected failures without exposing details', () => {
    expect(
      getRecipeFormError(
        new ApiError(400, 'VALIDATION_ERROR', 'private validation details'),
      ),
    ).toBe(
      'Some recipe fields were rejected. Review the form and try again.',
    );
    expect(getRecipeFormError(new Error('private network details'))).toBe(
      'Unable to save the recipe. Please try again.',
    );
  });
});
