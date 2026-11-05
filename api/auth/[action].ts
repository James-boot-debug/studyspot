import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { pool, currentUser, startSession, endSession, fail, type Me } from "../_lib";

const EMAIL = /^[^@\s]+@[^@\s]+\.(edu|ac)(\.[a-z]{2,})?$/;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const action = String(req.query.action);
  res.setHeader("Cache-Control", "no-store");
  try {
    if (action === "me" && req.method === "GET") { res.status(200).json({ user: await currentUser(req) }); return; }
    if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed." }); return; }
    if (action === "logout") { endSession(res); res.status(200).json({ ok: true }); return; }

    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (action === "register") {
      if (!EMAIL.test(email)) { res.status(400).json({ error: "Use your university email, for example name@university.edu or name@uni.ac.th." }); return; }
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        res.status(400).json({ error: "Password needs at least 8 characters, with a letter and a number." }); return;
      }
      try {
        const r = await pool.query<Me>(
          "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role",
          [email, await bcrypt.hash(password, 10)]
        );
        startSession(res, r.rows[0].id);
        res.status(201).json({ user: r.rows[0] });
      } catch (e) {
        if ((e as { code?: string }).code === "23505") { res.status(409).json({ error: "An account with this email already exists. Please log in." }); return; }
        throw e;
      }
      return;
    }
    if (action === "login") {
      const r = await pool.query<Me & { password_hash: string }>("SELECT id, email, role, password_hash FROM users WHERE lower(email) = $1", [email]);
      const u = r.rows[0];
      if (!u || !(await bcrypt.compare(password, u.password_hash))) { res.status(401).json({ error: "Email or password is incorrect." }); return; }
      startSession(res, u.id);
      res.status(200).json({ user: { id: u.id, email: u.email, role: u.role } });
      return;
    }
    res.status(404).json({ error: "Not found." });
  } catch (e) { fail(res, e); }
}
