# Personal Time Tracking

A practical time tracking app designed for daily work rhythms: punch ranges, day types, balances, telework, and a clean overview. It is built to be fast to use and easy to self-host.

## Highlights
- Daily time entry with morning/afternoon splits and automatic balance calculation.
- Business rules: lunch break handling, daily caps, bonus minutes, and day-type credits.
- Multiple day types (Normal, Holiday, Vacation, Sick, Trip, RTT, Other).
- Telework tracking with weekly guidance indicator.
- Archive days and toggle archived visibility.
- Import/Export full dataset as JSON.
- Responsive UI with a focused, keyboard-friendly editing flow.

## Tech Stack
- Frontend: Vue 3, Vite, Pinia, Tailwind CSS
- Backend: Node.js, Express, Prisma
- Database: PostgreSQL
- Tooling: TypeScript, Vitest, ESLint

## Project Structure
```
backend/   # API + Prisma + business rules
frontend/  # Vue app
docker-compose.yml
```

## Local Development
Requirements: Node 20+, npm, and PostgreSQL.

Install dependencies:
```
npm ci
```

Run backend (from /backend):
```
npm run dev
```

Run frontend (from /frontend):
```
npm run dev
```

Frontend API base URL in dev:
- `frontend/.env.development` uses `VITE_API_BASE_URL=http://localhost:3000`

## Docker (Production)
The production frontend uses Nginx and proxies `/api` to the backend.

```
docker compose up -d
```

If you publish images, update `docker-compose.yml` to point to your registry tags.

## Scripts
At repo root:
```
npm run lint
npm run test
npm run build
```

## Notes
- Prisma migrations are applied on container start.
- Importing data replaces existing records (full reset).
- Archived days are hidden by default; you can toggle them in the UI.

## License
MIT License. See `LICENSE`.
