# Skyline Weather

A basic full-stack weather dashboard based on the attached architecture.

## Deployment

1. Install Node.js 18+ and PostgreSQL 14+.
2. Copy `backend/.env.example` to `backend/.env` and add your OpenWeather API key and database values.
3. Set `VITE_API_URL` to `/api` when the frontend and API share a domain, or to the public API URL when they are deployed separately.
4. Create the production database and apply `database/init.sql`.
5. Run `npm install` in the root, then `npm run install:all`.
6. Build the frontend with `npm run build --prefix frontend` and deploy `frontend/dist`.
7. Deploy the backend with `npm start --prefix backend` or your hosting provider's start command.

For production, configure `PORT`, `OPENWEATHER_API_KEY`, and the hosted database values in the deployment environment. Without database configuration, history is kept in memory; without an OpenWeather key, weather requests return a setup error.
