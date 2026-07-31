import { describe, expect, it } from 'vitest';

import { normalizeIngredientInputs } from './ingredient-normalization.js';

describe('normalizeIngredientInputs', () => {
  it('lowercases ingredients', () => {
    expect(
      normalizeIngredientInputs(['Tomato', 'GARLIC', 'Red Onion']),
    ).toEqual(['tomato', 'garlic', 'red onion']);
  });

  it('trims leading and trailing whitespace', () => {
    expect(
      normalizeIngredientInputs([' tomato ', '  onion', 'garlic  ']),
    ).toEqual(['tomato', 'onion', 'garlic']);
  });

  it('collapses repeated internal whitespace', () => {
    expect(
      normalizeIngredientInputs(['red   onion', 'olive   oil']),
    ).toEqual(['red onion', 'olive oil']);
  });

  it('handles tabs or similar whitespace between words', () => {
    expect(normalizeIngredientInputs(['green\tpepper'])).toEqual([
      'green pepper',
    ]);
  });

  it('removes duplicates after normalization', () => {
    expect(
      normalizeIngredientInputs([
        'Tomato',
        ' tomato ',
        'TOMATO',
        'Red   Onion',
        'red onion',
      ]),
    ).toEqual(['tomato', 'red onion']);
  });

  it('treats case-only differences as duplicates', () => {
    expect(normalizeIngredientInputs(['Garlic', 'garlic', 'GARLIC'])).toEqual(
      ['garlic'],
    );
  });

  it('treats whitespace-only differences as duplicates', () => {
    expect(
      normalizeIngredientInputs(['red onion', 'red   onion', ' red onion ']),
    ).toEqual(['red onion']);
  });

  it('preserves first-appearance ordering', () => {
    expect(
      normalizeIngredientInputs(['Garlic', 'Tomato', ' garlic ', 'Onion']),
    ).toEqual(['garlic', 'tomato', 'onion']);
  });

  it('produces deterministic results', () => {
    const input = ['Tomato', 'Garlic', 'tomato', 'Onion'];

    expect(normalizeIngredientInputs(input)).toEqual(
      normalizeIngredientInputs(input),
    );
  });

  it('rejects an empty array', () => {
    expect(() => normalizeIngredientInputs([])).toThrow(
      'At least one non-empty ingredient is required',
    );
  });

  it('rejects an array containing only empty strings', () => {
    expect(() => normalizeIngredientInputs(['', '', ''])).toThrow(
      'At least one non-empty ingredient is required',
    );
  });

  it('rejects an array containing only whitespace', () => {
    expect(() => normalizeIngredientInputs(['   ', '\t', '  \n '])).toThrow(
      'At least one non-empty ingredient is required',
    );
  });

  it('ignores empty items when valid ingredients also exist', () => {
    expect(
      normalizeIngredientInputs(['Tomato', '', '   ', 'Onion']),
    ).toEqual(['tomato', 'onion']);
  });

  it('does not mutate the input array', () => {
    const input = ['Tomato', ' Onion '];
    const inputCopy = [...input];

    normalizeIngredientInputs(input);

    expect(input).toEqual(inputCopy);
  });

  it('does not incorrectly merge different ingredient names', () => {
    expect(
      normalizeIngredientInputs(['tomato', 'potato', 'onion']),
    ).toEqual(['tomato', 'potato', 'onion']);
  });

  it('keeps singular and plural forms separate', () => {
    expect(
      normalizeIngredientInputs(['tomato', 'tomatoes', 'pepper', 'peppers']),
    ).toEqual(['tomato', 'tomatoes', 'pepper', 'peppers']);
  });

  it('keeps preparation-word variants separate', () => {
    expect(
      normalizeIngredientInputs(['garlic', 'chopped garlic']),
    ).toEqual(['garlic', 'chopped garlic']);
  });
});
