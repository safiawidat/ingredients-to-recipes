import { normalizeIngredientInputs } from '../src/app/utils/ingredient-normalization.js';

export const seedIngredientCategories = ['MAIN', 'SIDE', 'OTHER'] as const;
export const seedDietTags = [
  'dairy-free',
  'gluten-free',
  'high-protein',
  'vegan',
  'vegetarian',
] as const;
export const seedAllergens = [
  'dairy',
  'egg',
  'fish',
  'gluten',
  'peanut',
  'sesame',
  'soy',
  'tree-nut',
] as const;

export type SeedIngredientCategory =
  (typeof seedIngredientCategories)[number];
export type SeedDietTag = (typeof seedDietTags)[number];
export type SeedAllergen = (typeof seedAllergens)[number];

export interface SeedAlias {
  alias: string;
  ingredient: string;
}

export interface SeedRecipeIngredient {
  ingredient: string;
  quantity: number | null;
  unit: string | null;
  category: SeedIngredientCategory;
}

export interface SeedRecipe {
  id: string;
  name: string;
  description: string;
  instructions: string;
  cuisine: string;
  preparationTime: number;
  servings: number;
  imageUrl: null;
  sourceUrl: null;
  dietTags: SeedDietTag[];
  allergens: SeedAllergen[];
  isPublished: boolean;
  ingredients: SeedRecipeIngredient[];
}

export interface SeedManifest {
  ingredients: readonly string[];
  aliases: readonly SeedAlias[];
  recipes: readonly SeedRecipe[];
}

export const seedIngredients = [
  // Pantry, aromatics, herbs, and seasonings (16)
  'olive oil',
  'garlic',
  'onion',
  'salt',
  'black pepper',
  'lemon',
  'tomato paste',
  'cumin',
  'paprika',
  'parsley',
  'cilantro',
  'basil',
  'tahini',
  'soy sauce',
  'vegetable broth',
  'lime',

  // Proteins and legumes (12)
  'chicken breast',
  'egg',
  'chickpea',
  'brown lentil',
  'black bean',
  'tuna',
  'tofu',
  'salmon',
  'ground beef',
  'red kidney bean',
  'peanut',
  'almond',

  // Vegetables and fruit (18)
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

  // Grains and starches (8)
  'rice',
  'pasta',
  'couscous',
  'bread',
  'oats',
  'quinoa',
  'wheat flour',
  'tortilla',

  // Dairy and non-dairy products (6)
  'milk',
  'yogurt',
  'feta cheese',
  'mozzarella cheese',
  'cheddar cheese',
  'coconut milk',
] as const;

export const seedAliases: readonly SeedAlias[] = [
  { alias: 'tomatoes', ingredient: 'tomato' },
  { alias: 'potatoes', ingredient: 'potato' },
  { alias: 'carrots', ingredient: 'carrot' },
  { alias: 'cucumbers', ingredient: 'cucumber' },
  { alias: 'bell peppers', ingredient: 'bell pepper' },
  { alias: 'courgette', ingredient: 'zucchini' },
  { alias: 'aubergine', ingredient: 'eggplant' },
  { alias: 'scallion', ingredient: 'green onion' },
  { alias: 'spring onion', ingredient: 'green onion' },
  { alias: 'chickpeas', ingredient: 'chickpea' },
  { alias: 'garbanzo bean', ingredient: 'chickpea' },
  { alias: 'lentils', ingredient: 'brown lentil' },
  { alias: 'black beans', ingredient: 'black bean' },
  { alias: 'kidney beans', ingredient: 'red kidney bean' },
  { alias: 'eggs', ingredient: 'egg' },
  { alias: 'chicken', ingredient: 'chicken breast' },
  { alias: 'canned tuna', ingredient: 'tuna' },
  { alias: 'firm tofu', ingredient: 'tofu' },
  { alias: 'salmon fillet', ingredient: 'salmon' },
  { alias: 'minced beef', ingredient: 'ground beef' },
  { alias: 'spaghetti', ingredient: 'pasta' },
  { alias: 'white rice', ingredient: 'rice' },
  { alias: 'rolled oats', ingredient: 'oats' },
  { alias: 'flatbread', ingredient: 'bread' },
  { alias: 'plain flour', ingredient: 'wheat flour' },
  { alias: 'yoghurt', ingredient: 'yogurt' },
  { alias: 'feta', ingredient: 'feta cheese' },
  { alias: 'mozzarella', ingredient: 'mozzarella cheese' },
  { alias: 'cheddar', ingredient: 'cheddar cheese' },
  { alias: 'coriander leaves', ingredient: 'cilantro' },
];

const recipeIngredient = (
  ingredient: string,
  quantity: number | null,
  unit: string | null,
  category: SeedIngredientCategory,
): SeedRecipeIngredient => ({ ingredient, quantity, unit, category });

