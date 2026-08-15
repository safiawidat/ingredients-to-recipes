import 'dotenv/config';

import { z } from 'zod';

const booleanStringSchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const durationPattern = /^(\d+)(ms|s|m|h|d)$/;
const durationMultipliers = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
} as const;

const durationToMilliseconds = (duration: string): number => {
  const match = durationPattern.exec(duration);

  if (!match) {
    throw new Error('Unsupported duration format');
  }

  const value = Number(match[1]);
  const unit = match[2] as keyof typeof durationMultipliers;

  return value * durationMultipliers[unit];
};

const jwtDurationSchema = z
  .string()
  .regex(
    durationPattern,
    'JWT_EXPIRES_IN must use a duration such as 15m, 1h, or 7d',
  )
  .refine(
    (value) => {
      const milliseconds = durationToMilliseconds(value);
      return (
        Number.isSafeInteger(milliseconds) &&
        milliseconds > 0
      );
    },
    'JWT_EXPIRES_IN must resolve to a positive safe duration',
  );

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_EXPIRES_IN: jwtDurationSchema.default('15m'),
    AUTH_COOKIE_NAME: z.string().min(1).default('auth_token'),
    AUTH_COOKIE_SECURE: booleanStringSchema.optional(),
    AUTH_COOKIE_SAME_SITE: z
      .enum(['strict', 'lax', 'none'])
      .default('lax'),
  })
  .superRefine((environment, context) => {
    const cookieIsSecure =
      environment.AUTH_COOKIE_SECURE ??
      environment.NODE_ENV === 'production';

    if (
      environment.NODE_ENV === 'production' &&
      !cookieIsSecure
    ) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_COOKIE_SECURE'],
        message: 'AUTH_COOKIE_SECURE cannot be false in production',
      });
    }

    if (
      environment.AUTH_COOKIE_SAME_SITE === 'none' &&
      !cookieIsSecure
    ) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_COOKIE_SECURE'],
        message: 'AUTH_COOKIE_SECURE must be true when SameSite is none',
      });
    }
  });

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment configuration:');
  console.error(z.treeifyError(result.error));
  process.exit(1);
}

export const env = {
  ...result.data,
  AUTH_COOKIE_SECURE:
    result.data.AUTH_COOKIE_SECURE ?? result.data.NODE_ENV === 'production',
  AUTH_COOKIE_MAX_AGE_MS: durationToMilliseconds(
    result.data.JWT_EXPIRES_IN,
  ),
};
