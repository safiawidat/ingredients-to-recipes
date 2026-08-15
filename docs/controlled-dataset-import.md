# Controlled Recipe Dataset Import

## Environment

- Git baseline: `e7f895d`
- Branch during execution: `feature/controlled-dataset-import`
- Database provider: PostgreSQL
- Environment: local development PostgreSQL
- Database: `ingredients_to_recipes`
- Schema: `public`
- Import path: existing ADMIN recipe-import UI/API
- Date: 2026-08-14

This document records the controlled dataset import into the verified local
development database. It does not claim that the Render or other deployed
PostgreSQL database has been populated. No credentials or database connection
strings are included.

## Pre-Import State

The local database was confirmed to contain only the controlled seed baseline:

| Record | Count |
| --- | ---: |
| Ingredient | 60 |
| IngredientAlias | 30 |
| Recipe | 30 |
| Published Recipe | 27 |
| Unpublished Recipe | 3 |
| RecipeIngredient | 212 |
| Users | 2 |
| ADMIN users after controlled provisioning | 1 |

All 30 expected seed recipes were present. No generated controlled recipes
were present, and no unexpected recipe-name collisions were found before the
import.

## ADMIN Preparation

The recipe importer requires ADMIN authorization. The local database initially
had no ADMIN user, so one existing local development user was explicitly
promoted from USER to ADMIN. The controlled mutation changed only the role
column.

Because the role is embedded in the authentication JWT, the user logged out and
logged in again after provisioning. ADMIN authorization was then verified
through the existing protected admin recipes endpoint before either dataset
batch was submitted.

## Dataset Contract

The controlled data contract was:

| Dataset portion | Recipes | Published | Unpublished | RecipeIngredient relations |
| --- | ---: | ---: | ---: | ---: |
| Seed baseline | 30 | 27 | 3 | 212 |
| Generated controlled dataset | 470 | 460 | 10 | 3,216 |
| Expected combined dataset | 500 | 487 | 13 | 3,428 |

The ingredient vocabulary remained fixed at 60 canonical ingredients and 30
aliases. The generated dataset was split into two importer-ready batches:

- Batch 1: 235 recipes and 1,613 RecipeIngredient relations
- Batch 2: 235 recipes and 1,603 RecipeIngredient relations

## Batch 1 Result

The ADMIN importer reported:

| Result | Count |
| --- | ---: |
| Received | 235 |
| Imported | 235 |
| Skipped duplicates | 0 |

Post-batch-1 database verification produced:

| Record | Count |
| --- | ---: |
| Recipe | 265 |
| Published Recipe | 257 |
| Unpublished Recipe | 8 |
| RecipeIngredient | 1,825 |
| Ingredient | 60 |
| IngredientAlias | 30 |

This matched the expected intermediate checkpoint exactly.

## Batch 2 Result

The ADMIN importer reported:

| Result | Count |
| --- | ---: |
| Received | 235 |
| Imported | 235 |
| Skipped duplicates | 0 |

Final database verification produced:

| Record | Count |
| --- | ---: |
| Recipe | 500 |
| Published Recipe | 487 |
| Unpublished Recipe | 13 |
| RecipeIngredient | 3,428 |
| Ingredient | 60 |
| IngredientAlias | 30 |

This matched the expected controlled dataset exactly.

## Sequential Idempotency Verification

Batch 1 was submitted again after both batches were present. The importer
reported:

| Result | Count |
| --- | ---: |
| Received | 235 |
| Imported | 0 |
| Skipped duplicates | 235 |

Every recipe in the tested batch was recognized as already existing, and the
recipe count remained 500. This demonstrates sequential rerun idempotency for
the tested batch. It does not establish concurrent-import safety.

## Normal Recipe Flow Smoke Test

The imported, published recipe **Herbed Tomato Paste and Chicken Breast Pasta**
was verified through the normal application recipe-detail flow.

Verified metadata:

- Cuisine: Italian-inspired
- Preparation: 20 minutes
- Servings: 4
- Diet: dairy-free
- Allergens: gluten

Verified structured ingredients:

- chicken breast
- pasta
- tomato
- vegetable broth
- olive oil
- tomato paste

The normal frontend recipe-detail route displayed the recipe description,
metadata, structured ingredients, and instructions.

## Recommendation Smoke Test

The recommendation request used:

- chicken breast
- pasta
- tomato
- vegetable broth
- olive oil
- tomato paste

**Herbed Tomato Paste and Chicken Breast Pasta** ranked first with a 100% match,
6 of 6 matched ingredients, and 0 missing ingredients. This verifies that an
imported published recipe participates normally in the database-backed KNN
recommendation flow.

## Filter Smoke Test

Using the same ingredient input, the following filters were applied:

- Cuisine: Italian-inspired
- Maximum preparation time: 30 minutes
- Dietary type: dairy-free
- Allergen exclusion: none

The exact imported recipe remained first with a 100% match. Every recipe in the
returned top five had Italian-inspired cuisine, a preparation time of no more
than 30 minutes, and the dairy-free diet tag. This was a smoke check and does
not replace the automated recommendation-filter test suite.

## Automated Evidence

Relevant verification was already integrated and passing before the operational
database import:

- controlled dataset tests
- importer validation, authorization, transaction, and duplicate-handling tests
- recommendation and KNN tests
- recommendation filter tests
- the full lint, typecheck, test, and build gate

The import itself did not change application or algorithm behavior.

## Important Limitations

- This import was performed against the verified local PostgreSQL database.
- Render or any other deployed PostgreSQL database must be independently
  audited and imported later.
- Database contents are operational state and are not stored in Git.
- Generated recipe text is controlled project data, not scraped external data.
- The importer is sequentially idempotent through normalized recipe-name
  duplicate handling.
- Concurrent duplicate imports are not claimed safe because `Recipe.name` is
  not unique at the database level.
- No KNN algorithm behavior changed during this operation.
- No schema or migration was required.

## Reproducibility

A clean environment can reproduce the controlled import at a high level:

1. Migrate and verify the database schema.
2. Seed the controlled baseline.
3. Provision ADMIN access securely for that environment.
4. Verify the 30-recipe seed baseline.
5. Import batch 01 through the existing ADMIN importer.
6. Verify the intermediate counts.
7. Import batch 02.
8. Verify the final counts.
9. Rerun batch 01 and confirm that all recipes are skipped as duplicates.
10. Smoke-test normal recipe browsing, recommendations, and filters.

Environment-specific secrets and one-off privileged mutation commands must not
be recorded in project documentation.
