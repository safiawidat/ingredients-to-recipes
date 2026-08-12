import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';

import { normalizeIngredientInput } from '../src/app/utils/ingredient-normalization.js';
import {
  recipeImportRequestSchema,
  type RecipeImportRecipe,
} from '../src/app/validation/recipe-import-schemas.js';
import { seedAliases, seedIngredients, seedRecipes } from './seed-data.js';
import {
  animalIngredients,
  categoryForIngredient,
  controlledAllergenMap,
  controlledCommonIngredients,
  controlledCuisineCounts,
  controlledRecipeFamilies,
  dairyIngredients,
  glutenIngredients,
  ingredientMeasures,
  meatAndFishIngredients,
  type ControlledRecipeFamily,
} from './controlled-recipe-templates.js';

export const CONTROLLED_RECIPE_COUNT = 470;
export const CONTROLLED_BATCH_SIZE = 235;
export const CONTROLLED_PUBLISHED_COUNT = 460;
export const CONTROLLED_ALIAS_RECIPE_COUNT = 20;

export const controlledBatchFileNames = [
  'controlled-recipes-batch-01.json',
  'controlled-recipes-batch-02.json',
] as const;

export interface GeneratedControlledRecipe {
  family: string;
  canonicalIngredients: readonly string[];
  recipe: RecipeImportRecipe;
}

export interface ControlledDatasetArtifacts {
  records: GeneratedControlledRecipe[];
  batches: [RecipeImportRecipe[], RecipeImportRecipe[]];
  serializedBatches: [string, string];
}

const unpublishedIndexes = new Set([
  31, 78, 125, 172, 219, 266, 313, 360, 407, 454,
]);

const aliasRecipeIndexes = new Set(
  Array.from({ length: CONTROLLED_ALIAS_RECIPE_COUNT }, (_, index) => 5 + index * 23),
);

const aliasesByCanonical = new Map<string, string[]>();
const canonicalByTerm = new Map<string, string>();
const exclusiveProteins = new Set([
  'chicken breast',
  'ground beef',
  'tuna',
  'salmon',
  'tofu',
  'egg',
]);

for (const ingredient of seedIngredients) {
  canonicalByTerm.set(normalizeIngredientInput(ingredient), ingredient);
}

for (const { alias, ingredient } of seedAliases) {
  const current = aliasesByCanonical.get(ingredient) ?? [];
  current.push(alias);
  aliasesByCanonical.set(ingredient, current);
  canonicalByTerm.set(normalizeIngredientInput(alias), ingredient);
}

const toTitleCase = (value: string): string =>
  value.replace(/\b\w/g, (character) => character.toUpperCase());

export const toControlledRecipeNameKey = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, ' ');

export const resolveControlledIngredient = (term: string): string | null =>
  canonicalByTerm.get(normalizeIngredientInput(term)) ?? null;

export const toCanonicalSignature = (terms: readonly string[]): string => {
  const resolved = terms.map((term) => {
    const canonical = resolveControlledIngredient(term);
    if (!canonical) {
      throw new Error(`Unknown controlled ingredient term: ${term}`);
    }
    return canonical;
  });

  if (new Set(resolved).size !== resolved.length) {
    throw new Error(`Duplicate resolved ingredient in signature: ${terms.join(', ')}`);
  }

  return [...resolved].sort().join('|');
};

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const choose = (total: number, selected: number): number => {
  if (selected < 0 || selected > total) {
    return 0;
  }

  const smaller = Math.min(selected, total - selected);
  let result = 1;
  for (let index = 1; index <= smaller; index += 1) {
    result = (result * (total - smaller + index)) / index;
  }
  return Math.round(result);
};

const selectCombination = (
  values: readonly string[],
  count: number,
  requestedOrdinal: number,
): string[] => {
  const items = unique(values);
  if (count < 0 || count > items.length) {
    throw new Error(`Cannot select ${count} values from a pool of ${items.length}`);
  }
  if (count === 0) {
    return [];
  }

  const combinationCount = choose(items.length, count);
  let ordinal =
    (requestedOrdinal * 2_654_435_761 + 1_013_904_223) % combinationCount;
  const result: string[] = [];
  let start = 0;

  for (let position = 0; position < count; position += 1) {
    const remaining = count - position - 1;
    for (let candidate = start; candidate < items.length; candidate += 1) {
      const blockSize = choose(items.length - candidate - 1, remaining);
      if (ordinal < blockSize) {
        result.push(items[candidate] as string);
        start = candidate + 1;
        break;
      }
      ordinal -= blockSize;
    }
  }

  return result;
};

