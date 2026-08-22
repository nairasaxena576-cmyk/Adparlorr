# Adparlorr

A security-awareness training simulation (task-scam / "product submission" pattern) — frontend and backend, independent of Bolt.

## Structure

- `/` (this directory) — React + Vite + TypeScript frontend
- `backend/` — Node + Express + PostgreSQL + Prisma API. See [backend/README.md](backend/README.md) for setup, environment variables, migrations, and the full API reference.

## Running the full stack locally

1. Set up and start the backend first (database, migrations, seed, dev server) — see [backend/README.md](backend/README.md).
2. In this directory, copy the frontend env file and point it at the backend:
   ```bash
   cp .env.example .env.local
   # VITE_API_URL=http://localhost:4000
   ```
3. Install and run the frontend:
   ```bash
   npm install
   npm run dev
   ```

The frontend calls the backend over `fetch` with credentials (cookie-based auth) — CORS on the backend must allow the frontend's origin (`CORS_ORIGIN` in `backend/.env`).
