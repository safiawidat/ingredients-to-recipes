@'
# Ingredients to Recipes

A full-stack web application that recommends recipes based on ingredients the user already has.

## Tech Stack

- React
- TypeScript
- Vite
- Node.js
- Express
- PostgreSQL
- Prisma
- Vitest

## Project Structure

```text
client/      React frontend
server/      Express API
docs/        Project documentation
database/    Database-related assets
sample-data/ Sample recipe data


Requirements
Node.js 22
npm
PostgreSQL database
Setup

Install all dependencies:

npm run install:all

Create local environment files:

client/.env
server/.env

Use the provided examples:

client/.env.example
server/.env.example

Generate the Prisma client:

npm run db:generate
Development

Start the backend:

npm run dev:server

Start the frontend in another terminal:

npm run dev:client
Quality Checks

Run linting, type checks, tests, and production builds:

npm run check
Database Commands

Generate Prisma Client:

npm run db:generate

Apply committed migrations:

npm run db:migrate

Run the seed script:

npm run db:seed
API Health Endpoints
GET /api/v1/health
GET /api/v1/health/database
Environment Variables
Client
VITE_API_BASE_URL=http://localhost:3000/api/v1
Server
DATABASE_URL=postgresql://...
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

Never commit real credentials or local .env files.

Deployment

The backend is prepared for Render using render.yaml.

Production database migrations run automatically before the API starts.
'@ | Set-Content README.md


Then verify:

```powershell
npm run check
git diff --check
git status --short