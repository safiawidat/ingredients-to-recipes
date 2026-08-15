import type { SeedIngredientCategory } from './seed-data.js';

export const controlledCuisineCounts = {
  'Mediterranean-inspired': 90,
  'Home-style': 85,
  General: 70,
  'Italian-inspired': 65,
  'Asian-inspired': 60,
  'Middle Eastern-inspired': 55,
  'Mexican-inspired': 45,
} as const;

export const controlledCommonIngredients = [
  'olive oil',
  'garlic',
  'onion',
  'salt',
  'black pepper',
  'tomato',
  'lemon',
  'paprika',
  'cumin',
  'parsley',
] as const;

export const controlledAllergenMap = {
  milk: ['dairy'],
  yogurt: ['dairy'],
  'feta cheese': ['dairy'],
  'mozzarella cheese': ['dairy'],
  'cheddar cheese': ['dairy'],
  egg: ['egg'],
  tuna: ['fish'],
  salmon: ['fish'],
  bread: ['gluten'],
  couscous: ['gluten'],
  pasta: ['gluten'],
  'soy sauce': ['gluten', 'soy'],
  tortilla: ['gluten'],
  'wheat flour': ['gluten'],
  peanut: ['peanut'],
  tahini: ['sesame'],
  tofu: ['soy'],
  almond: ['tree-nut'],
} as const;

export const animalIngredients = [
  'chicken breast',
  'ground beef',
  'tuna',
  'salmon',
  'egg',
  'milk',
  'yogurt',
  'feta cheese',
  'mozzarella cheese',
  'cheddar cheese',
] as const;

export const meatAndFishIngredients = [
  'chicken breast',
  'ground beef',
  'tuna',
  'salmon',
] as const;

export const dairyIngredients = [
  'milk',
  'yogurt',
  'feta cheese',
  'mozzarella cheese',
  'cheddar cheese',
] as const;

export const glutenIngredients = [
  'bread',
  'couscous',
  'pasta',
  'soy sauce',
  'tortilla',
  'wheat flour',
  'oats',
] as const;

export const controlledUnits = [
  'g',
  'cup',
  'tbsp',
  'tsp',
  'whole',
  'clove',
  'leaves',
  'stalk',
] as const;

export interface IngredientMeasure {
  quantity: number | null;
  unit: (typeof controlledUnits)[number] | null;
}

