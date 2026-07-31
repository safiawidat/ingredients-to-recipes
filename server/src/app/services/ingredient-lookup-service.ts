import { prisma } from '../../database/prisma.js';

export interface IngredientLookupResult {
  id: string;
  name: string;
}

export const findIngredientByNormalizedName = async (
  normalizedName: string,
): Promise<IngredientLookupResult | null> => {
  const ingredient = await prisma.ingredient.findUnique({
    where: { name: normalizedName },
    select: { id: true, name: true },
  });

  return ingredient;
};

export const findIngredientByNormalizedAlias = async (
  normalizedAlias: string,
): Promise<IngredientLookupResult | null> => {
  const alias = await prisma.ingredientAlias.findUnique({
    where: { alias: normalizedAlias },
    select: {
      ingredient: {
        select: { id: true, name: true },
      },
    },
  });

  return alias?.ingredient ?? null;
};

export const findIngredientsByNormalizedValues = async (
  normalizedValues: string[],
): Promise<Map<string, IngredientLookupResult | null>> => {
  const [ingredients, aliases] = await Promise.all([
    prisma.ingredient.findMany({
      where: { name: { in: normalizedValues } },
      select: { id: true, name: true },
    }),
    prisma.ingredientAlias.findMany({
      where: { alias: { in: normalizedValues } },
      select: {
        alias: true,
        ingredient: { select: { id: true, name: true } },
      },
    }),
  ]);

  const ingredientsByName = new Map(
    ingredients.map((ingredient) => [ingredient.name, ingredient]),
  );
  const ingredientsByAlias = new Map(
    aliases.map((alias) => [alias.alias, alias.ingredient]),
  );

  const results = new Map<string, IngredientLookupResult | null>();

  for (const normalizedValue of normalizedValues) {
    results.set(
      normalizedValue,
      ingredientsByName.get(normalizedValue) ??
        ingredientsByAlias.get(normalizedValue) ??
        null,
    );
  }

  return results;
};
