import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pool, SPACE_COLS, fail } from "../_lib";

// GET /api/spaces?q=&type=&wifi=1&outlets=1  (search and filters run in the database)
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed." }); return; }
  try {
    const q = String(req.query.q ?? "").trim().slice(0, 80).replace(/[\\%_]/g, "\\$&");
    const type = req.query.type === "Quiet" || req.query.type === "Group" ? String(req.query.type) : "";
    const r = await pool.query(
      `SELECT ${SPACE_COLS} FROM spaces
       WHERE ($1 = '' OR (name || ' ' || type || ' ' || location) ILIKE '%' || $1 || '%')
         AND ($2 = '' OR type = $2)
         AND (NOT $3::boolean OR wifi)
         AND (NOT $4::boolean OR outlets)
       ORDER BY name`,
      [q, type, req.query.wifi === "1", req.query.outlets === "1"]
    );
    res.status(200).json({ spaces: r.rows });
  } catch (e) { fail(res, e); }
}
