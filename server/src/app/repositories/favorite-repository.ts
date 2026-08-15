import { prisma } from '../../database/prisma.js';

import type { RecipeSummary } from './recipe-repository.js';

const publicRecipeSummarySelect = {
  id: true,
  name: true,
  description: true,
  cuisine: true,
  preparationTime: true,
  servings: true,
  imageUrl: true,
  dietTags: true,
  allergens: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const findPublishedFavoriteRecipes = async (
  userId: string,
): Promise<RecipeSummary[]> => {
  const favorites = await prisma.favorite.findMany({
    where: {
      userId,
      recipe: { isPublished: true },
    },
    orderBy: [{ createdAt: 'desc' }, { recipeId: 'asc' }],
    select: {
      recipe: { select: publicRecipeSummarySelect },
    },
  });

  return favorites.map((favorite) => favorite.recipe);
};

export const upsertFavorite = async (
  userId: string,
  recipeId: string,
): Promise<void> => {
  await prisma.favorite.upsert({
    where: { userId_recipeId: { userId, recipeId } },
    create: { userId, recipeId },
    update: {},
  });
};

export const deleteFavorite = async (
  userId: string,
  recipeId: string,
): Promise<void> => {
  await prisma.favorite.deleteMany({ where: { userId, recipeId } });
};
