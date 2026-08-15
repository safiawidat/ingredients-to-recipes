import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  seedAliases,
  seedIngredients,
  seedRecipeIngredientCount,
  seedRecipes,
  validateSeedManifest,
} from './seed-data.js';
import {
  authorizeSeed,
  DEPLOYMENT_INITIALIZATION_ARGUMENT,
  type SeedMode,
} from './seed-authorization.js';

interface DatabaseTarget {
  hostname: string;
  databaseName: string;
}

const seedMode: SeedMode = process.argv.includes(
  DEPLOYMENT_INITIALIZATION_ARGUMENT,
)
  ? 'deployment-initialization'
  : 'development-seed';

const assertSeedEnvironment = (): string =>
  authorizeSeed({
    mode: seedMode,
    nodeEnv: process.env.NODE_ENV,
    allowDevelopmentSeed: process.env.ALLOW_DATABASE_SEED,
    allowProductionInitialization:
      process.env.ALLOW_PRODUCTION_DATABASE_INITIALIZATION,
    databaseUrl: process.env.DATABASE_URL,
  });

const getSanitizedDatabaseTarget = (databaseUrl: string): DatabaseTarget => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid URL');
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));

  return {
    hostname: parsedUrl.hostname || '(unknown)',
    databaseName: databaseName || '(unknown)',
  };
};

const assertCondition = (
  condition: boolean,
  message: string,
): asserts condition => {
  if (!condition) {
    throw new Error(`Seed verification failed: ${message}`);
  }
};

