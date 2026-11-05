// StudySpot front end. Talks to the serverless API in /api (PostgreSQL behind it).
type Role = "student" | "admin";
interface Me { id: number; email: string; role: Role }
interface Space { id: number; name: string; type: "Quiet" | "Group"; location: string; total: number; open: number; wifi: boolean; outlets: boolean; updated_at: string }
interface Reply { ok: boolean; data: { error?: string; user?: Me | null; space?: Space; spaces?: Space[] } }

const STALE_MIN = 30, POLL_MS = 5000;
let me: Me | null = null;
let current = "spaces";
let spaces: Space[] = [];
let seq = 0, timer = 0;

async function api(path: string, method = "GET", body?: unknown): Promise<Reply> {
  try {
    const r = await fetch(path, {
      method, credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: "Network error. Check your connection and try again." } };
  }
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c] as string));
const val = (id: string): string => ($(id) as HTMLInputElement).value;
const checked = (id: string): boolean => ($(id) as HTMLInputElement).checked;
function say(id: string, msg: string, ok = false): void {
  const el = $(id); el.textContent = msg; el.hidden = msg === ""; el.className = "msg " + (ok ? "ok" : "err");
}
function ago(iso: string): string {
  const m = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  return m < 1 ? "just now" : m < 60 ? m + " min ago" : Math.floor(m / 60) + " h ago";
}
const view = $("view"), hdr = $("hdr"), nav = $("nav"), navBtn = $("navBtn");

