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

## Authentication Deployment

The production `JWT_SECRET` must be configured manually and must not be
committed to the repository.

The default `SameSite=Lax` authentication cookie requires the deployed
frontend and API to be under the same site. A cross-site deployment requires
`AUTH_COOKIE_SAME_SITE=none`, `AUTH_COOKIE_SECURE=true`, and CSRF protection
before it is enabled.
