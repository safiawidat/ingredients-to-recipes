import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../database/prisma.js';
import { ApplicationError } from '../errors/application-error.js';

export interface IngredientAliasWithIngredient {
  id: string;
  alias: string;
  ingredientId: string;
  createdAt: Date;
  ingredient: {
    id: string;
    name: string;
  };
}

export interface CreateIngredientAliasInput {
  alias: string;
  ingredientId: string;
}

export interface UpdateIngredientAliasInput {
  alias?: string | undefined;
  ingredientId?: string | undefined;
}

const aliasSelect = {
  id: true,
  alias: true,
  ingredientId: true,
  createdAt: true,
  ingredient: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const duplicateAliasError = (): ApplicationError =>
  new ApplicationError(
    409,
    'ALIAS_ALREADY_EXISTS',
    'An alias with this name already exists',
  );

const ingredientNotFoundError = (): ApplicationError =>
  new ApplicationError(
    404,
    'INGREDIENT_NOT_FOUND',
    'The specified ingredient does not exist',
  );

const aliasNotFoundError = (): ApplicationError =>
  new ApplicationError(
    404,
    'ALIAS_NOT_FOUND',
    'The specified alias does not exist',
  );

const isAliasConflict = (error: unknown): boolean => {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002' ||
    error.meta?.modelName !== 'IngredientAlias'
  ) {
    return false;
  }

  const target = error.meta.target;
  const fields = Array.isArray(target) ? target : [target];

  return fields.some(
    (field) => typeof field === 'string' && field.includes('alias'),
  );
};

export const listIngredientAliases = async (): Promise<
  IngredientAliasWithIngredient[]
> => {
  const aliases = await prisma.ingredientAlias.findMany({
    select: aliasSelect,
    orderBy: { alias: 'asc' },
  });

  return aliases;
};

export const createIngredientAlias = async (
  input: CreateIngredientAliasInput,
): Promise<IngredientAliasWithIngredient> => {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: input.ingredientId },
    select: { id: true },
  });

  if (!ingredient) {
    throw ingredientNotFoundError();
  }

  const existingAlias = await prisma.ingredientAlias.findUnique({
    where: { alias: input.alias },
    select: { id: true },
  });

  if (existingAlias) {
    throw duplicateAliasError();
  }

  try {
    return await prisma.ingredientAlias.create({
      data: {
        alias: input.alias,
        ingredientId: input.ingredientId,
      },
      select: aliasSelect,
    });
  } catch (error) {
    if (isAliasConflict(error)) {
      throw duplicateAliasError();
    }

    throw error;
  }
};

export const updateIngredientAlias = async (
  id: string,
  input: UpdateIngredientAliasInput,
): Promise<IngredientAliasWithIngredient> => {
  const existingAlias = await prisma.ingredientAlias.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingAlias) {
    throw aliasNotFoundError();
  }

  if (input.ingredientId !== undefined) {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: input.ingredientId },
      select: { id: true },
    });

    if (!ingredient) {
      throw ingredientNotFoundError();
    }
  }

  if (input.alias !== undefined) {
    const conflictingAlias = await prisma.ingredientAlias.findUnique({
      where: { alias: input.alias },
      select: { id: true },
    });

    if (conflictingAlias && conflictingAlias.id !== id) {
      throw duplicateAliasError();
    }
  }

  try {
    return await prisma.ingredientAlias.update({
      where: { id },
      data: {
        ...(input.alias !== undefined ? { alias: input.alias } : {}),
        ...(input.ingredientId !== undefined
          ? { ingredientId: input.ingredientId }
          : {}),
      },
      select: aliasSelect,
    });
  } catch (error) {
    if (isAliasConflict(error)) {
      throw duplicateAliasError();
    }

    throw error;
  }
};

export const deleteIngredientAlias = async (id: string): Promise<void> => {
  const existingAlias = await prisma.ingredientAlias.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingAlias) {
    throw aliasNotFoundError();
  }

  await prisma.ingredientAlias.delete({ where: { id } });
};
