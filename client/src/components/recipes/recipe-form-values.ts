import type { IngredientCategory, RecipeDetail } from '../../types/recipe';

export interface RecipeIngredientFormValue {
  ingredientId: string;
  quantity: string;
  unit: string;
  category: IngredientCategory;
}

export interface RecipeFormValues {
  name: string;
  description: string;
  instructions: string;
  cuisine: string;
  preparationTime: string;
  servings: string;
  imageUrl: string;
  sourceUrl: string;
  dietTags: string;
  allergens: string;
  isPublished: boolean;
  ingredients: RecipeIngredientFormValue[];
}

const emptyIngredient = (): RecipeIngredientFormValue => ({
  ingredientId: '',
  quantity: '',
  unit: '',
  category: 'OTHER',
});

export const emptyRecipeFormValues = (): RecipeFormValues => ({
  name: '',
  description: '',
  instructions: '',
  cuisine: '',
  preparationTime: '',
  servings: '',
  imageUrl: '',
  sourceUrl: '',
  dietTags: '',
  allergens: '',
  isPublished: true,
  ingredients: [emptyIngredient()],
});

export const recipeToFormValues = (recipe: RecipeDetail): RecipeFormValues => ({
  name: recipe.name,
  description: recipe.description ?? '',
  instructions: recipe.instructions,
  cuisine: recipe.cuisine ?? '',
  preparationTime:
    recipe.preparationTime === null ? '' : String(recipe.preparationTime),
  servings: recipe.servings === null ? '' : String(recipe.servings),
  imageUrl: recipe.imageUrl ?? '',
  sourceUrl: recipe.sourceUrl ?? '',
  dietTags: recipe.dietTags.join(', '),
  allergens: recipe.allergens.join(', '),
  isPublished: recipe.isPublished,
  ingredients: recipe.ingredients.map((ingredient) => ({
    ingredientId: ingredient.ingredientId,
    quantity:
      ingredient.quantity === null ? '' : String(ingredient.quantity),
    unit: ingredient.unit ?? '',
    category: ingredient.category,
  })),
});
