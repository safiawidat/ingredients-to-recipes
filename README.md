# Ingredients to Recipes

Ingredients to Recipes is a full-stack university project that helps signed-in
users find published recipes from ingredients they already have. It also
provides favorites, recommendation history, a temporary shopping list, and
ADMIN workflows for recipes, canonical ingredients, aliases, and controlled
JSON imports.

## Architecture and stack

The repository is a modular monolith:

- `client/`: React 19, TypeScript, Vite, React Router, and Vitest.
- `server/`: Node.js 22, Express 5, TypeScript, Prisma, PostgreSQL, Zod, and
  Vitest.
- `server/src/app/routes`, `controllers`, `services`, and `repositories`:
  backend HTTP, application, and persistence layers.
- `server/prisma/`: schema, migration, deterministic seed, controlled dataset
  generator, and dataset tests.
- `sample-data/`: two committed controlled-recipe JSON batches.
- `server/evaluation/`: evaluation-only KNN quality and performance tooling.
- `docs/`: development, architecture, import-closeout, and KNN evaluation
  documentation.
- `render.yaml`: single Render Web Service configuration for the compiled API
  and React frontend.

The REST API is mounted under `/api/v1`. PostgreSQL is the persistence
authority; recommendation ranking remains a pure service behind the API.

## Local prerequisites

- Node.js 22 (`.nvmrc` and package engine declarations are authoritative)
- npm
- PostgreSQL

Install the locked client and server dependencies:

```powershell
npm.cmd run install:all
```

## Environment setup

Copy the templates without committing the resulting `.env` files:

```powershell
Copy-Item client/.env.example client/.env
Copy-Item server/.env.example server/.env
```

The client uses `VITE_API_BASE_URL`, which should include the `/api/v1` base
path. Local development sets it to `http://localhost:3000/api/v1`; a production
build without an explicit value uses the same-origin `/api/v1` path. The server
requires `DATABASE_URL` and a `JWT_SECRET` of at least 32 characters. Its
remaining runtime settings are documented in
`server/.env.example`: `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `JWT_EXPIRES_IN`,
`AUTH_COOKIE_NAME`, `AUTH_COOKIE_SECURE`, and `AUTH_COOKIE_SAME_SITE`.

Never commit secrets, credentials, real database URLs, or production cookie
values.

## Database setup

Generate Prisma Client and apply the committed migration:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
```

For local development only, the guarded deterministic seed can populate 60
canonical ingredients, 30 aliases, and the original 30 recipes:

```powershell
$env:ALLOW_DATABASE_SEED = 'true'
npm.cmd run db:seed
Remove-Item Env:ALLOW_DATABASE_SEED
```

The normal `db:seed` command is blocked when `NODE_ENV=production`. It upserts
the controlled seed records without deleting unrelated data. Do not run
migrations or seed/import commands against a database until the target has
been verified.

For the one-time controlled deployment baseline only, the dedicated CLI command
can authorize the same seed implementation in production:

```powershell
$env:ALLOW_PRODUCTION_DATABASE_INITIALIZATION = 'true'
npm.cmd run db:init:deployment
Remove-Item Env:ALLOW_PRODUCTION_DATABASE_INITIALIZATION
```

The deployment command remains disabled unless that exact flag is present. It
is never part of application startup, creates no users, and imports neither of
the generated 235-recipe batches. A successful run verifies 60 ingredients,
30 aliases, 30 recipes (27 published and 3 unpublished), and 212 recipe
ingredient relationships.

## Development and verification commands

Run the API and client in separate terminals:

```powershell
npm.cmd run dev:server
npm.cmd run dev:client
```

