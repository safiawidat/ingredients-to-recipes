import { describe, expect, it } from 'vitest';

import { recommendationRequestSchema } from './recommendation-schemas.js';

describe('recommendationRequestSchema', () => {
  it('accepts valid ingredients and applies the default limit', () => {
    const result = recommendationRequestSchema.safeParse({
      ingredients: ['tomato'],
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ingredients: ['tomato'], limit: 5 });
  });

  it('preserves raw ingredient strings for service normalization', () => {
    const ingredients = [' Tomatoes ', '  olive   oil '];
    const result = recommendationRequestSchema.safeParse({ ingredients });

    expect(result.success).toBe(true);
    expect(result.data?.ingredients).toEqual(ingredients);
  });

  it('accepts an explicit limit within the allowed range', () => {
    const result = recommendationRequestSchema.safeParse({
      ingredients: ['tomato'],
      limit: 20,
    });

    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(20);
  });

  it('rejects missing ingredients', () => {
    expect(recommendationRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an empty ingredients array', () => {
    expect(
      recommendationRequestSchema.safeParse({ ingredients: [] }).success,
    ).toBe(false);
  });

  it('accepts exactly 50 ingredients', () => {
    expect(
      recommendationRequestSchema.safeParse({
        ingredients: Array.from({ length: 50 }, (_, index) => `item-${index}`),
      }).success,
    ).toBe(true);
  });

  it('rejects more than 50 ingredients without truncating', () => {
    expect(
      recommendationRequestSchema.safeParse({
        ingredients: Array.from({ length: 51 }, (_, index) => `item-${index}`),
      }).success,
    ).toBe(false);
  });

  it('rejects a non-string ingredient', () => {
    expect(
      recommendationRequestSchema.safeParse({ ingredients: ['tomato', 42] })
        .success,
    ).toBe(false);
  });

  it('accepts an ingredient with exactly 100 raw characters', () => {
    expect(
      recommendationRequestSchema.safeParse({
        ingredients: ['a'.repeat(100)],
      }).success,
    ).toBe(true);
  });

  it('rejects an ingredient longer than 100 raw characters', () => {
    expect(
      recommendationRequestSchema.safeParse({
        ingredients: ['a'.repeat(101)],
      }).success,
    ).toBe(false);
  });

  it('rejects an array where every ingredient is empty or whitespace', () => {
    expect(
      recommendationRequestSchema.safeParse({
        ingredients: ['', '   ', '\t'],
      }).success,
    ).toBe(false);
  });

  it('allows empty entries when at least one ingredient is non-whitespace', () => {
    const result = recommendationRequestSchema.safeParse({
      ingredients: ['', ' tomato ', '   '],
    });

    expect(result.success).toBe(true);
    expect(result.data?.ingredients).toEqual(['', ' tomato ', '   ']);
  });

  it.each([0, 21])('rejects an out-of-range limit of %s', (limit) => {
    expect(
      recommendationRequestSchema.safeParse({
        ingredients: ['tomato'],
        limit,
      }).success,
    ).toBe(false);
  });

  it('rejects a non-integer limit', () => {
    expect(
      recommendationRequestSchema.safeParse({
        ingredients: ['tomato'],
        limit: 1.5,
      }).success,
    ).toBe(false);
  });

  it('does not coerce a string limit', () => {
    expect(
      recommendationRequestSchema.safeParse({
        ingredients: ['tomato'],
        limit: '5',
      }).success,
    ).toBe(false);
  });
});
