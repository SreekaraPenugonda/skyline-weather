# Skyline Weather

A basic full-stack weather dashboard based on the attached architecture.

## Run locally

1. Install Node.js 18+ and PostgreSQL 14+.
2. Copy `backend/.env.example` to `backend/.env` and add your OpenWeather API key and database values.
3. Copy `frontend/.env.example` to `frontend/.env` if the API runs anywhere other than `http://localhost:5000/api`.
4. Create the database and schema: `createdb weather_db` then `psql -d weather_db -f database/init.sql`.
5. Run `npm install` in the root, then `npm run install:all`.
6. Start both apps with `npm run dev`.

The frontend runs on port 5173 and the API on port 5000. Without database configuration, history is kept in memory; without an OpenWeather key, weather requests return a setup error.