const main = async (): Promise<void> => {
  const databaseUrl = assertSeedEnvironment();
  const target = getSanitizedDatabaseTarget(databaseUrl);

  validateSeedManifest();

  console.info(
    `${seedMode === 'deployment-initialization' ? 'Initializing controlled deployment baseline' : 'Seeding controlled development data'} in host=${target.hostname} database=${target.databaseName}`,
  );

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(
      async (transaction) => {
        const ingredientIdsByName = new Map<string, string>();

        for (const name of seedIngredients) {
          const ingredient = await transaction.ingredient.upsert({
            where: { name },
            update: { name },
            create: { name },
            select: { id: true, name: true },
          });

          ingredientIdsByName.set(ingredient.name, ingredient.id);
        }

        for (const seedAlias of seedAliases) {
          const ingredientId = ingredientIdsByName.get(seedAlias.ingredient);
          assertCondition(
            ingredientId !== undefined,
            `missing canonical ingredient ID for alias ${seedAlias.alias}`,
          );

          await transaction.ingredientAlias.upsert({
            where: { alias: seedAlias.alias },
            update: { ingredientId },
            create: {
              alias: seedAlias.alias,
              ingredientId,
            },
          });
        }

        for (const seedRecipe of seedRecipes) {
          const ingredients = seedRecipe.ingredients.map((relationship) => {
            const ingredientId = ingredientIdsByName.get(
              relationship.ingredient,
            );
            assertCondition(
              ingredientId !== undefined,
              `missing canonical ingredient ID for recipe ${seedRecipe.id}`,
            );

            return {
              ingredientId,
              quantity: relationship.quantity,
              unit: relationship.unit,
              category: relationship.category,
            };
          });
          const controlledValues = {
            name: seedRecipe.name,
            description: seedRecipe.description,
            instructions: seedRecipe.instructions,
            cuisine: seedRecipe.cuisine,
            preparationTime: seedRecipe.preparationTime,
            servings: seedRecipe.servings,
            imageUrl: seedRecipe.imageUrl,
            sourceUrl: seedRecipe.sourceUrl,
            dietTags: seedRecipe.dietTags,
            allergens: seedRecipe.allergens,
            isPublished: seedRecipe.isPublished,
          };

          await transaction.recipe.upsert({
            where: { id: seedRecipe.id },
            update: {
              ...controlledValues,
              ingredients: {
                deleteMany: {},
                create: ingredients,
              },
            },
            create: {
              id: seedRecipe.id,
              ...controlledValues,
              ingredients: {
                create: ingredients,
              },
            },
          });
        }

        const [storedIngredients, storedAliases, storedRecipes] =
          await Promise.all([
            transaction.ingredient.findMany({
              where: { name: { in: [...seedIngredients] } },
              select: { name: true },
            }),
            transaction.ingredientAlias.findMany({
              where: {
                alias: { in: seedAliases.map(({ alias }) => alias) },
              },
              select: {
                alias: true,
                ingredient: { select: { name: true } },
              },
            }),
            transaction.recipe.findMany({
              where: { id: { in: seedRecipes.map(({ id }) => id) } },
              select: {
                id: true,
                isPublished: true,
                ingredients: {
                  select: { ingredient: { select: { name: true } } },
                },
              },
            }),
          ]);

        assertCondition(
          storedIngredients.length === seedIngredients.length,
          `expected ${seedIngredients.length} controlled ingredients, found ${storedIngredients.length}`,
        );
        assertCondition(
          storedAliases.length === seedAliases.length,
          `expected ${seedAliases.length} controlled aliases, found ${storedAliases.length}`,
        );
        assertCondition(
          storedRecipes.length === seedRecipes.length,
          `expected ${seedRecipes.length} controlled recipes, found ${storedRecipes.length}`,
        );

        const expectedAliasTargets = new Map(
          seedAliases.map(({ alias, ingredient }) => [alias, ingredient]),
        );
        for (const storedAlias of storedAliases) {
          assertCondition(
            expectedAliasTargets.get(storedAlias.alias) ===
              storedAlias.ingredient.name,
            `alias ${storedAlias.alias} points to the wrong ingredient`,
          );
        }

        const expectedRecipes = new Map(
          seedRecipes.map((recipe) => [recipe.id, recipe]),
        );
        let storedRelationshipCount = 0;

        for (const storedRecipe of storedRecipes) {
          const expectedRecipe = expectedRecipes.get(storedRecipe.id);
          assertCondition(
            expectedRecipe !== undefined,
            `found unexpected controlled recipe ID ${storedRecipe.id}`,
          );
          assertCondition(
            storedRecipe.ingredients.length > 0,
            `recipe ${storedRecipe.id} has no ingredient relationships`,
          );

          const storedIngredientNames = storedRecipe.ingredients.map(
            ({ ingredient }) => ingredient.name,
          );
          const expectedIngredientNames = expectedRecipe.ingredients.map(
            ({ ingredient }) => ingredient,
          );

          assertCondition(
            new Set(storedIngredientNames).size === storedIngredientNames.length,
            `recipe ${storedRecipe.id} has duplicate ingredient relationships`,
          );
          assertCondition(
            storedIngredientNames.length === expectedIngredientNames.length &&
              expectedIngredientNames.every((name) =>
                storedIngredientNames.includes(name),
              ),
            `recipe ${storedRecipe.id} ingredient relationships do not match the manifest`,
          );

          storedRelationshipCount += storedRecipe.ingredients.length;
        }

        assertCondition(
          storedRelationshipCount === seedRecipeIngredientCount,
          `expected ${seedRecipeIngredientCount} controlled recipe ingredient relationships, found ${storedRelationshipCount}`,
        );

        const publishedCount = storedRecipes.filter(
          ({ isPublished }) => isPublished,
        ).length;
        assertCondition(
          publishedCount === 27,
          `expected 27 published controlled recipes, found ${publishedCount}`,
        );
        assertCondition(
          storedRecipes.length - publishedCount === 3,
          `expected 3 unpublished controlled recipes, found ${storedRecipes.length - publishedCount}`,
        );
      },
      { maxWait: 10_000, timeout: 60_000 },
    );

    console.info(
      `${seedMode === 'deployment-initialization' ? 'Deployment initialization' : 'Seed'} complete: ${seedIngredients.length} ingredients, ${seedAliases.length} aliases, ${seedRecipes.length} recipes, ${seedRecipeIngredientCount} recipe ingredients.`,
    );
  } finally {
    await prisma.$disconnect();
  }
};

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Database seed failed: ${message}`);
    process.exitCode = 1;
  });
