// Creates tables, seeds study spaces and creates the first administrator.
// Usage: copy .env.example to .env, fill it in, then run: npm run db:setup
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!url) throw new Error("DATABASE_URL is missing in .env");
  if (!email || password.length < 8) throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters in .env");
  const pool = new Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
  try {
    for (const f of ["schema.sql", "seed.sql"]) await pool.query(readFileSync(join(__dirname, "..", "db", f), "utf8"));
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')
       ON CONFLICT ((lower(email))) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
      [email, hash]
    );
    console.log(`Database ready. Administrator: ${email}`);
  } finally {
    await pool.end();
  }
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
