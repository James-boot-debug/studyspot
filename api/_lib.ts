import { Pool } from "pg";
import jwt from "jsonwebtoken";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const url = process.env.DATABASE_URL ?? "";
export const pool = new Pool({
  connectionString: url,
  max: 2,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }
});
const SECRET = process.env.JWT_SECRET ?? "";
const MAX_AGE = 60 * 60 * 24 * 7;

export interface Me { id: number; email: string; role: "student" | "admin" }
export const SPACE_COLS = "id, name, type, location, total_seats AS total, open_seats AS open, wifi, outlets, updated_at";

export function startSession(res: VercelResponse, id: number): void {
  const token = jwt.sign({ id }, SECRET, { expiresIn: MAX_AGE });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `ss_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`);
}
export function endSession(res: VercelResponse): void {
  res.setHeader("Set-Cookie", "ss_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
}
// The role is read from the database on every request, so a demoted admin loses access at once.
export async function currentUser(req: VercelRequest): Promise<Me | null> {
  const token = req.cookies?.ss_token;
  if (!token || !SECRET) return null;
  try {
    const p = jwt.verify(token, SECRET) as { id: number };
    const r = await pool.query<Me>("SELECT id, email, role FROM users WHERE id = $1", [p.id]);
    return r.rows[0] ?? null;
  } catch {
    return null;
  }
}
export function fail(res: VercelResponse, e: unknown): void {
  console.error(e);
  res.status(500).json({ error: "Server error. Please try again." });
}
