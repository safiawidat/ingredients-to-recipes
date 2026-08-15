export const DEPLOYMENT_INITIALIZATION_ARGUMENT =
  '--controlled-deployment-initialization';

export type SeedMode = 'development-seed' | 'deployment-initialization';

export interface SeedAuthorizationInput {
  mode: SeedMode;
  nodeEnv: string | undefined;
  allowDevelopmentSeed: string | undefined;
  allowProductionInitialization: string | undefined;
  databaseUrl: string | undefined;
}

export const authorizeSeed = (input: SeedAuthorizationInput): string => {
  if (input.mode === 'deployment-initialization') {
    if (input.allowProductionInitialization !== 'true') {
      throw new Error(
        'Controlled deployment initialization requires explicit opt-in: set ALLOW_PRODUCTION_DATABASE_INITIALIZATION=true',
      );
    }
  } else {
    if (input.nodeEnv === 'production') {
      throw new Error('Database seeding is disabled when NODE_ENV=production');
    }

    if (input.allowDevelopmentSeed !== 'true') {
      throw new Error(
        'Database seeding requires explicit local/dev opt-in: set ALLOW_DATABASE_SEED=true',
      );
    }
  }

  if (!input.databaseUrl) {
    throw new Error('DATABASE_URL is required for seeding');
  }

  return input.databaseUrl;
};
