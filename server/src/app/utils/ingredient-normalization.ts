const INTERNAL_WHITESPACE_PATTERN = /\s+/g;

const normalizeIngredientText = (ingredient: string): string =>
  ingredient.trim().toLowerCase().replace(INTERNAL_WHITESPACE_PATTERN, ' ');

export const normalizeIngredientInputs = (
  ingredients: string[],
): string[] => {
  const normalizedIngredients: string[] = [];
  const seenIngredients = new Set<string>();

  for (const ingredient of ingredients) {
    const normalizedIngredient = normalizeIngredientText(ingredient);

    if (
      normalizedIngredient.length === 0 ||
      seenIngredients.has(normalizedIngredient)
    ) {
      continue;
    }

    seenIngredients.add(normalizedIngredient);
    normalizedIngredients.push(normalizedIngredient);
  }

  if (normalizedIngredients.length === 0) {
    throw new Error('At least one non-empty ingredient is required');
  }

  return normalizedIngredients;
};