function renderNav(): void {
  const link = (h: string, t: string): string => `<a href="#${h}"${current === h ? ' aria-current="page"' : ""}>${t}</a>`;
  nav.innerHTML = link("spaces", "Study spaces") +
    (me ? (me.role === "admin" ? link("admin", "Admin") : "") + `<span class="who">${esc(me.email)} (${me.role})</span><button type="button" id="out" class="btn ghost">Log out</button>`
        : link("login", "Log in") + link("register", "Register"));
  const out = document.getElementById("out");
  if (out) out.onclick = async () => { await api("/api/auth/logout", "POST"); me = null; location.hash = "#spaces"; route(); };
}
function setNav(open: boolean): void {
  hdr.classList.toggle("open", open);
  navBtn.setAttribute("aria-expanded", String(open));
  navBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

/* ---------- Study spaces: search, filters, live seats ---------- */
function viewSpaces(): void {
  view.innerHTML = `<h1>Find a study space</h1><p class="lead">See how many seats are open right now.</p>
  <form id="filters" class="filters" role="search" aria-label="Search study spaces">
    <label class="grow">Search<input id="q" type="search" placeholder="Name, type or location" autocomplete="off"></label>
    <label>Type<select id="ft"><option value="">All</option><option>Quiet</option><option>Group</option></select></label>
    <fieldset><legend>Needs</legend><label class="chk"><input type="checkbox" id="fw"> Wi-Fi</label><label class="chk"><input type="checkbox" id="fo"> Power outlets</label></fieldset>
  </form>
  <p id="count" class="muted" aria-live="polite"></p><div id="list" class="grid"><p class="empty">Loading study spaces…</p></div>`;
  $("filters").addEventListener("input", () => { clearTimeout(timer); timer = window.setTimeout(() => void renderList(), 250); });
  $("filters").addEventListener("submit", e => e.preventDefault());
  void renderList();
}
async function renderList(): Promise<void> {
  if (!document.getElementById("list")) return;
  const mine = ++seq;
  const p = new URLSearchParams({ q: val("q").trim(), type: val("ft") });
  if (checked("fw")) p.set("wifi", "1");
  if (checked("fo")) p.set("outlets", "1");
  const r = await api("/api/spaces?" + p.toString());
  if (mine !== seq || !document.getElementById("list")) return;
  if (!r.ok) { $("list").innerHTML = `<p class="empty">${esc(r.data.error ?? "Could not load study spaces.")}</p>`; $("count").textContent = ""; return; }
  const hits = r.data.spaces ?? [];
  $("count").textContent = hits.length === 0 ? "" : `${hits.length} ${hits.length === 1 ? "space" : "spaces"} shown`;
  $("list").innerHTML = hits.length === 0 ? '<p class="empty">No study spaces found</p>' : hits.map(s => {
    const full = s.open === 0, stale = (Date.now() - Date.parse(s.updated_at)) / 60000 > STALE_MIN;
    const pct = Math.round((s.open / s.total) * 100);
    return `<article class="card"><div class="row"><h2>${esc(s.name)}</h2><span class="badge">${s.type}</span></div>
      <p class="muted">${esc(s.location)}</p>
      <p class="seats"><strong>${s.open}</strong> of ${s.total} seats open ${full ? '<span class="badge full">Full</span>' : ""}</p>
      <div class="bar" role="img" aria-label="${pct} percent of seats open"><span style="width:${pct}%"></span></div>
      <p class="muted small">Updated ${ago(s.updated_at)}${stale ? ' <span class="warn">Count may be out of date</span>' : ""}</p>
      <p class="tags">${[s.wifi ? "Wi-Fi" : "", s.outlets ? "Power outlets" : ""].filter(Boolean).join(" · ") || "No Wi-Fi or outlets"}</p></article>`;
  }).join("");
}

/* ---------- Register and log in ---------- */
function viewRegister(): void {
  view.innerHTML = `<h1>Create your account</h1><form id="rf" class="panel" novalidate>
    <label>University email<input id="re" type="email" autocomplete="email" required placeholder="name@university.edu"></label>
    <label>Password<input id="rp" type="password" autocomplete="new-password" required minlength="8"></label>
    <label>Confirm password<input id="rp2" type="password" autocomplete="new-password" required></label>
    <p class="muted small">At least 8 characters, with a letter and a number.</p>
    <p id="rerr" role="alert" hidden></p><button class="btn" type="submit">Register</button>
    <p class="muted">Already registered? <a href="#login">Log in</a></p></form>`;
  $("rf").addEventListener("submit", async e => {
    e.preventDefault();
    if (val("rp") !== val("rp2")) return say("rerr", "The two passwords do not match.");
    const r = await api("/api/auth/register", "POST", { email: val("re"), password: val("rp") });
    if (!r.ok) return say("rerr", r.data.error ?? "Registration failed.");
    me = r.data.user ?? null; location.hash = "#spaces"; route();
  });
}
function viewLogin(): void {
  view.innerHTML = `<h1>Log in</h1><form id="lf" class="panel" novalidate>
    <label>University email<input id="le" type="email" autocomplete="email" required></label>
    <label>Password<input id="lp" type="password" autocomplete="current-password" required></label>
    <p id="lerr" role="alert" hidden></p><button class="btn" type="submit">Log in</button>
    <p class="muted">New here? <a href="#register">Create an account</a></p></form>`;
  $("lf").addEventListener("submit", async e => {
    e.preventDefault();
    const r = await api("/api/auth/login", "POST", { email: val("le"), password: val("lp") });
    if (!r.ok) return say("lerr", r.data.error ?? "Login failed.");
    me = r.data.user ?? null; location.hash = "#spaces"; route();
  });
}

/* ---------- Admin: update availability ---------- */
async function renderTable(): Promise<void> {
  const t = document.getElementById("atable");
  if (!t) return;
  const r = await api("/api/spaces");
  if (!r.ok) return;
  spaces = r.data.spaces ?? [];
  t.innerHTML = "<thead><tr><th>Space</th><th>Open</th><th>Total</th><th>Updated</th></tr></thead><tbody>" +
    spaces.map(s => `<tr><td>${esc(s.name)}</td><td>${s.open}</td><td>${s.total}</td><td>${ago(s.updated_at)}</td></tr>`).join("") + "</tbody>";
}
async function viewAdmin(): Promise<void> {
  if (me?.role !== "admin") {
    view.innerHTML = '<h1>Access denied</h1><p role="alert" class="msg err">Only administrators can update availability. <a href="#login">Log in as an administrator</a>.</p>';
    return;
  }
  const r = await api("/api/spaces");
  spaces = r.data.spaces ?? [];
  view.innerHTML = `<h1>Update seat availability</h1><form id="af" class="panel" novalidate>
    <label>Study space<select id="as">${spaces.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label>
    <label>Open seats now <input id="an" type="number" min="0" step="1" inputmode="numeric" required></label>
    <p id="ahint" class="muted small"></p><p id="amsg" role="status" hidden></p>
    <button class="btn" type="submit">Save</button></form>
    <h2>All spaces</h2><div class="scroll"><table id="atable"></table></div>`;
  const pick = (): void => {
    const s = spaces.find(x => x.id === Number(val("as")));
    if (!s) return;
    ($("an") as HTMLInputElement).value = String(s.open);
    $("ahint").textContent = `Allowed range: 0 to ${s.total}`;
  };
  $("as").addEventListener("change", pick); pick(); void renderTable();
  $("af").addEventListener("submit", async e => {
    e.preventDefault();
    const res = await api("/api/spaces/" + val("as"), "PATCH", { open: Number(val("an")) });
    if (!res.ok) return say("amsg", res.data.error ?? "Update failed.");
    say("amsg", "Saved. Students see the new number within a few seconds.", true);
    await renderTable();
  });
}

/* ---------- Router and live refresh ---------- */
function route(): void {
  current = (location.hash || "#spaces").slice(1);
  if (!["spaces", "login", "register", "admin"].includes(current)) current = "spaces";
  setNav(false); renderNav();
  if (current === "login") viewLogin();
  else if (current === "register") viewRegister();
  else if (current === "admin") void viewAdmin();
  else viewSpaces();
  window.scrollTo(0, 0);
}
async function init(): Promise<void> {
  navBtn.addEventListener("click", () => setNav(!hdr.classList.contains("open")));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setNav(false); });
  nav.addEventListener("click", e => { if ((e.target as HTMLElement).closest("a")) setNav(false); });
  window.addEventListener("resize", () => { if (window.innerWidth >= 768) setNav(false); });
  window.addEventListener("hashchange", route);
  setInterval(() => {
    if (document.hidden) return;
    if (current === "spaces") void renderList();
    if (current === "admin" && me?.role === "admin") void renderTable();
  }, POLL_MS);
  me = (await api("/api/auth/me")).data.user ?? null;
  route();
}
void init();