const smoothQuotaSequence = <T extends string | number>(
  counts: Readonly<Record<string, number>>,
  parseKey: (key: string) => T,
): T[] => {
  const entries = Object.entries(counts).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const current = new Map(entries.map(([key]) => [key, 0]));
  const remaining = new Map(entries);
  const result: T[] = [];

  for (let position = 0; position < total; position += 1) {
    for (const [key, weight] of entries) {
      if ((remaining.get(key) ?? 0) > 0) {
        current.set(key, (current.get(key) ?? 0) + weight);
      }
    }

    const selected = entries
      .filter(([key]) => (remaining.get(key) ?? 0) > 0)
      .sort(
        ([left], [right]) =>
          (current.get(right) ?? 0) - (current.get(left) ?? 0) ||
          left.localeCompare(right),
      )[0];

    if (!selected) {
      throw new Error('Quota sequence ended before all entries were assigned');
    }

    const [selectedKey] = selected;
    current.set(selectedKey, (current.get(selectedKey) ?? 0) - total);
    remaining.set(selectedKey, (remaining.get(selectedKey) ?? 0) - 1);
    result.push(parseKey(selectedKey));
  }

  return result;
};

const ingredientCountForComplexity = (
  complexity: 'simple' | 'medium' | 'complex',
  occurrence: number,
): number => {
  if (complexity === 'simple') {
    return 3 + (occurrence % 3);
  }
  if (complexity === 'medium') {
    return 6 + (occurrence % 3);
  }
  return 9 + (occurrence % 4);
};

const commonIngredientCount = (ingredientCount: number): number => {
  if (ingredientCount <= 5) {
    return 1;
  }
  if (ingredientCount <= 8) {
    return 2;
  }
  return 3;
};

const dietTagsFor = (ingredients: ReadonlySet<string>): string[] => {
  const containsAny = (values: readonly string[]) =>
    values.some((ingredient) => ingredients.has(ingredient));
  const tags: string[] = [];

  if (!containsAny(animalIngredients)) {
    tags.push('vegan');
  } else if (!containsAny(meatAndFishIngredients)) {
    tags.push('vegetarian');
  }
  if (!containsAny(dairyIngredients)) {
    tags.push('dairy-free');
  }
  if (!containsAny(glutenIngredients)) {
    tags.push('gluten-free');
  }

  return tags;
};

const allergensFor = (ingredients: ReadonlySet<string>): string[] => {
  const allergens = new Set<string>();
  for (const ingredient of ingredients) {
    const mapped = controlledAllergenMap[
      ingredient as keyof typeof controlledAllergenMap
    ] as readonly string[] | undefined;
    for (const allergen of mapped ?? []) {
      allergens.add(allergen);
    }
  }
  return [...allergens].sort();
};

const createRecipeName = (
  family: ControlledRecipeFamily,
  localIndex: number,
  featured: readonly string[],
  form: string,
): string => {
  const style = family.titleStyles[localIndex % family.titleStyles.length];
  if (!style || !form || featured.length === 0) {
    throw new Error(`Family ${family.key} cannot construct a recipe title`);
  }

  return `${style} ${featured.map(toTitleCase).join(' and ')} ${form}`;
};

