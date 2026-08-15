import { describe, expect, it } from 'vitest';

import { authorizeSeed } from './seed-authorization.js';

const databaseUrl = 'postgresql://unused:unused@example.test/recipes';

describe('authorizeSeed', () => {
  it('keeps normal seeding blocked in production', () => {
    expect(() =>
      authorizeSeed({
        mode: 'development-seed',
        nodeEnv: 'production',
        allowDevelopmentSeed: 'true',
        allowProductionInitialization: 'true',
        databaseUrl,
      }),
    ).toThrow('Database seeding is disabled when NODE_ENV=production');
  });

  it('keeps the existing local development opt-in', () => {
    expect(() =>
      authorizeSeed({
        mode: 'development-seed',
        nodeEnv: 'development',
        allowDevelopmentSeed: undefined,
        allowProductionInitialization: undefined,
        databaseUrl,
      }),
    ).toThrow('ALLOW_DATABASE_SEED=true');

    expect(
      authorizeSeed({
        mode: 'development-seed',
        nodeEnv: 'development',
        allowDevelopmentSeed: 'true',
        allowProductionInitialization: undefined,
        databaseUrl,
      }),
    ).toBe(databaseUrl);
  });

  it('requires the dedicated flag for deployment initialization', () => {
    expect(() =>
      authorizeSeed({
        mode: 'deployment-initialization',
        nodeEnv: 'production',
        allowDevelopmentSeed: 'true',
        allowProductionInitialization: undefined,
        databaseUrl,
      }),
    ).toThrow('ALLOW_PRODUCTION_DATABASE_INITIALIZATION=true');

    expect(
      authorizeSeed({
        mode: 'deployment-initialization',
        nodeEnv: 'production',
        allowDevelopmentSeed: undefined,
        allowProductionInitialization: 'true',
        databaseUrl,
      }),
    ).toBe(databaseUrl);
  });

  it('requires a database URL after authorization', () => {
    expect(() =>
      authorizeSeed({
        mode: 'deployment-initialization',
        nodeEnv: 'production',
        allowDevelopmentSeed: undefined,
        allowProductionInitialization: 'true',
        databaseUrl: undefined,
      }),
    ).toThrow('DATABASE_URL is required for seeding');
  });
});
