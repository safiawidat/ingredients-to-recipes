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
