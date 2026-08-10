export interface CanonicalIngredientReference {
  id: string;
  name: string;
}

export interface CanonicalIngredientListResponse {
  data: {
    ingredients: CanonicalIngredientReference[];
  };
}

export interface IngredientAlias {
  id: string;
  alias: string;
  ingredientId: string;
  createdAt: string;
  ingredient: CanonicalIngredientReference;
}

export interface IngredientAliasListResponse {
  data: {
    aliases: IngredientAlias[];
  };
}

export interface IngredientAliasResponse {
  data: {
    alias: IngredientAlias;
  };
}

export interface CreateIngredientAliasInput {
  alias: string;
  ingredientId: string;
}

export type UpdateIngredientAliasInput =
  | { alias: string; ingredientId?: string }
  | { alias?: string; ingredientId: string };
