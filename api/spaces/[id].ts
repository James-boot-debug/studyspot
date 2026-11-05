import type { VercelRequest, VercelResponse } from "@vercel/node";
import { pool, SPACE_COLS, currentUser, fail } from "../_lib";

// PATCH /api/spaces/:id  body { open: number }  (administrators only)
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "PATCH") { res.status(405).json({ error: "Method not allowed." }); return; }
  try {
    const user = await currentUser(req);
    if (!user) { res.status(401).json({ error: "Please log in." }); return; }
    if (user.role !== "admin") { res.status(403).json({ error: "Refused: only administrators can update availability." }); return; }
    const id = Number(req.query.id), open = Number(req.body?.open);
    if (!Number.isInteger(id)) { res.status(400).json({ error: "Invalid space." }); return; }
    const s = await pool.query<{ total_seats: number }>("SELECT total_seats FROM spaces WHERE id = $1", [id]);
    if (s.rowCount === 0) { res.status(404).json({ error: "Space not found." }); return; }
    const total = s.rows[0].total_seats;
    if (!Number.isInteger(open) || open < 0 || open > total) { res.status(400).json({ error: `Enter a whole number from 0 to ${total}.` }); return; }
    const r = await pool.query(`UPDATE spaces SET open_seats = $1, updated_at = now() WHERE id = $2 RETURNING ${SPACE_COLS}`, [open, id]);
    res.status(200).json({ space: r.rows[0] });
  } catch (e) { fail(res, e); }
}