const createFamilyRecords = (
  family: ControlledRecipeFamily,
  familyIndex: number,
  startingGlobalIndex: number,
  commonCursor: { value: number },
): GeneratedControlledRecipe[] => {
  const complexitySequence = smoothQuotaSequence(
    family.complexity,
    (key) => key as 'simple' | 'medium' | 'complex',
  );
  const servingSequence = smoothQuotaSequence(
    family.servings,
    (key) => Number(key) as 1 | 2 | 4 | 6,
  );
  const cuisineSequence = smoothQuotaSequence(
    family.cuisines,
    (key) => key,
  );
  const complexityOccurrences = { simple: 0, medium: 0, complex: 0 };
  const records: GeneratedControlledRecipe[] = [];

  for (let localIndex = 0; localIndex < family.count; localIndex += 1) {
    const globalIndex = startingGlobalIndex + localIndex;
    const complexity = complexitySequence[localIndex];
    const servings = servingSequence[localIndex];
    const cuisine = cuisineSequence[localIndex];
    if (!complexity || !servings || !cuisine) {
      throw new Error(`Family ${family.key} has an incomplete quota sequence`);
    }

    const occurrence = complexityOccurrences[complexity];
    complexityOccurrences[complexity] += 1;
    const ingredientCount = ingredientCountForComplexity(complexity, occurrence);
    const rotatingBase = family.rotatingBasePool?.[
      localIndex % family.rotatingBasePool.length
    ];
    const primary = family.primaryPool[localIndex % family.primaryPool.length];
    if (!primary) {
      throw new Error(`Family ${family.key} has no primary ingredient`);
    }

    const selected = unique([
      ...family.baseIngredients,
      ...(rotatingBase ? [rotatingBase] : []),
      primary,
    ]);
    const centralIngredients = new Set(selected);
    const requiredCommonCount = commonIngredientCount(ingredientCount);
    const commonPool = family.commonPool ?? controlledCommonIngredients;
    let commonAttempts = 0;
    while (
      selected.filter((ingredient) =>
        (controlledCommonIngredients as readonly string[]).includes(ingredient),
      ).length < requiredCommonCount &&
      commonAttempts < commonPool.length * 2
    ) {
      const ingredient = commonPool[commonCursor.value % commonPool.length];
      commonCursor.value += 1;
      commonAttempts += 1;
      if (ingredient && !selected.includes(ingredient)) {
        selected.push(ingredient);
      }
    }

    const supportCount = ingredientCount - selected.length;
    let supportPool = unique(family.supportingPool).filter(
      (ingredient) => !selected.includes(ingredient),
    );
    const centralProtein = selected.find((ingredient) =>
      exclusiveProteins.has(ingredient),
    );
    if (centralProtein) {
      supportPool = supportPool.filter(
        (ingredient) => !exclusiveProteins.has(ingredient),
      );
    } else {
      const availableProteins = supportPool.filter((ingredient) =>
        exclusiveProteins.has(ingredient),
      );
      const allowedProtein =
        availableProteins[(localIndex + familyIndex) % availableProteins.length];
      if (allowedProtein) {
        supportPool = supportPool.filter(
          (ingredient) =>
            !exclusiveProteins.has(ingredient) || ingredient === allowedProtein,
        );
      }
    }
    const supportIngredients = selectCombination(
      supportPool,
      supportCount,
      familyIndex * 101 + localIndex * 37 + ingredientCount * 13,
    );
    selected.push(...supportIngredients);

    if (selected.length !== ingredientCount) {
      throw new Error(`Family ${family.key} generated the wrong ingredient count`);
    }

    const featured = unique([primary, ...supportIngredients])
      .filter(
        (ingredient) =>
          !(controlledCommonIngredients as readonly string[]).includes(ingredient) &&
          ingredient !== 'vegetable broth' &&
          ingredient !== 'wheat flour',
      )
      .slice(0, 3);
    const safeFeatured = featured.length > 0 ? featured : [primary];
    const form =
      family.key === 'wraps-sandwiches' && rotatingBase
        ? rotatingBase === 'bread'
          ? 'Sandwich'
          : 'Wrap'
        : family.forms[
            Math.floor(localIndex / family.titleStyles.length) % family.forms.length
          ] ?? family.forms[0] ?? 'Dish';
    const name = createRecipeName(family, localIndex, safeFeatured, form);
    const description = `A ${family.titleStyles[
      localIndex % family.titleStyles.length
    ]?.toLowerCase()} ${form.toLowerCase()} featuring ${safeFeatured.join(' and ')}.`;

    const canonicalSet = new Set(selected);
    const ingredients = selected
      .map((ingredient) => {
        const measure = ingredientMeasures[ingredient];
        if (!measure) {
          throw new Error(`Missing controlled measure for ${ingredient}`);
        }
        return {
          name: ingredient,
          quantity: measure.quantity,
          unit: measure.unit,
          category: categoryForIngredient(ingredient, centralIngredients),
        };
      })
      .sort((left, right) => {
        const categoryOrder = { MAIN: 0, SIDE: 1, OTHER: 2 };
        return (
          categoryOrder[left.category] - categoryOrder[right.category] ||
          left.name.localeCompare(right.name)
        );
      });

    records.push({
      family: family.label,
      canonicalIngredients: [...selected],
      recipe: {
        name,
        description,
        instructions: family.instruction(safeFeatured),
        cuisine,
        preparationTime:
          family.preparationTimes[localIndex % family.preparationTimes.length] ??
          family.preparationTimes[0] ??
          30,
        servings,
        imageUrl: null,
        sourceUrl: null,
        dietTags: dietTagsFor(canonicalSet),
        allergens: allergensFor(canonicalSet),
        isPublished: !unpublishedIndexes.has(globalIndex),
        ingredients,
      },
    });
  }

  return records;
};

