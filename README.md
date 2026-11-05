# StudySpot

Campus study-space finder. TypeScript, PostgreSQL on Supabase, deployed on Vercel.

Features: register and log in (university email), search and filter study spaces,
live open-seat counts (refresh every 5 seconds), administrator seat update.
Responsive layout with a hamburger menu on small screens.

## Structure
- `public/` static site (HTML, CSS). `src/app.ts` is compiled to `public/app.js` on build.
- `api/` Vercel serverless functions (TypeScript): `auth/[action].ts`, `spaces/index.ts`, `spaces/[id].ts`.
- `db/schema.sql`, `db/seed.sql` and `scripts/setup.ts` create the tables, sample spaces and first admin.

## 1. Supabase database
1. Create a project at supabase.com and remember the database password.
2. Click **Connect** (or Project Settings, Database) and copy the **Transaction pooler** connection string (port 6543).
3. Put your password in place of `[YOUR-PASSWORD]`; URL-encode special characters.

Use the pooler string, not the direct `db.xxx.supabase.co` one. The direct connection is IPv6 only, and Vercel
functions cannot reach it. `db:setup` also turns on Row Level Security so Supabase's public API cannot read your tables.

## 2. Local setup
```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:setup          # creates tables, seeds 8 spaces, creates the admin
npm run dev               # needs the Vercel CLI: npm i -g vercel
```

## 3. Push to GitHub
```bash
git init && git add . && git commit -m "StudySpot"
git branch -M main
git remote add origin https://github.com/YOUR-USER/studyspot.git
git push -u origin main
```

## 4. Deploy on Vercel
1. Import the GitHub repo at vercel.com/new (no framework preset needed; `vercel.json` sets the build).
2. Add environment variables: `DATABASE_URL` and `JWT_SECRET` (use `openssl rand -hex 32`).
3. Deploy. Run `npm run db:setup` once from your computer (with the same `DATABASE_URL` in `.env`).

## API
| Method and path | Who | Purpose |
|---|---|---|
| `POST /api/auth/register` | anyone | create a student account |
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | anyone | session (HttpOnly cookie) |
| `GET /api/spaces?q=&type=&wifi=1&outlets=1` | anyone | search and filter |
| `PATCH /api/spaces/:id` with `{ "open": n }` | administrators | update open seats (0 to total) |

Security notes: passwords are hashed with bcrypt, SQL is parameterized, the role is checked in the database
on every request, and seat limits are enforced by a database CHECK constraint as well as the API.
