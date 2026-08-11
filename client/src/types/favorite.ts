import type { RecipeSummary } from './recipe';

export interface FavoritesResponse {
  data: {
    recipes: RecipeSummary[];
  };
}
