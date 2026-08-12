import type { IngredientCategory } from '../../generated/prisma/enums.js';
import { prisma } from '../../database/prisma.js';

export interface PreparedRecipeImportIngredient {
  ingredientId: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
}

export interface PreparedRecipeImportRecord {
  recordIndex: number;
  duplicateKey: string;
  name: string;
  description: string | null;
  instructions: string;
  cuisine: string | null;
  preparationTime: number | null;
  servings: number | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  dietTags: string[];
  allergens: string[];
  isPublished: boolean;
  ingredients: PreparedRecipeImportIngredient[];
}

export interface RecipeImportRepositoryResult {
  importedRecordIndexes: number[];
  existingDuplicateRecordIndexes: number[];
}

export const importRecipesAtomically = (
  recipes: PreparedRecipeImportRecord[],
  toDuplicateKey: (name: string) => string,
): Promise<RecipeImportRepositoryResult> =>
  prisma.$transaction(async (transaction) => {
    const existingRecipes = await transaction.recipe.findMany({
      select: { name: true },
    });
    const existingKeys = new Set(
      existingRecipes.map((recipe) => toDuplicateKey(recipe.name)),
    );
    const recipesToCreate = recipes.filter(
      (recipe) => !existingKeys.has(recipe.duplicateKey),
    );
    const existingDuplicateRecordIndexes = recipes
      .filter((recipe) => existingKeys.has(recipe.duplicateKey))
      .map((recipe) => recipe.recordIndex);

    if (recipesToCreate.length === 0) {
      return {
        importedRecordIndexes: [],
        existingDuplicateRecordIndexes,
      };
    }

    const createdRecipes = await transaction.recipe.createManyAndReturn({
      data: recipesToCreate.map((recipe) => ({
        name: recipe.name,
        description: recipe.description,
        instructions: recipe.instructions,
        cuisine: recipe.cuisine,
        preparationTime: recipe.preparationTime,
        servings: recipe.servings,
        imageUrl: recipe.imageUrl,
        sourceUrl: recipe.sourceUrl,
        dietTags: recipe.dietTags,
        allergens: recipe.allergens,
        isPublished: recipe.isPublished,
      })),
      select: { id: true, name: true },
    });
    const createdIdsByName = new Map(
      createdRecipes.map((recipe) => [recipe.name, recipe.id]),
    );
    const relationships = recipesToCreate.flatMap((recipe) => {
      const recipeId = createdIdsByName.get(recipe.name);

      if (!recipeId) {
        throw new Error('Bulk recipe import did not return every created ID');
      }

      return recipe.ingredients.map((ingredient) => ({
        recipeId,
        ingredientId: ingredient.ingredientId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: ingredient.category,
      }));
    });

    await transaction.recipeIngredient.createMany({ data: relationships });

    return {
      importedRecordIndexes: recipesToCreate.map(
        (recipe) => recipe.recordIndex,
      ),
      existingDuplicateRecordIndexes,
    };
  });