export const ingredientMeasures: Readonly<Record<string, IngredientMeasure>> = {
  'olive oil': { quantity: 1, unit: 'tbsp' },
  garlic: { quantity: 2, unit: 'clove' },
  onion: { quantity: 1, unit: 'whole' },
  salt: { quantity: null, unit: null },
  'black pepper': { quantity: null, unit: null },
  lemon: { quantity: 1, unit: 'whole' },
  'tomato paste': { quantity: 1, unit: 'tbsp' },
  cumin: { quantity: 1, unit: 'tsp' },
  paprika: { quantity: 1, unit: 'tsp' },
  parsley: { quantity: 2, unit: 'tbsp' },
  cilantro: { quantity: 2, unit: 'tbsp' },
  basil: { quantity: 8, unit: 'leaves' },
  tahini: { quantity: 2, unit: 'tbsp' },
  'soy sauce': { quantity: 2, unit: 'tbsp' },
  'vegetable broth': { quantity: 4, unit: 'cup' },
  lime: { quantity: 1, unit: 'whole' },
  'chicken breast': { quantity: 400, unit: 'g' },
  egg: { quantity: 3, unit: 'whole' },
  chickpea: { quantity: 1, unit: 'cup' },
  'brown lentil': { quantity: 1, unit: 'cup' },
  'black bean': { quantity: 1, unit: 'cup' },
  tuna: { quantity: 200, unit: 'g' },
  tofu: { quantity: 300, unit: 'g' },
  salmon: { quantity: 350, unit: 'g' },
  'ground beef': { quantity: 400, unit: 'g' },
  'red kidney bean': { quantity: 1, unit: 'cup' },
  peanut: { quantity: 2, unit: 'tbsp' },
  almond: { quantity: 2, unit: 'tbsp' },
  tomato: { quantity: 2, unit: 'whole' },
  potato: { quantity: 3, unit: 'whole' },
  carrot: { quantity: 2, unit: 'whole' },
  cucumber: { quantity: 2, unit: 'whole' },
  'bell pepper': { quantity: 1, unit: 'whole' },
  zucchini: { quantity: 2, unit: 'whole' },
  spinach: { quantity: 2, unit: 'cup' },
  mushroom: { quantity: 2, unit: 'cup' },
  broccoli: { quantity: 2, unit: 'cup' },
  cauliflower: { quantity: 2, unit: 'cup' },
  eggplant: { quantity: 1, unit: 'whole' },
  'green onion': { quantity: 2, unit: 'whole' },
  corn: { quantity: 1, unit: 'cup' },
  'green pea': { quantity: 1, unit: 'cup' },
  'sweet potato': { quantity: 2, unit: 'whole' },
  avocado: { quantity: 1, unit: 'whole' },
  cabbage: { quantity: 2, unit: 'cup' },
  celery: { quantity: 2, unit: 'stalk' },
  rice: { quantity: 2, unit: 'cup' },
  pasta: { quantity: 250, unit: 'g' },
  couscous: { quantity: 1, unit: 'cup' },
  bread: { quantity: 4, unit: 'whole' },
  oats: { quantity: 1, unit: 'cup' },
  quinoa: { quantity: 1, unit: 'cup' },
  'wheat flour': { quantity: 1, unit: 'cup' },
  tortilla: { quantity: 4, unit: 'whole' },
  milk: { quantity: 1, unit: 'cup' },
  yogurt: { quantity: 1, unit: 'cup' },
  'feta cheese': { quantity: 100, unit: 'g' },
  'mozzarella cheese': { quantity: 100, unit: 'g' },
  'cheddar cheese': { quantity: 100, unit: 'g' },
  'coconut milk': { quantity: 1, unit: 'cup' },
};

export interface CountDistribution {
  simple: number;
  medium: number;
  complex: number;
}

export interface ServingDistribution {
  1: number;
  2: number;
  4: number;
  6: number;
}

export interface ControlledRecipeFamily {
  key: string;
  label: string;
  count: number;
  complexity: CountDistribution;
  servings: ServingDistribution;
  cuisines: Readonly<Record<keyof typeof controlledCuisineCounts, number>>;
  baseIngredients: readonly string[];
  rotatingBasePool?: readonly string[];
  commonPool?: readonly string[];
  primaryPool: readonly string[];
  supportingPool: readonly string[];
  forms: readonly string[];
  titleStyles: readonly string[];
  instruction: (featured: readonly string[]) => string;
  preparationTimes: readonly number[];
}

const instructions = {
  pasta: (featured: readonly string[]) =>
    `Cook the pasta until tender. Prepare ${featured.join(' and ')}, then combine everything and season evenly.`,
  rice: (featured: readonly string[]) =>
    `Cook the rice and prepare ${featured.join(' and ')}. Fold everything together and warm until evenly combined.`,
  grain: (featured: readonly string[]) =>
    `Cook the grain until tender. Arrange it with ${featured.join(' and ')}, then toss gently before serving.`,
  salad: (featured: readonly string[]) =>
    `Prepare ${featured.join(' and ')}. Toss the ingredients together until evenly dressed, then serve fresh.`,
  soup: (featured: readonly string[]) =>
    `Prepare ${featured.join(' and ')}. Simmer the ingredients until tender and the flavors are well combined.`,
  wrap: (featured: readonly string[]) =>
    `Prepare ${featured.join(' and ')}. Fill the prepared base, fold securely, and serve.`,
  egg: (featured: readonly string[]) =>
    `Prepare ${featured.join(' and ')} in a warm pan. Add the eggs and cook gently until set.`,
  oats: (featured: readonly string[]) =>
    `Cook the oats until creamy. Fold in ${featured.join(' and ')} and serve warm.`,
  potato: (featured: readonly string[]) =>
    `Prepare ${featured.join(' and ')} with the potatoes. Cook until the potatoes are tender and evenly seasoned.`,
  skillet: (featured: readonly string[]) =>
    `Prepare ${featured.join(' and ')} in a wide pan. Cook until tender and evenly seasoned, then serve warm.`,
  fish: (featured: readonly string[]) =>
    `Prepare ${featured.join(' and ')}. Cook the fish until done and serve it with the seasoned vegetables.`,
  tray: (featured: readonly string[]) =>
    `Arrange ${featured.join(' and ')} with the remaining ingredients. Cook until tender and lightly browned.`,
};

