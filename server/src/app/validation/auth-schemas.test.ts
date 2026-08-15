import { describe, expect, it } from 'vitest';

import { loginSchema, registerSchema } from './auth-schemas.js';

const maximumEmail = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;

describe('auth schemas', () => {
  it.each([
    ['register', registerSchema, { name: 'Test User' }],
    ['login', loginSchema, {}],
  ])('enforces practical email and password bounds for %s', (_name, schema, extra) => {
    expect(
      schema.safeParse({
        ...extra,
        email: maximumEmail,
        password: 'a'.repeat(72),
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        ...extra,
        email: `${maximumEmail}a`,
        password: 'a'.repeat(72),
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...extra,
        email: 'test@example.com',
        password: 'a'.repeat(73),
      }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        ...extra,
        email: 'test@example.com',
        password: 'a'.repeat(7),
      }).success,
    ).toBe(false);
  });
});
