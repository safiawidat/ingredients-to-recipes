# Architecture Decision

## Structure

The application uses a modular monolith:

- React and TypeScript frontend
- Node.js, Express, and TypeScript backend
- PostgreSQL database
- Prisma ORM
- REST API under `/api/v1`

## Layers

Backend features should follow three layers:

1. Routes and controllers
2. Services and business logic
3. Prisma data access

## Deployment

- Backend: Render Web Service
- Database: Render PostgreSQL
- Frontend deployment will be configured later

## Git Workflow

- `main` remains stable
- `dev` is the integration branch
- feature branches are created from `dev`
