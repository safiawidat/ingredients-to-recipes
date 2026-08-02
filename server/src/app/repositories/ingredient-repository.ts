import { prisma } from '../../database/prisma.js';

export interface IngredientRecord {
  id: string;
  name: string;
}

export const findIngredientsByIds = async (
  ids: string[],
): Promise<Map<string, IngredientRecord | null>> => {
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });

  const ingredientsById = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );

  const results = new Map<string, IngredientRecord | null>();

  for (const id of ids) {
    results.set(id, ingredientsById.get(id) ?? null);
  }

  return results;
};
