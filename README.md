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

- client/ - React frontend
- server/ - Express API
- docs/ - project documentation
- database/ - database assets
- sample-data/ - sample recipe data

## Requirements

- Node.js 22
- npm
- PostgreSQL database

## Setup

Install dependencies:

npm run install:all

Create local environment files using:

client/.env.example
server/.env.example

Save them as:

client/.env
server/.env

Generate Prisma Client:

npm run db:generate

## Development

Start the backend:

npm run dev:server

Start the frontend in another terminal:

npm run dev:client

## Quality Checks

Run all checks:

npm run check

## Database Commands

Generate Prisma Client:

npm run db:generate

Apply migrations:

npm run db:migrate

Run seed:

```powershell
$env:ALLOW_DATABASE_SEED = 'true'
npm.cmd run db:seed
Remove-Item Env:ALLOW_DATABASE_SEED
```

The seed is intended only for local development and is blocked when
`NODE_ENV=production`. It deterministically upserts an original, controlled
dataset of 60 canonical ingredients, 30 aliases, and 30 recipes. Running it
again restores the same controlled records without deleting unrelated data.

## Controlled Recipe Import

ADMIN users can open `/admin/recipes/import`, select a local JSON file, and
send its parsed contents to `POST /api/v1/admin/recipes/import`. The backend
validates the controlled payload and writes valid, nonduplicate recipes
atomically to PostgreSQL. Each request accepts at most 500 recipes and is
subject to the existing 1 MiB JSON body limit.

Recipe names that already exist, or repeat later in the same payload after
case and whitespace normalization, are skipped and reported in the summary.
Any unknown ingredient or invalid record rejects the entire import before
writes. The importer does not scrape, fetch URLs, store uploaded files, or load
recipes from JSON during normal application runtime.

## Controlled Recipe Dataset

The project keeps the original 30 deterministic seed recipes as its baseline
and provides 470 additional original recipes as controlled import artifacts.
Together they produce 500 controlled recipes in a clean seeded database after
the two generated batches are imported separately by an ADMIN.

The extension is generated deterministically from predefined recipe-family
templates. It uses only the existing canonical ingredients and aliases, does
not scrape websites or use external recipe datasets, and produces two
importer-ready files with 235 recipes each:

- `sample-data/controlled-recipes-batch-01.json`
- `sample-data/controlled-recipes-batch-02.json`

Regenerate the files:

```powershell
npm.cmd run dataset:generate --prefix server
```

Validate the generated data and committed artifacts:

```powershell
npm.cmd run dataset:test --prefix server
```

Generation and validation do not write to PostgreSQL. Database import remains
a separate manual action through the ADMIN recipe importer; these files are
not claimed to have been imported.

## KNN Evaluation

Evaluation-only tooling compares the production ingredient-coverage ranking
with a simpler baseline that ranks recipes by matched ingredient count. It
uses the source-controlled seed and generated recipe data entirely in memory;
no database is required and production KNN behavior is unchanged.

```powershell
npm.cmd run evaluate:knn --prefix server
npm.cmd run benchmark:knn --prefix server
```

The methodology, measured quality results, benchmark environment, limitations,
and reproduction commands are documented in `docs/knn-evaluation.md`.

## API Endpoints

GET /api/v1/health

GET /api/v1/health/database

POST /api/v1/recommendations

- Requires authentication for USER and ADMIN accounts.
- Accepts 1–50 ingredient strings.
- Accepts an optional recommendation limit from 1–20 (default 5).
- Returns recognized and unknown ingredients separately.

## Deployment

The backend is prepared for Render through render.yaml.

Never commit real .env files or database credentials.