Available root checks mirror the scripts in `package.json`:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run check
```

`npm.cmd run check` runs lint, typechecking, all client/server tests, and both
production builds.

## Implemented application behavior

### Authentication

Registration creates a `USER`. Login issues a signed JWT through a
credentialed HTTP-only cookie, logout clears it, and protected requests reload
the current database role before authorization. Both `USER` and `ADMIN` can
use normal authenticated features; ADMIN routes additionally require the
current `ADMIN` role.

### Recipes and administration

Authenticated users can browse paginated published recipes and open recipe
details. ADMIN users can list all recipes, create recipes, and update existing
recipes, including their ingredient relationships and publication state.
Recipe browsing does not currently provide search.

### Ingredients and aliases

Recipes reference canonical ingredients. ADMIN users can list the canonical
vocabulary and manage normalized aliases used during ingredient resolution.
Aliases cannot duplicate another alias or collide with a canonical ingredient
name.

### Recommendations and filters

Recommendations recognize canonical ingredient names and aliases, then rank
only published recipes. Filters for cuisine, maximum preparation time, dietary
type, and allergens to exclude are applied before KNN ranking.

For each eligible recipe:

- `score = matched ingredient count / recipe ingredient count`
- `distance = 1 - score`
- zero-overlap recipes are excluded
- extra user ingredients do not reduce the score
- ties are resolved deterministically by missing count, matched count, recipe
  name, and recipe ID

The production engine and evaluation tooling are separate. See
`docs/knn-evaluation.md` for the evaluation methodology and measured results.

### Favorites and recommendation history

Authenticated users can add/remove favorites and view their own favorites.
Successful recommendation runs store user-owned history containing the input,
filters, recognized/unknown ingredients, result IDs, and summary metadata;
users can revisit a history entry to prefill the recommendation form.

### Temporary shopping list

The shopping list is generated from a recommendation's missing ingredients.
It is client-only, temporary, and passed through React Router route state; it
is not persisted to PostgreSQL. Checkbox state and manual add/remove actions
remain local to that page/session state.

## Controlled recipe importer and dataset

An ADMIN can select a local JSON file at `/admin/recipes/import`. The client
parses it and sends the JSON body to `POST /api/v1/admin/recipes/import`. The
server validates the whole batch, resolves canonical ingredients/aliases, and
writes valid nonduplicate recipes transactionally. Unknown ingredients or
invalid records reject the batch before writes; normalized recipe-name
duplicates are reported and skipped.

The repository commits two deterministic importer-ready batches of 235 recipes
each:

- `sample-data/controlled-recipes-batch-01.json`
- `sample-data/controlled-recipes-batch-02.json`

The verified local import closeout produced:

| Record | Count |
| --- | ---: |
| Recipes | 500 |
| Published recipes | 487 |
| Unpublished recipes | 13 |
| Canonical ingredients | 60 |
| Aliases | 30 |
| RecipeIngredient rows | 3,428 |

Committing the files does not populate a local or deployed database.
Local import was verified separately; Render or any other production database
must be provisioned and imported independently. See
`docs/controlled-dataset-import.md` for the sanitized closeout evidence.

Dataset generation and validation do not write to PostgreSQL:

```powershell
npm.cmd run dataset:generate --prefix server
npm.cmd run dataset:test --prefix server
```

## KNN evaluation and benchmarking

Evaluation-only commands operate on source-controlled data in memory and do
not change the production engine or database:

```powershell
npm.cmd run test:knn-evaluation --prefix server
npm.cmd run evaluate:knn --prefix server
npm.cmd run benchmark:knn --prefix server
```

## API overview

### Public routes

- `GET /api/v1/health`: shallow process health check.
- `GET /api/v1/health/database`: database connectivity check.
- `POST /api/v1/auth/register`: register a USER account.
- `POST /api/v1/auth/login`: create the authentication cookie.
- `POST /api/v1/auth/logout`: clear the authentication cookie.

### Authenticated routes

- `GET /api/v1/auth/me`: current safe user profile.
- `GET /api/v1/recipes` and `GET /api/v1/recipes/:id`: published recipe
  browsing and details.
- `POST /api/v1/recommendations`: filtered ingredient-based recommendations.
- `GET /api/v1/favorites`, `PUT /api/v1/favorites/:recipeId`, and
  `DELETE /api/v1/favorites/:recipeId`: user-owned favorites.
- `GET /api/v1/recommendation-history`: user-owned recommendation history.

### ADMIN routes

- `GET /api/v1/admin/recipes`, `POST /api/v1/admin/recipes`, and
  `PATCH /api/v1/admin/recipes/:id`: recipe management.
- `POST /api/v1/admin/recipes/import`: controlled JSON recipe import.
- `GET /api/v1/admin/ingredients`: canonical ingredient listing.
- `GET /api/v1/admin/ingredient-aliases`,
  `POST /api/v1/admin/ingredient-aliases`,
  `PATCH /api/v1/admin/ingredient-aliases/:id`, and
  `DELETE /api/v1/admin/ingredient-aliases/:id`: alias management.

## Deployment overview

`render.yaml` configures one full-stack Render Web Service. The repository-root
build installs locked client and server dependencies with build-time dev tools
explicitly included, builds the Vite client, generates Prisma Client, and
compiles the Express server. Startup applies committed migrations before
starting Express.

In production, Express serves `client/dist`: `/api/v1/*` remains the JSON API,
static assets are served directly, and all other application routes fall back
to `index.html` for React Router. The client defaults to same-origin `/api/v1`,
so no separate frontend service or custom domain is required. Local development
continues to run Vite and Express separately with an explicit localhost client
API base URL.

Phase 7 deployment must configure:

- Service: `DATABASE_URL`, a strong `JWT_SECRET`, `NODE_ENV=production`, the
  service's own HTTPS origin as `CORS_ORIGIN`, and any non-default cookie/JWT
  settings. `VITE_API_BASE_URL` is not required for the same-origin build.
- Database: manually create one Render PostgreSQL database in the service's
  region and use its internal URL. Startup applies committed migrations, but a
  Git deployment does not populate application data.
- Initialization: after verifying the empty target, run the guarded
  `db:init:deployment` command once with its explicit authorization flag.
- Administration: register the intended account normally, then provision its
  ADMIN role through a separate controlled one-time database operation.
- Dataset: after ADMIN verification, upload both committed JSON batches through
  the deployed ADMIN importer; imports never run during deploy or startup.
- Monitoring: Render's shallow health path is `/api/v1/health`; use
  `/api/v1/health/database` when database readiness must be checked explicitly.

The single service is same-origin. The existing host-only, HTTP-only,
`SameSite=Lax` authentication cookie becomes Secure in production and works
without cross-site cookie or CSRF changes. `CORS_ORIGIN` remains narrowly set
for the service origin in production and preserves the configured Vite origin
for local development.

## Known limitations

- `Recipe.name` is not database-unique. Sequential importer duplicate handling
  is tested, but a concurrent duplicate-import race is not prevented by a
  database uniqueness constraint.
- Recipe browsing is paginated but has no search.
- The shopping list is temporary and client-only.
- The API currently has no rate limiting.
- A production database must be independently migrated, provisioned, seeded or
  imported according to the chosen deployment plan.
- Broader accessibility review and polish remain future work; no broad UI or
  accessibility refactor is included in this submission-hygiene chunk.
