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
are shown in `.env.example`. When it is absent from a production build, the
client uses same-origin `/api/v1` for the single-service deployment. Local Vite
development remains explicit because it calls the API on port 3000.

Authentication uses credentialed requests and an HTTP-only cookie issued by
the API. The production React bundle and API are served by the same Express
origin; local development uses the configured credentialed CORS origin.