export const seedRecipes: readonly SeedRecipe[] = [
  // Simple recipes: 6 recipes with 3-4 ingredients.
  {
    id: 'seed-recipe-tomato-basil-pasta',
    name: 'Tomato Basil Pasta',
    description: 'A small pasta dish built around tomato and fresh basil.',
    instructions:
      'Cook the pasta. Warm the tomato with olive oil, fold in the pasta, and finish with basil.',
    cuisine: 'Italian-inspired',
    preparationTime: 20,
    servings: 2,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'vegan'],
    allergens: ['gluten'],
    isPublished: true,
    ingredients: [
      recipeIngredient('pasta', 200, 'g', 'MAIN'),
      recipeIngredient('tomato', 2, 'whole', 'MAIN'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
      recipeIngredient('basil', 6, 'leaves', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-lemon-parsley-couscous',
    name: 'Lemon Parsley Couscous',
    description: 'Quick couscous with bright lemon and parsley.',
    instructions:
      'Prepare the couscous, fluff it with olive oil, then stir through lemon and parsley.',
    cuisine: 'Mediterranean-inspired',
    preparationTime: 15,
    servings: 2,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'vegan'],
    allergens: ['gluten'],
    isPublished: true,
    ingredients: [
      recipeIngredient('couscous', 1, 'cup', 'MAIN'),
      recipeIngredient('lemon', 1, 'whole', 'SIDE'),
      recipeIngredient('parsley', 2, 'tbsp', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-peanut-coconut-oats',
    name: 'Peanut Coconut Oats',
    description: 'Creamy oats with coconut milk and peanuts.',
    instructions:
      'Simmer the oats in coconut milk until tender, then top with chopped peanuts.',
    cuisine: 'General',
    preparationTime: 12,
    servings: 1,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'vegan'],
    allergens: ['peanut'],
    isPublished: true,
    ingredients: [
      recipeIngredient('oats', 0.5, 'cup', 'MAIN'),
      recipeIngredient('coconut milk', 1, 'cup', 'SIDE'),
      recipeIngredient('peanut', 2, 'tbsp', 'MAIN'),
    ],
  },
  {
    id: 'seed-recipe-spinach-mushroom-eggs',
    name: 'Spinach Mushroom Eggs',
    description: 'Soft eggs with sautéed spinach and mushrooms.',
    instructions:
      'Cook the mushrooms in olive oil, wilt in the spinach, then add and gently set the eggs.',
    cuisine: 'Home-style',
    preparationTime: 15,
    servings: 2,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'vegetarian'],
    allergens: ['egg'],
    isPublished: true,
    ingredients: [
      recipeIngredient('egg', 3, 'whole', 'MAIN'),
      recipeIngredient('spinach', 2, 'cup', 'MAIN'),
      recipeIngredient('mushroom', 1, 'cup', 'SIDE'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-cucumber-feta-salad',
    name: 'Cucumber Feta Salad',
    description: 'A crisp cucumber salad with feta and lemon.',
    instructions:
      'Slice the cucumber, crumble over the feta, and dress with lemon and olive oil.',
    cuisine: 'Mediterranean-inspired',
    preparationTime: 10,
    servings: 2,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['gluten-free', 'vegetarian'],
    allergens: ['dairy'],
    isPublished: true,
    ingredients: [
      recipeIngredient('cucumber', 2, 'whole', 'MAIN'),
      recipeIngredient('feta cheese', 100, 'g', 'MAIN'),
      recipeIngredient('lemon', 0.5, 'whole', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-avocado-black-bean-wrap',
    name: 'Avocado Black Bean Wrap',
    description: 'A simple tortilla filled with black beans and avocado.',
    instructions:
      'Warm the tortilla, add the beans and sliced avocado, then finish with lime and fold.',
    cuisine: 'Mexican-inspired',
    preparationTime: 12,
    servings: 1,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'vegan'],
    allergens: ['gluten'],
    isPublished: true,
    ingredients: [
      recipeIngredient('tortilla', 1, 'whole', 'MAIN'),
      recipeIngredient('black bean', 0.75, 'cup', 'MAIN'),
      recipeIngredient('avocado', 0.5, 'whole', 'SIDE'),
      recipeIngredient('lime', 0.5, 'whole', 'OTHER'),
    ],
  },

  // Medium recipes: 18 recipes with 5-8 ingredients.
  {
    id: 'seed-recipe-tomato-lentil-soup',
    name: 'Tomato Lentil Soup',
    description: 'A pantry-friendly lentil soup with tomato and warm spices.',
    instructions:
      'Soften the onion and garlic in olive oil. Add the remaining ingredients and simmer until the lentils are tender.',
    cuisine: 'Mediterranean-inspired',
    preparationTime: 45,
    servings: 4,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'vegan'],
    allergens: [],
    isPublished: true,
    ingredients: [
      recipeIngredient('brown lentil', 1, 'cup', 'MAIN'),
      recipeIngredient('tomato', 3, 'whole', 'MAIN'),
      recipeIngredient('onion', 1, 'whole', 'SIDE'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('tomato paste', 1, 'tbsp', 'OTHER'),
      recipeIngredient('vegetable broth', 4, 'cup', 'SIDE'),
      recipeIngredient('cumin', 1, 'tsp', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-chickpea-rice-bowl',
    name: 'Chickpea Rice Bowl',
    description: 'Rice and chickpeas with crisp vegetables and tahini lemon dressing.',
    instructions:
      'Divide cooked rice and chickpeas between bowls. Add the vegetables and parsley, then spoon over tahini mixed with lemon.',
    cuisine: 'Middle Eastern-inspired',
    preparationTime: 25,
    servings: 2,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'vegan'],
    allergens: ['sesame'],
    isPublished: true,
    ingredients: [
      recipeIngredient('rice', 2, 'cup', 'MAIN'),
      recipeIngredient('chickpea', 1, 'cup', 'MAIN'),
      recipeIngredient('cucumber', 1, 'whole', 'SIDE'),
      recipeIngredient('tomato', 1, 'whole', 'SIDE'),
      recipeIngredient('lemon', 0.5, 'whole', 'OTHER'),
      recipeIngredient('tahini', 2, 'tbsp', 'OTHER'),
      recipeIngredient('parsley', 2, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-herbed-chickpea-salad',
    name: 'Herbed Chickpea Salad',
    description: 'Chickpeas and fresh vegetables in a lemon herb dressing.',
    instructions:
      'Combine the chickpeas, chopped cucumber, and tomato. Toss with parsley, lemon, and olive oil.',
    cuisine: 'Mediterranean-inspired',
    preparationTime: 15,
    servings: 3,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'vegan'],
    allergens: [],
    isPublished: true,
    ingredients: [
      recipeIngredient('chickpea', 2, 'cup', 'MAIN'),
      recipeIngredient('cucumber', 1, 'whole', 'MAIN'),
      recipeIngredient('tomato', 2, 'whole', 'MAIN'),
      recipeIngredient('parsley', 3, 'tbsp', 'OTHER'),
      recipeIngredient('lemon', 1, 'whole', 'OTHER'),
      recipeIngredient('olive oil', 2, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-warm-chickpea-spinach',
    name: 'Warm Chickpea Spinach',
    description: 'A quick skillet of chickpeas, spinach, and paprika.',
    instructions:
      'Soften the onion and garlic in olive oil. Add chickpeas and paprika, then fold in spinach until wilted.',
    cuisine: 'General',
    preparationTime: 20,
    servings: 2,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'vegan'],
    allergens: [],
    isPublished: true,
    ingredients: [
      recipeIngredient('chickpea', 2, 'cup', 'MAIN'),
      recipeIngredient('spinach', 3, 'cup', 'MAIN'),
      recipeIngredient('onion', 1, 'whole', 'SIDE'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('paprika', 1, 'tsp', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-chicken-rice-skillet',
    name: 'Chicken Rice Skillet',
    description: 'Chicken, rice, and peppers cooked as a practical one-pan meal.',
    instructions:
      'Brown the chicken in olive oil. Add onion, pepper, garlic, paprika, and cooked rice, then heat through.',
    cuisine: 'Home-style',
    preparationTime: 35,
    servings: 4,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'high-protein'],
    allergens: [],
    isPublished: true,
    ingredients: [
      recipeIngredient('chicken breast', 500, 'g', 'MAIN'),
      recipeIngredient('rice', 3, 'cup', 'MAIN'),
      recipeIngredient('bell pepper', 1, 'whole', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'SIDE'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
      recipeIngredient('paprika', 1, 'tsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-tofu-rice-skillet',
    name: 'Tofu Rice Skillet',
    description: 'A tofu variation of the rice and pepper skillet.',
    instructions:
      'Brown the tofu in olive oil. Add onion, pepper, garlic, soy sauce, and cooked rice, then toss until hot.',
    cuisine: 'Asian-inspired',
    preparationTime: 30,
    servings: 4,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'high-protein', 'vegan'],
    allergens: ['gluten', 'soy'],
    isPublished: true,
    ingredients: [
      recipeIngredient('tofu', 400, 'g', 'MAIN'),
      recipeIngredient('rice', 3, 'cup', 'MAIN'),
      recipeIngredient('bell pepper', 1, 'whole', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'SIDE'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('soy sauce', 2, 'tbsp', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-black-bean-rice-bowl',
    name: 'Black Bean Rice Bowl',
    description: 'A rice bowl with black beans, corn, tomato, and avocado.',
    instructions:
      'Layer rice, black beans, corn, tomato, and avocado in bowls. Finish with lime and cumin.',
    cuisine: 'Mexican-inspired',
    preparationTime: 25,
    servings: 2,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'vegan'],
    allergens: [],
    isPublished: true,
    ingredients: [
      recipeIngredient('black bean', 1, 'cup', 'MAIN'),
      recipeIngredient('rice', 2, 'cup', 'MAIN'),
      recipeIngredient('corn', 1, 'cup', 'SIDE'),
      recipeIngredient('tomato', 1, 'whole', 'SIDE'),
      recipeIngredient('avocado', 1, 'whole', 'SIDE'),
      recipeIngredient('lime', 1, 'whole', 'OTHER'),
      recipeIngredient('cumin', 0.5, 'tsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-vegetable-rice-pan',
    name: 'Vegetable Rice Pan',
    description: 'Rice with broccoli, carrots, peas, and a light soy seasoning.',
    instructions:
      'Cook the vegetables with onion and garlic. Add rice and soy sauce, then stir until evenly heated.',
    cuisine: 'Asian-inspired',
    preparationTime: 25,
    servings: 3,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'vegan'],
    allergens: ['gluten', 'soy'],
    isPublished: true,
    ingredients: [
      recipeIngredient('rice', 3, 'cup', 'MAIN'),
      recipeIngredient('broccoli', 2, 'cup', 'MAIN'),
      recipeIngredient('carrot', 1, 'whole', 'SIDE'),
      recipeIngredient('green pea', 1, 'cup', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'OTHER'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('soy sauce', 2, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-potato-carrot-soup',
    name: 'Potato Carrot Soup',
    description: 'A smooth vegetable soup based on potato and carrot.',
    instructions:
      'Soften the onion, celery, and garlic in olive oil. Add potato, carrot, and broth, simmer until tender, then blend.',
    cuisine: 'Home-style',
    preparationTime: 40,
    servings: 4,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'vegan'],
    allergens: [],
    isPublished: true,
    ingredients: [
      recipeIngredient('potato', 3, 'whole', 'MAIN'),
      recipeIngredient('carrot', 2, 'whole', 'MAIN'),
      recipeIngredient('celery', 2, 'stalk', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'SIDE'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('vegetable broth', 4, 'cup', 'SIDE'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-chicken-potato-tray',
    name: 'Chicken Potato Tray',
    description: 'A roasted tray of chicken, potatoes, and colorful vegetables.',
    instructions:
      'Arrange everything on a tray, coat with olive oil and paprika, and roast until the chicken and vegetables are cooked.',
    cuisine: 'Home-style',
    preparationTime: 55,
    servings: 4,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'high-protein'],
    allergens: [],
    isPublished: true,
    ingredients: [
      recipeIngredient('chicken breast', 600, 'g', 'MAIN'),
      recipeIngredient('potato', 4, 'whole', 'MAIN'),
      recipeIngredient('carrot', 2, 'whole', 'SIDE'),
      recipeIngredient('bell pepper', 1, 'whole', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'SIDE'),
      recipeIngredient('olive oil', 2, 'tbsp', 'OTHER'),
      recipeIngredient('paprika', 1, 'tsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-potato-egg-salad',
    name: 'Potato Egg Salad',
    description: 'Potatoes and eggs in a light yogurt and lemon dressing.',
    instructions:
      'Boil and cool the potatoes and eggs. Fold them with green onion, yogurt, lemon, salt, and pepper.',
    cuisine: 'General',
    preparationTime: 35,
    servings: 4,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['gluten-free', 'vegetarian'],
    allergens: ['dairy', 'egg'],
    isPublished: true,
    ingredients: [
      recipeIngredient('potato', 4, 'whole', 'MAIN'),
      recipeIngredient('egg', 3, 'whole', 'MAIN'),
      recipeIngredient('green onion', 2, 'whole', 'SIDE'),
      recipeIngredient('yogurt', 0.5, 'cup', 'SIDE'),
      recipeIngredient('lemon', 0.5, 'whole', 'OTHER'),
      recipeIngredient('black pepper', null, null, 'OTHER'),
      recipeIngredient('salt', null, null, 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-salmon-potato-plate',
    name: 'Salmon Potato Plate',
    description: 'Roasted salmon with potatoes and broccoli.',
    instructions:
      'Roast the potatoes first, then add the salmon and broccoli with lemon, garlic, and olive oil until cooked.',
    cuisine: 'General',
    preparationTime: 45,
    servings: 2,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'high-protein'],
    allergens: ['fish'],
    isPublished: true,
    ingredients: [
      recipeIngredient('salmon', 300, 'g', 'MAIN'),
      recipeIngredient('potato', 3, 'whole', 'MAIN'),
      recipeIngredient('broccoli', 2, 'cup', 'SIDE'),
      recipeIngredient('lemon', 1, 'whole', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-tomato-egg-skillet',
    name: 'Tomato Egg Skillet',
    description: 'Eggs gently cooked in a tomato, onion, and paprika base.',
    instructions:
      'Soften onion and garlic in olive oil, add tomato and paprika, then add the eggs and cook until set.',
    cuisine: 'Middle Eastern-inspired',
    preparationTime: 25,
    servings: 2,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'vegetarian'],
    allergens: ['egg'],
    isPublished: true,
    ingredients: [
      recipeIngredient('egg', 4, 'whole', 'MAIN'),
      recipeIngredient('tomato', 3, 'whole', 'MAIN'),
      recipeIngredient('onion', 1, 'whole', 'SIDE'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
      recipeIngredient('paprika', 1, 'tsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-mushroom-spinach-pasta',
    name: 'Mushroom Spinach Pasta',
    description: 'Pasta with mushrooms, spinach, garlic, and mozzarella.',
    instructions:
      'Cook the pasta. Sauté mushrooms and garlic, wilt in spinach, then combine with pasta and mozzarella.',
    cuisine: 'Italian-inspired',
    preparationTime: 30,
    servings: 3,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['vegetarian'],
    allergens: ['dairy', 'gluten'],
    isPublished: true,
    ingredients: [
      recipeIngredient('pasta', 300, 'g', 'MAIN'),
      recipeIngredient('mushroom', 2, 'cup', 'MAIN'),
      recipeIngredient('spinach', 2, 'cup', 'SIDE'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
      recipeIngredient('mozzarella cheese', 100, 'g', 'SIDE'),
    ],
  },
  {
    id: 'seed-recipe-zucchini-tomato-pasta',
    name: 'Zucchini Tomato Pasta',
    description: 'A tomato pasta with zucchini, basil, and garlic.',
    instructions:
      'Cook the pasta. Sauté zucchini and garlic, add tomato and tomato paste, then toss with pasta and basil.',
    cuisine: 'Italian-inspired',
    preparationTime: 30,
    servings: 3,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'vegan'],
    allergens: ['gluten'],
    isPublished: true,
    ingredients: [
      recipeIngredient('pasta', 300, 'g', 'MAIN'),
      recipeIngredient('zucchini', 2, 'whole', 'MAIN'),
      recipeIngredient('tomato', 3, 'whole', 'MAIN'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
      recipeIngredient('basil', 8, 'leaves', 'OTHER'),
      recipeIngredient('tomato paste', 1, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-tuna-tomato-pasta',
    name: 'Tuna Tomato Pasta',
    description: 'Pasta with tuna in a simple tomato and onion sauce.',
    instructions:
      'Cook the pasta. Soften onion and garlic in olive oil, add tomato and tomato paste, then fold in tuna and pasta.',
    cuisine: 'Italian-inspired',
    preparationTime: 30,
    servings: 3,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'high-protein'],
    allergens: ['fish', 'gluten'],
    isPublished: true,
    ingredients: [
      recipeIngredient('pasta', 300, 'g', 'MAIN'),
      recipeIngredient('tuna', 200, 'g', 'MAIN'),
      recipeIngredient('tomato', 3, 'whole', 'MAIN'),
      recipeIngredient('onion', 1, 'whole', 'SIDE'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
      recipeIngredient('tomato paste', 1, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-tofu-broccoli-rice',
    name: 'Tofu Broccoli Rice',
    description: 'Tofu and broccoli served over rice with soy and green onion.',
    instructions:
      'Brown the tofu, add broccoli and garlic, season with soy sauce, and serve with rice and green onion.',
    cuisine: 'Asian-inspired',
    preparationTime: 30,
    servings: 3,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'high-protein', 'vegan'],
    allergens: ['gluten', 'soy'],
    isPublished: true,
    ingredients: [
      recipeIngredient('tofu', 350, 'g', 'MAIN'),
      recipeIngredient('broccoli', 3, 'cup', 'MAIN'),
      recipeIngredient('rice', 3, 'cup', 'SIDE'),
      recipeIngredient('soy sauce', 2, 'tbsp', 'OTHER'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('green onion', 2, 'whole', 'SIDE'),
    ],
  },
  {
    id: 'seed-recipe-beef-bean-tortilla-pan',
    name: 'Beef Bean Tortilla Pan',
    description: 'Ground beef and kidney beans with vegetables, tortilla, and cheddar.',
    instructions:
      'Brown the beef and onion, add beans, tomato, and cumin, then serve with warm tortilla and cheddar.',
    cuisine: 'Mexican-inspired',
    preparationTime: 35,
    servings: 4,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['high-protein'],
    allergens: ['dairy', 'gluten'],
    isPublished: true,
    ingredients: [
      recipeIngredient('ground beef', 450, 'g', 'MAIN'),
      recipeIngredient('red kidney bean', 1, 'cup', 'MAIN'),
      recipeIngredient('tortilla', 4, 'whole', 'SIDE'),
      recipeIngredient('tomato', 2, 'whole', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'OTHER'),
      recipeIngredient('cheddar cheese', 100, 'g', 'SIDE'),
      recipeIngredient('cumin', 1, 'tsp', 'OTHER'),
    ],
  },

  // Complex recipes: 6 recipes with 9-12 ingredients.
  {
    id: 'seed-recipe-mediterranean-quinoa-tray',
    name: 'Mediterranean Quinoa Tray',
    description: 'Quinoa and chickpeas with roasted vegetables, herbs, and feta.',
    instructions:
      'Roast the vegetables and chickpeas with olive oil and garlic. Serve over quinoa with lemon, parsley, and feta.',
    cuisine: 'Mediterranean-inspired',
    preparationTime: 50,
    servings: 4,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['gluten-free', 'vegetarian'],
    allergens: ['dairy'],
    isPublished: true,
    ingredients: [
      recipeIngredient('quinoa', 3, 'cup', 'MAIN'),
      recipeIngredient('chickpea', 2, 'cup', 'MAIN'),
      recipeIngredient('zucchini', 1, 'whole', 'SIDE'),
      recipeIngredient('eggplant', 1, 'whole', 'SIDE'),
      recipeIngredient('bell pepper', 1, 'whole', 'SIDE'),
      recipeIngredient('tomato', 2, 'whole', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'OTHER'),
      recipeIngredient('garlic', 3, 'clove', 'OTHER'),
      recipeIngredient('olive oil', 2, 'tbsp', 'OTHER'),
      recipeIngredient('lemon', 1, 'whole', 'OTHER'),
      recipeIngredient('parsley', 3, 'tbsp', 'OTHER'),
      recipeIngredient('feta cheese', 120, 'g', 'SIDE'),
    ],
  },
  {
    id: 'seed-recipe-coconut-tofu-vegetable-stew',
    name: 'Coconut Tofu Vegetable Stew',
    description: 'Tofu and mixed vegetables in a coconut broth served with rice.',
    instructions:
      'Soften the onion and garlic, add the vegetables, tofu, coconut milk, and soy sauce, then simmer and serve with rice and lime.',
    cuisine: 'Asian-inspired',
    preparationTime: 45,
    servings: 5,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'vegan'],
    allergens: ['gluten', 'soy'],
    isPublished: true,
    ingredients: [
      recipeIngredient('tofu', 450, 'g', 'MAIN'),
      recipeIngredient('coconut milk', 2, 'cup', 'MAIN'),
      recipeIngredient('broccoli', 2, 'cup', 'SIDE'),
      recipeIngredient('cauliflower', 2, 'cup', 'SIDE'),
      recipeIngredient('carrot', 2, 'whole', 'SIDE'),
      recipeIngredient('bell pepper', 1, 'whole', 'SIDE'),
      recipeIngredient('spinach', 2, 'cup', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'OTHER'),
      recipeIngredient('garlic', 3, 'clove', 'OTHER'),
      recipeIngredient('rice', 3, 'cup', 'SIDE'),
      recipeIngredient('soy sauce', 2, 'tbsp', 'OTHER'),
      recipeIngredient('lime', 1, 'whole', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-chicken-vegetable-soup',
    name: 'Chicken Vegetable Soup',
    description: 'A home-style chicken soup with potatoes, vegetables, and herbs.',
    instructions:
      'Soften the onion, celery, and garlic in olive oil. Add chicken, vegetables, and broth, then simmer until cooked and finish with parsley.',
    cuisine: 'Home-style',
    preparationTime: 60,
    servings: 6,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'high-protein'],
    allergens: [],
    isPublished: true,
    ingredients: [
      recipeIngredient('chicken breast', 600, 'g', 'MAIN'),
      recipeIngredient('potato', 3, 'whole', 'MAIN'),
      recipeIngredient('carrot', 3, 'whole', 'SIDE'),
      recipeIngredient('celery', 3, 'stalk', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'OTHER'),
      recipeIngredient('garlic', 3, 'clove', 'OTHER'),
      recipeIngredient('vegetable broth', 6, 'cup', 'SIDE'),
      recipeIngredient('green pea', 1, 'cup', 'SIDE'),
      recipeIngredient('parsley', 3, 'tbsp', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-layered-bean-vegetable-bake',
    name: 'Layered Bean Vegetable Bake',
    description: 'Beans and vegetables baked with tortilla layers and cheddar.',
    instructions:
      'Cook the beans and vegetables with tomato paste and cumin. Layer with tortillas and cheddar, then bake until hot.',
    cuisine: 'Mexican-inspired',
    preparationTime: 65,
    servings: 6,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['high-protein', 'vegetarian'],
    allergens: ['dairy', 'gluten'],
    isPublished: false,
    ingredients: [
      recipeIngredient('black bean', 2, 'cup', 'MAIN'),
      recipeIngredient('red kidney bean', 2, 'cup', 'MAIN'),
      recipeIngredient('tomato', 3, 'whole', 'SIDE'),
      recipeIngredient('corn', 1, 'cup', 'SIDE'),
      recipeIngredient('bell pepper', 1, 'whole', 'SIDE'),
      recipeIngredient('zucchini', 1, 'whole', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'OTHER'),
      recipeIngredient('garlic', 3, 'clove', 'OTHER'),
      recipeIngredient('tomato paste', 2, 'tbsp', 'OTHER'),
      recipeIngredient('cheddar cheese', 150, 'g', 'SIDE'),
      recipeIngredient('tortilla', 6, 'whole', 'SIDE'),
      recipeIngredient('cumin', 1, 'tsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-lentil-sweet-potato-stew',
    name: 'Lentil Sweet Potato Stew',
    description: 'A substantial lentil stew with sweet potato and leafy vegetables.',
    instructions:
      'Soften the onion, celery, carrot, and garlic in olive oil. Add the remaining ingredients and simmer until the lentils and sweet potato are tender.',
    cuisine: 'General',
    preparationTime: 55,
    servings: 6,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'vegan'],
    allergens: [],
    isPublished: false,
    ingredients: [
      recipeIngredient('brown lentil', 2, 'cup', 'MAIN'),
      recipeIngredient('sweet potato', 2, 'whole', 'MAIN'),
      recipeIngredient('tomato', 3, 'whole', 'SIDE'),
      recipeIngredient('spinach', 3, 'cup', 'SIDE'),
      recipeIngredient('carrot', 2, 'whole', 'SIDE'),
      recipeIngredient('celery', 2, 'stalk', 'SIDE'),
      recipeIngredient('onion', 1, 'whole', 'OTHER'),
      recipeIngredient('garlic', 3, 'clove', 'OTHER'),
      recipeIngredient('tomato paste', 2, 'tbsp', 'OTHER'),
      recipeIngredient('cumin', 1, 'tsp', 'OTHER'),
      recipeIngredient('paprika', 1, 'tsp', 'OTHER'),
      recipeIngredient('olive oil', 2, 'tbsp', 'OTHER'),
    ],
  },
  {
    id: 'seed-recipe-salmon-quinoa-vegetables',
    name: 'Salmon Quinoa Vegetables',
    description: 'Salmon and quinoa with a broad mix of roasted vegetables.',
    instructions:
      'Roast the vegetables with garlic and olive oil. Cook the salmon, then serve everything over quinoa with lemon and green onion.',
    cuisine: 'General',
    preparationTime: 50,
    servings: 4,
    imageUrl: null,
    sourceUrl: null,
    dietTags: ['dairy-free', 'gluten-free', 'high-protein'],
    allergens: ['fish'],
    isPublished: false,
    ingredients: [
      recipeIngredient('salmon', 500, 'g', 'MAIN'),
      recipeIngredient('quinoa', 3, 'cup', 'MAIN'),
      recipeIngredient('broccoli', 2, 'cup', 'SIDE'),
      recipeIngredient('zucchini', 1, 'whole', 'SIDE'),
      recipeIngredient('carrot', 2, 'whole', 'SIDE'),
      recipeIngredient('tomato', 2, 'whole', 'SIDE'),
      recipeIngredient('green onion', 2, 'whole', 'OTHER'),
      recipeIngredient('garlic', 2, 'clove', 'OTHER'),
      recipeIngredient('lemon', 1, 'whole', 'OTHER'),
      recipeIngredient('olive oil', 1, 'tbsp', 'OTHER'),
    ],
  },
];

export const seedManifest: SeedManifest = {
  ingredients: seedIngredients,
  aliases: seedAliases,
  recipes: seedRecipes,
};

export const seedRecipeIngredientCount = seedRecipes.reduce(
  (total, recipe) => total + recipe.ingredients.length,
  0,
);

const ingredientAllergens: Readonly<
  Partial<Record<(typeof seedIngredients)[number], readonly SeedAllergen[]>>
> = {
  almond: ['tree-nut'],
  bread: ['gluten'],
  couscous: ['gluten'],
  egg: ['egg'],
  'feta cheese': ['dairy'],
  milk: ['dairy'],
  'mozzarella cheese': ['dairy'],
  oats: [],
  pasta: ['gluten'],
  peanut: ['peanut'],
  salmon: ['fish'],
  'soy sauce': ['gluten', 'soy'],
  tahini: ['sesame'],
  tofu: ['soy'],
  tortilla: ['gluten'],
  tuna: ['fish'],
  'wheat flour': ['gluten'],
  yogurt: ['dairy'],
  'cheddar cheese': ['dairy'],
};

const isNormalized = (value: string): boolean => {
  try {
    return normalizeIngredientInputs([value])[0] === value;
  } catch {
    return false;
  }
};

const duplicateValues = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  }

  return [...duplicates];
};

const sameValues = (
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): boolean =>
  left.size === right.size && [...left].every((value) => right.has(value));

export const validateSeedManifest = (
  manifest: SeedManifest = seedManifest,
): void => {
  const errors: string[] = [];
  const canonicalNames = new Set(manifest.ingredients);

  if (manifest.ingredients.length !== 60) {
    errors.push(`expected 60 canonical ingredients, received ${manifest.ingredients.length}`);
  }

  const duplicateIngredients = duplicateValues(manifest.ingredients);
  if (duplicateIngredients.length > 0) {
    errors.push(`duplicate canonical ingredients: ${duplicateIngredients.join(', ')}`);
  }

  for (const ingredient of manifest.ingredients) {
    if (!isNormalized(ingredient)) {
      errors.push(`canonical ingredient is not normalized: ${JSON.stringify(ingredient)}`);
    }
  }

  if (manifest.aliases.length !== 30) {
    errors.push(`expected 30 aliases, received ${manifest.aliases.length}`);
  }

  const aliasNames = manifest.aliases.map(({ alias }) => alias);
  const duplicateAliases = duplicateValues(aliasNames);
  if (duplicateAliases.length > 0) {
    errors.push(`duplicate aliases: ${duplicateAliases.join(', ')}`);
  }

  for (const { alias, ingredient } of manifest.aliases) {
    if (!isNormalized(alias)) {
      errors.push(`alias is not normalized: ${JSON.stringify(alias)}`);
    }

    if (canonicalNames.has(alias)) {
      errors.push(`alias collides with canonical ingredient: ${alias}`);
    }

    if (!canonicalNames.has(ingredient)) {
      errors.push(`alias ${alias} references unknown ingredient: ${ingredient}`);
    }
  }

  if (manifest.recipes.length !== 30) {
    errors.push(`expected 30 recipes, received ${manifest.recipes.length}`);
  }

  const recipeIds = manifest.recipes.map(({ id }) => id);
  const duplicateRecipeIds = duplicateValues(recipeIds);
  if (duplicateRecipeIds.length > 0) {
    errors.push(`duplicate recipe IDs: ${duplicateRecipeIds.join(', ')}`);
  }

  const publishedCount = manifest.recipes.filter(
    ({ isPublished }) => isPublished,
  ).length;
  if (publishedCount !== 27 || manifest.recipes.length - publishedCount !== 3) {
    errors.push(
      `expected 27 published and 3 unpublished recipes, received ${publishedCount} and ${manifest.recipes.length - publishedCount}`,
    );
  }

  const simpleCount = manifest.recipes.filter(
    ({ ingredients }) => ingredients.length >= 3 && ingredients.length <= 4,
  ).length;
  const mediumCount = manifest.recipes.filter(
    ({ ingredients }) => ingredients.length >= 5 && ingredients.length <= 8,
  ).length;
  const complexCount = manifest.recipes.filter(
    ({ ingredients }) => ingredients.length >= 9 && ingredients.length <= 12,
  ).length;

  if (simpleCount !== 6 || mediumCount !== 18 || complexCount !== 6) {
    errors.push(
      `expected recipe complexity split 6/18/6, received ${simpleCount}/${mediumCount}/${complexCount}`,
    );
  }

  const relationshipCount = manifest.recipes.reduce(
    (total, recipe) => total + recipe.ingredients.length,
    0,
  );
  if (relationshipCount < 180 || relationshipCount > 220) {
    errors.push(
      `expected 180-220 recipe ingredient relationships, received ${relationshipCount}`,
    );
  }

  const allowedCategories = new Set<string>(seedIngredientCategories);
  const allowedDietTags = new Set<string>(seedDietTags);
  const allowedAllergens = new Set<string>(seedAllergens);

  for (const recipe of manifest.recipes) {
    if (!/^seed-recipe-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.id)) {
      errors.push(`recipe ID is not stable-format: ${recipe.id}`);
    }

    if (recipe.name.trim().length < 2 || recipe.name.length > 150) {
      errors.push(`recipe has invalid name: ${recipe.id}`);
    }

    if (recipe.instructions.trim().length === 0) {
      errors.push(`recipe has empty instructions: ${recipe.id}`);
    }

    if (recipe.description.trim().length === 0) {
      errors.push(`recipe has empty description: ${recipe.id}`);
    }

    if (recipe.cuisine.trim().length === 0) {
      errors.push(`recipe has empty cuisine: ${recipe.id}`);
    }

    if (!Number.isInteger(recipe.preparationTime) || recipe.preparationTime <= 0) {
      errors.push(`recipe has invalid preparation time: ${recipe.id}`);
    }

    if (!Number.isInteger(recipe.servings) || recipe.servings <= 0) {
      errors.push(`recipe has invalid servings: ${recipe.id}`);
    }

    if (recipe.imageUrl !== null || recipe.sourceUrl !== null) {
      errors.push(`recipe must use null imageUrl and sourceUrl: ${recipe.id}`);
    }

    if (recipe.ingredients.length === 0) {
      errors.push(`recipe has no ingredients: ${recipe.id}`);
    }

    const recipeIngredientNames = recipe.ingredients.map(
      ({ ingredient }) => ingredient,
    );
    const recipeDuplicates = duplicateValues(recipeIngredientNames);
    if (recipeDuplicates.length > 0) {
      errors.push(
        `recipe ${recipe.id} has duplicate ingredients: ${recipeDuplicates.join(', ')}`,
      );
    }

    for (const relationship of recipe.ingredients) {
      if (!canonicalNames.has(relationship.ingredient)) {
        errors.push(
          `recipe ${recipe.id} references unknown ingredient: ${relationship.ingredient}`,
        );
      }

      if (!allowedCategories.has(relationship.category)) {
        errors.push(
          `recipe ${recipe.id} has invalid category: ${relationship.category}`,
        );
      }

      if (
        relationship.quantity !== null &&
        (!Number.isFinite(relationship.quantity) || relationship.quantity <= 0)
      ) {
        errors.push(
          `recipe ${recipe.id} has invalid quantity for ${relationship.ingredient}`,
        );
      }

      if (
        relationship.unit !== null &&
        relationship.unit.trim().length === 0
      ) {
        errors.push(
          `recipe ${recipe.id} has an empty unit for ${relationship.ingredient}`,
        );
      }
    }

    for (const tag of recipe.dietTags) {
      if (!isNormalized(tag) || !allowedDietTags.has(tag)) {
        errors.push(`recipe ${recipe.id} has invalid diet tag: ${tag}`);
      }
    }

    if (duplicateValues(recipe.dietTags).length > 0) {
      errors.push(`recipe ${recipe.id} has duplicate diet tags`);
    }

    for (const allergen of recipe.allergens) {
      if (!isNormalized(allergen) || !allowedAllergens.has(allergen)) {
        errors.push(`recipe ${recipe.id} has invalid allergen: ${allergen}`);
      }
    }

    if (duplicateValues(recipe.allergens).length > 0) {
      errors.push(`recipe ${recipe.id} has duplicate allergens`);
    }

    const expectedAllergens = new Set<string>(
      recipe.ingredients.flatMap(
        ({ ingredient }) => ingredientAllergens[ingredient as keyof typeof ingredientAllergens] ?? [],
      ),
    );
    const actualAllergens = new Set<string>(recipe.allergens);
    if (!sameValues(expectedAllergens, actualAllergens)) {
      errors.push(
        `recipe ${recipe.id} allergens do not match its controlled ingredients`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid seed manifest:\n- ${errors.join('\n- ')}`);
  }
};
