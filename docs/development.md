# Local Development

## Environment Files

Create:

client/.env
server/.env

Use these templates:

client/.env.example
server/.env.example

Never commit .env files.

## Generate Prisma Client

npm run db:generate

## Start Development Servers

Backend:

npm run dev:server

Frontend:

npm run dev:client

## Run All Checks

npm run check

## Database

Migrations are stored in:

server/prisma/migrations

### Controlled Development Seed Data

The repository includes original, manually controlled development data with
60 canonical ingredients, 30 aliases, and 30 recipes. The seed is
deterministic and idempotent: repeated runs restore the controlled records and
their recipe ingredients while leaving unrelated records alone.

Seeding requires an explicit local/development opt-in and is blocked when
`NODE_ENV=production`:

```powershell
$env:ALLOW_DATABASE_SEED = 'true'
npm.cmd run db:seed
Remove-Item Env:ALLOW_DATABASE_SEED
```

Do not enable `ALLOW_DATABASE_SEED` in production. The dataset is original
project content and does not come from scraped websites or third-party recipe
collections.

## Authentication Deployment

The production `JWT_SECRET` must be configured manually and must not be
committed to the repository.

The default `SameSite=Lax` authentication cookie requires the deployed
frontend and API to be under the same site. A cross-site deployment requires
`AUTH_COOKIE_SAME_SITE=none`, `AUTH_COOKIE_SECURE=true`, and CSRF protection
before it is enabled.