const applyAliases = (records: GeneratedControlledRecipe[]): void => {
  let aliasCase = 0;
  for (const [recordIndex, record] of records.entries()) {
    if (!aliasRecipeIndexes.has(recordIndex)) {
      continue;
    }

    const aliasable = record.recipe.ingredients.filter((ingredient) =>
      aliasesByCanonical.has(ingredient.name),
    );
    if (aliasable.length === 0) {
      throw new Error(`Alias recipe ${recordIndex} has no aliasable ingredient`);
    }
    const selected = aliasable[aliasCase % aliasable.length];
    if (!selected) {
      throw new Error(`Alias recipe ${recordIndex} cannot select an alias`);
    }
    const aliases = aliasesByCanonical.get(selected.name) ?? [];
    const alias = aliases[aliasCase % aliases.length];
    if (!alias) {
      throw new Error(`Alias recipe ${recordIndex} cannot resolve an alias`);
    }
    selected.name = alias;
    aliasCase += 1;
  }

  if (aliasCase !== CONTROLLED_ALIAS_RECIPE_COUNT) {
    throw new Error(`Expected ${CONTROLLED_ALIAS_RECIPE_COUNT} alias recipes, generated ${aliasCase}`);
  }
};

const assertUniqueNamesAndSignatures = (
  records: readonly GeneratedControlledRecipe[],
): void => {
  const names = new Set(seedRecipes.map((recipe) => toControlledRecipeNameKey(recipe.name)));
  const signatures = new Map(
    seedRecipes.map((recipe) =>
      [
        toCanonicalSignature(recipe.ingredients.map(({ ingredient }) => ingredient)),
        recipe.name,
      ] as const,
    ),
  );

  for (const record of records) {
    const nameKey = toControlledRecipeNameKey(record.recipe.name);
    if (names.has(nameKey)) {
      throw new Error(`Duplicate controlled recipe name: ${record.recipe.name}`);
    }
    names.add(nameKey);

    const signature = toCanonicalSignature(
      record.recipe.ingredients.map(({ name }) => name),
    );
    const existingSignatureRecipe = signatures.get(signature);
    if (existingSignatureRecipe) {
      throw new Error(
        `Duplicate controlled ingredient signature: ${record.recipe.name} conflicts with ${existingSignatureRecipe}`,
      );
    }
    signatures.set(signature, record.recipe.name);
  }
};

export const generateControlledRecipeRecords = (): GeneratedControlledRecipe[] => {
  const records: GeneratedControlledRecipe[] = [];
  const commonCursor = { value: 0 };

  for (const [familyIndex, family] of controlledRecipeFamilies.entries()) {
    records.push(
      ...createFamilyRecords(
        family,
        familyIndex,
        records.length,
        commonCursor,
      ),
    );
  }

  if (records.length !== CONTROLLED_RECIPE_COUNT) {
    throw new Error(`Expected ${CONTROLLED_RECIPE_COUNT} recipes, generated ${records.length}`);
  }
  applyAliases(records);
  assertUniqueNamesAndSignatures(records);

  return records;
};

const serializeBatch = (recipes: readonly RecipeImportRecipe[]): string =>
  `${JSON.stringify({ recipes }, null, 2)}\n`;

export const createControlledDatasetArtifacts = (): ControlledDatasetArtifacts => {
  const records = generateControlledRecipeRecords();
  const batches: [RecipeImportRecipe[], RecipeImportRecipe[]] = [
    records.slice(0, CONTROLLED_BATCH_SIZE).map(({ recipe }) => recipe),
    records.slice(CONTROLLED_BATCH_SIZE).map(({ recipe }) => recipe),
  ];

  for (const batch of batches) {
    recipeImportRequestSchema.parse({ recipes: batch });
  }

  return {
    records,
    batches,
    serializedBatches: [serializeBatch(batches[0]), serializeBatch(batches[1])],
  };
};

export const writeControlledDatasetArtifacts = (): ControlledDatasetArtifacts => {
  const artifacts = createControlledDatasetArtifacts();
  const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

  for (const [index, fileName] of controlledBatchFileNames.entries()) {
    const contents = artifacts.serializedBatches[index];
    if (!contents) {
      throw new Error(`Missing serialized controlled batch ${index + 1}`);
    }
    writeFileSync(join(repositoryRoot, 'sample-data', fileName), contents, 'utf8');
  }

  return artifacts;
};

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;

if (invokedPath === import.meta.url) {
  const artifacts = writeControlledDatasetArtifacts();
  console.info(
    `Generated ${artifacts.records.length} controlled recipes in ${artifacts.batches.length} batches.`,
  );
}

export { controlledCuisineCounts };
