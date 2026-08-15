# Ingredients to Recipes client

The client is a React and TypeScript single-page application built with Vite.

From the repository root, use `npm.cmd run dev:client`; from `client/`, the
available commands are:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run test
npm.cmd run lint
```

Set `VITE_API_BASE_URL` to the API base URL including `/api/v1`; local defaults
are shown in `.env.example`. Authentication uses credentialed requests and an
HTTP-only cookie issued by the API, so the API CORS and cookie configuration
must match the frontend deployment topology.
