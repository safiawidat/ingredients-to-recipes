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

npm run db:seed

## API Health Endpoints

GET /api/v1/health

GET /api/v1/health/database

## Deployment

The backend is prepared for Render through render.yaml.

Never commit real .env files or database credentials.