const allVegetables = [
  'tomato',
  'potato',
  'carrot',
  'cucumber',
  'bell pepper',
  'zucchini',
  'spinach',
  'mushroom',
  'broccoli',
  'cauliflower',
  'eggplant',
  'green onion',
  'corn',
  'green pea',
  'sweet potato',
  'avocado',
  'cabbage',
  'celery',
] as const;

const legumes = [
  'chickpea',
  'brown lentil',
  'black bean',
  'red kidney bean',
] as const;

const cheeses = [
  'feta cheese',
  'mozzarella cheese',
  'cheddar cheese',
] as const;

export const controlledRecipeFamilies: readonly ControlledRecipeFamily[] = [
  {
    key: 'pasta',
    label: 'Pasta dishes',
    count: 36,
    complexity: { simple: 4, medium: 26, complex: 6 },
    servings: { 1: 0, 2: 12, 4: 24, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 6, 'Home-style': 4, General: 3, 'Italian-inspired': 22, 'Asian-inspired': 0, 'Middle Eastern-inspired': 1, 'Mexican-inspired': 0 },
    baseIngredients: ['pasta'],
    primaryPool: ['tomato', 'spinach', 'mushroom', 'zucchini', 'broccoli', 'eggplant'],
    supportingPool: [
      'basil', 'tomato paste', 'chicken breast', 'tuna', 'tofu',
      ...cheeses, 'milk', 'wheat flour', 'bell pepper', 'green pea',
      'vegetable broth', 'cilantro', 'olive oil', 'garlic', 'onion',
    ],
    forms: ['Pasta', 'Pasta Skillet', 'Pasta Bowl', 'Pasta Bake'],
    titleStyles: ['Herbed', 'Garden', 'Savory', 'Rustic', 'Bright', 'Roasted'],
    instruction: instructions.pasta,
    preparationTimes: [20, 25, 30, 35, 40, 45],
  },
  {
    key: 'rice',
    label: 'Rice dishes',
    count: 42,
    complexity: { simple: 5, medium: 29, complex: 8 },
    servings: { 1: 0, 2: 12, 4: 30, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 4, 'Home-style': 5, General: 4, 'Italian-inspired': 0, 'Asian-inspired': 16, 'Middle Eastern-inspired': 7, 'Mexican-inspired': 6 },
    baseIngredients: ['rice'],
    primaryPool: ['chicken breast', 'tofu', 'chickpea', 'black bean', 'egg', 'broccoli', 'salmon'],
    supportingPool: [
      ...allVegetables, 'soy sauce', 'coconut milk', 'lime', 'cilantro',
      'peanut', 'egg', 'tuna', 'red kidney bean',
    ],
    forms: ['Rice Bowl', 'Rice Skillet', 'Rice Plate', 'Rice Pan'],
    titleStyles: ['Colorful', 'Savory', 'Zesty', 'Garden', 'Warm', 'Spiced'],
    instruction: instructions.rice,
    preparationTimes: [20, 25, 30, 35, 40, 45],
  },
  {
    key: 'grain-bowls',
    label: 'Quinoa and couscous bowls',
    count: 30,
    complexity: { simple: 5, medium: 20, complex: 5 },
    servings: { 1: 0, 2: 16, 4: 14, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 10, 'Home-style': 3, General: 4, 'Italian-inspired': 0, 'Asian-inspired': 2, 'Middle Eastern-inspired': 9, 'Mexican-inspired': 2 },
    baseIngredients: [],
    primaryPool: ['quinoa', 'couscous'],
    supportingPool: [
      'chickpea', 'brown lentil', 'cucumber', 'tomato', 'bell pepper',
      'zucchini', 'spinach', 'eggplant', 'corn', 'avocado', 'feta cheese',
      'tahini', 'yogurt', 'cilantro', 'basil', 'almond', 'green onion',
    ],
    forms: ['Grain Bowl', 'Garden Bowl', 'Grain Plate'],
    titleStyles: ['Herbed', 'Mediterranean', 'Bright', 'Harvest', 'Fresh'],
    instruction: instructions.grain,
    preparationTimes: [20, 25, 30, 35, 40, 45],
  },
  {
    key: 'salads',
    label: 'Salads',
    count: 38,
    complexity: { simple: 12, medium: 22, complex: 4 },
    servings: { 1: 0, 2: 24, 4: 14, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 10, 'Home-style': 5, General: 6, 'Italian-inspired': 5, 'Asian-inspired': 2, 'Middle Eastern-inspired': 6, 'Mexican-inspired': 4 },
    baseIngredients: [],
    primaryPool: ['cucumber', 'cabbage', 'spinach', 'tomato', 'broccoli', 'chickpea'],
    supportingPool: [
      ...allVegetables, ...legumes, 'tuna', 'egg', 'quinoa',
      'couscous', 'bread', 'tahini', 'almond', 'peanut',
      'basil', 'cilantro', 'lime',
    ],
    forms: ['Salad', 'Chopped Salad', 'Garden Salad'],
    titleStyles: ['Crisp', 'Fresh', 'Herbed', 'Bright', 'Colorful', 'Zesty'],
    instruction: instructions.salad,
    preparationTimes: [10, 15, 20, 25],
  },
  {
    key: 'soups-stews',
    label: 'Soups and stews',
    count: 38,
    complexity: { simple: 4, medium: 26, complex: 8 },
    servings: { 1: 0, 2: 0, 4: 18, 6: 20 },
    cuisines: { 'Mediterranean-inspired': 7, 'Home-style': 10, General: 7, 'Italian-inspired': 7, 'Asian-inspired': 3, 'Middle Eastern-inspired': 3, 'Mexican-inspired': 1 },
    baseIngredients: ['vegetable broth'],
    primaryPool: ['brown lentil', 'chickpea', 'potato', 'tomato', 'chicken breast', 'red kidney bean'],
    supportingPool: [
      ...allVegetables, ...legumes, 'chicken breast', 'tofu',
      'coconut milk', 'rice', 'pasta', 'tomato paste',
      'basil', 'cilantro',
    ],
    forms: ['Soup', 'Stew', 'Broth Bowl'],
    titleStyles: ['Hearty', 'Rustic', 'Comforting', 'Garden', 'Spiced', 'Creamy'],
    instruction: instructions.soup,
    preparationTimes: [35, 40, 45, 50, 55, 60, 65, 70, 75],
  },
  {
    key: 'wraps-sandwiches',
    label: 'Wraps and sandwiches',
    count: 28,
    complexity: { simple: 8, medium: 18, complex: 2 },
    servings: { 1: 0, 2: 20, 4: 8, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 4, 'Home-style': 3, General: 3, 'Italian-inspired': 4, 'Asian-inspired': 2, 'Middle Eastern-inspired': 5, 'Mexican-inspired': 7 },
    baseIngredients: [],
    rotatingBasePool: ['tortilla', 'bread'],
    primaryPool: ['chicken breast', 'tuna', 'egg', 'chickpea', 'black bean', 'tofu', 'ground beef'],
    supportingPool: [
      'cucumber', 'tomato', 'spinach', 'cabbage', 'avocado',
      ...cheeses, 'yogurt', 'tahini', 'cilantro', 'lime', 'bell pepper',
    ],
    forms: ['Wrap', 'Sandwich', 'Filled Flatbread'],
    titleStyles: ['Fresh', 'Toasted', 'Garden', 'Savory', 'Zesty', 'Hearty'],
    instruction: instructions.wrap,
    preparationTimes: [10, 15, 20, 25],
  },
  {
    key: 'eggs-breakfast',
    label: 'Egg and savory breakfast dishes',
    count: 24,
    complexity: { simple: 7, medium: 15, complex: 2 },
    servings: { 1: 6, 2: 14, 4: 4, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 4, 'Home-style': 8, General: 5, 'Italian-inspired': 1, 'Asian-inspired': 2, 'Middle Eastern-inspired': 4, 'Mexican-inspired': 0 },
    baseIngredients: ['egg'],
    primaryPool: ['spinach', 'mushroom', 'tomato', 'potato', 'broccoli', 'bell pepper'],
    supportingPool: [
      ...allVegetables, ...cheeses, 'milk', 'yogurt', 'bread', 'tortilla',
      'black bean', 'chickpea', 'basil', 'cilantro',
    ],
    forms: ['Egg Skillet', 'Breakfast Pan', 'Savory Eggs'],
    titleStyles: ['Morning', 'Garden', 'Herbed', 'Hearty', 'Colorful', 'Warm'],
    instruction: instructions.egg,
    preparationTimes: [10, 15, 20, 25],
  },
  {
    key: 'oats-breakfast',
    label: 'Oat and breakfast bowls',
    count: 18,
    complexity: { simple: 8, medium: 9, complex: 1 },
    servings: { 1: 18, 2: 0, 4: 0, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 2, 'Home-style': 8, General: 6, 'Italian-inspired': 1, 'Asian-inspired': 1, 'Middle Eastern-inspired': 0, 'Mexican-inspired': 0 },
    baseIngredients: ['oats'],
    commonPool: ['salt', 'black pepper', 'lemon'],
    primaryPool: ['milk', 'coconut milk', 'yogurt', 'peanut', 'almond'],
    supportingPool: [
      'milk', 'coconut milk', 'yogurt', 'peanut', 'almond', 'tahini',
      'carrot', 'sweet potato', 'wheat flour', 'egg', 'lime', 'lemon',
    ],
    forms: ['Oat Bowl', 'Warm Oats', 'Breakfast Oats'],
    titleStyles: ['Creamy', 'Toasted', 'Comforting', 'Bright', 'Nutty', 'Warm'],
    instruction: instructions.oats,
    preparationTimes: [10, 15, 20, 25],
  },
  {
    key: 'potatoes',
    label: 'Potato and sweet-potato dishes',
    count: 34,
    complexity: { simple: 6, medium: 24, complex: 4 },
    servings: { 1: 0, 2: 16, 4: 18, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 8, 'Home-style': 12, General: 6, 'Italian-inspired': 2, 'Asian-inspired': 1, 'Middle Eastern-inspired': 3, 'Mexican-inspired': 2 },
    baseIngredients: [],
    primaryPool: ['potato', 'sweet potato'],
    supportingPool: [
      ...allVegetables, 'egg', 'chicken breast', 'ground beef', 'tuna',
      ...legumes, 'wheat flour',
      'basil', 'cilantro',
    ],
    forms: ['Potato Pan', 'Potato Plate', 'Potato Bake', 'Roasted Potatoes'],
    titleStyles: ['Golden', 'Herbed', 'Rustic', 'Savory', 'Garden', 'Spiced'],
    instruction: instructions.potato,
    preparationTimes: [35, 40, 45, 50, 55, 60, 65],
  },
  {
    key: 'chicken',
    label: 'Chicken dishes',
    count: 38,
    complexity: { simple: 4, medium: 28, complex: 6 },
    servings: { 1: 0, 2: 6, 4: 26, 6: 6 },
    cuisines: { 'Mediterranean-inspired': 7, 'Home-style': 7, General: 4, 'Italian-inspired': 7, 'Asian-inspired': 6, 'Middle Eastern-inspired': 3, 'Mexican-inspired': 4 },
    baseIngredients: ['chicken breast'],
    primaryPool: ['rice', 'potato', 'broccoli', 'bell pepper', 'spinach', 'tomato'],
    supportingPool: [
      ...allVegetables, 'rice', 'quinoa', 'couscous', 'pasta', 'tortilla',
      'soy sauce', 'vegetable broth',
      'tomato paste', 'basil', 'cilantro', 'lime',
    ],
    forms: ['Chicken Skillet', 'Chicken Plate', 'Chicken Tray', 'Chicken Bowl'],
    titleStyles: ['Herbed', 'Roasted', 'Savory', 'Garden', 'Spiced', 'Zesty'],
    instruction: instructions.skillet,
    preparationTimes: [35, 40, 45, 50, 55, 60, 65, 70],
  },
  {
    key: 'beef',
    label: 'Beef dishes',
    count: 24,
    complexity: { simple: 3, medium: 18, complex: 3 },
    servings: { 1: 0, 2: 4, 4: 20, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 2, 'Home-style': 5, General: 3, 'Italian-inspired': 4, 'Asian-inspired': 1, 'Middle Eastern-inspired': 4, 'Mexican-inspired': 5 },
    baseIngredients: ['ground beef'],
    primaryPool: ['potato', 'rice', 'black bean', 'cabbage', 'bell pepper', 'pasta'],
    supportingPool: [
      ...allVegetables, ...legumes, 'rice', 'pasta', 'tortilla', 'bread',
      'tomato paste', 'vegetable broth', 'cilantro',
    ],
    forms: ['Beef Skillet', 'Beef Plate', 'Beef Pan', 'Beef Bake'],
    titleStyles: ['Hearty', 'Rustic', 'Savory', 'Spiced', 'Garden', 'Roasted'],
    instruction: instructions.skillet,
    preparationTimes: [35, 40, 45, 50, 55, 60, 65, 70],
  },
  {
    key: 'fish',
    label: 'Fish dishes',
    count: 24,
    complexity: { simple: 4, medium: 17, complex: 3 },
    servings: { 1: 0, 2: 12, 4: 12, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 7, 'Home-style': 3, General: 3, 'Italian-inspired': 2, 'Asian-inspired': 6, 'Middle Eastern-inspired': 2, 'Mexican-inspired': 1 },
    baseIngredients: [],
    primaryPool: ['salmon', 'tuna'],
    supportingPool: [
      ...allVegetables, 'potato', 'rice', 'quinoa', 'couscous', 'pasta',
      'bread', 'basil', 'cilantro', 'lime',
    ],
    forms: ['Fish Plate', 'Fish Bowl', 'Fish Tray', 'Fish Salad'],
    titleStyles: ['Lemony', 'Herbed', 'Roasted', 'Fresh', 'Garden', 'Savory'],
    instruction: instructions.fish,
    preparationTimes: [35, 40, 45, 50, 55, 60],
  },
  {
    key: 'tofu',
    label: 'Tofu dishes',
    count: 30,
    complexity: { simple: 4, medium: 21, complex: 5 },
    servings: { 1: 0, 2: 10, 4: 20, 6: 0 },
    cuisines: { 'Mediterranean-inspired': 3, 'Home-style': 3, General: 3, 'Italian-inspired': 1, 'Asian-inspired': 14, 'Middle Eastern-inspired': 2, 'Mexican-inspired': 4 },
    baseIngredients: ['tofu'],
    primaryPool: ['rice', 'broccoli', 'mushroom', 'cabbage', 'bell pepper', 'spinach'],
    supportingPool: [
      ...allVegetables, 'rice', 'quinoa', 'couscous', 'pasta', 'tortilla',
      'soy sauce', 'coconut milk', 'peanut', 'almond',
      'vegetable broth', 'cilantro', 'lime',
    ],
    forms: ['Tofu Skillet', 'Tofu Bowl', 'Tofu Plate', 'Tofu Pan'],
    titleStyles: ['Crisp', 'Savory', 'Garden', 'Spiced', 'Colorful', 'Warm'],
    instruction: instructions.skillet,
    preparationTimes: [20, 25, 30, 35, 40, 45],
  },
  {
    key: 'beans-lentils',
    label: 'Bean and lentil dishes',
    count: 34,
    complexity: { simple: 6, medium: 23, complex: 5 },
    servings: { 1: 0, 2: 10, 4: 20, 6: 4 },
    cuisines: { 'Mediterranean-inspired': 7, 'Home-style': 4, General: 5, 'Italian-inspired': 2, 'Asian-inspired': 2, 'Middle Eastern-inspired': 5, 'Mexican-inspired': 9 },
    baseIngredients: [],
    primaryPool: legumes,
    supportingPool: [
      ...allVegetables, 'rice', 'quinoa', 'couscous', 'pasta', 'tortilla',
      'bread', 'vegetable broth',
      'tahini', 'cilantro', 'lime', 'tomato paste',
    ],
    forms: ['Bean Bowl', 'Legume Skillet', 'Bean Plate', 'Lentil Pan'],
    titleStyles: ['Hearty', 'Herbed', 'Spiced', 'Garden', 'Rustic', 'Bright'],
    instruction: instructions.skillet,
    preparationTimes: [25, 30, 35, 40, 45, 50, 55, 60],
  },
  {
    key: 'vegetables',
    label: 'Vegetable trays, bakes, and sides',
    count: 32,
    complexity: { simple: 14, medium: 10, complex: 8 },
    servings: { 1: 0, 2: 8, 4: 14, 6: 10 },
    cuisines: { 'Mediterranean-inspired': 9, 'Home-style': 5, General: 8, 'Italian-inspired': 7, 'Asian-inspired': 2, 'Middle Eastern-inspired': 1, 'Mexican-inspired': 0 },
    baseIngredients: [],
    primaryPool: ['broccoli', 'cauliflower', 'eggplant', 'zucchini', 'cabbage', 'mushroom'],
    supportingPool: [
      ...allVegetables, ...legumes, 'potato', 'sweet potato', 'quinoa',
      'couscous', 'wheat flour', ...cheeses,
      'almond', 'vegetable broth', 'basil', 'cilantro',
    ],
    forms: ['Vegetable Tray', 'Vegetable Bake', 'Garden Side', 'Roasted Vegetables'],
    titleStyles: ['Roasted', 'Golden', 'Herbed', 'Garden', 'Rustic', 'Colorful'],
    instruction: instructions.tray,
    preparationTimes: [35, 40, 45, 50, 55, 60, 65, 70, 75],
  },
] as const;

const primaryCategories = new Set([
  'chicken breast', 'egg', 'chickpea', 'brown lentil', 'black bean', 'tuna',
  'tofu', 'salmon', 'ground beef', 'red kidney bean', 'peanut', 'almond',
  'potato', 'sweet potato', 'rice', 'pasta', 'couscous', 'bread', 'oats',
  'quinoa', 'wheat flour', 'tortilla',
]);

const otherCategories = new Set([
  'olive oil', 'garlic', 'salt', 'black pepper', 'lemon', 'tomato paste',
  'cumin', 'paprika', 'parsley', 'cilantro', 'basil', 'tahini', 'soy sauce',
  'lime',
]);

export const categoryForIngredient = (
  ingredient: string,
  centralIngredients: ReadonlySet<string>,
): SeedIngredientCategory => {
  if (centralIngredients.has(ingredient) || primaryCategories.has(ingredient)) {
    return 'MAIN';
  }

  if (otherCategories.has(ingredient)) {
    return 'OTHER';
  }

  return 'SIDE';
};
