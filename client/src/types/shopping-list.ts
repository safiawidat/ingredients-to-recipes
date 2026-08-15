export interface ShoppingListItem {
  id: string;
  name: string;
}

export interface ShoppingListRouteState {
  items: ShoppingListItem[];
  recipe: {
    id: string;
    name: string;
  };
}
