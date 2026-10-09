// =====================================================================
// Ifacelis · la app (todo lo que pasa después de entrar)
// =====================================================================

const SUPABASE_URL = "https://skkgfwmenvcrfseqqyeg.supabase.co";
const SUPABASE_KEY = "sb_publishable_mYDsYNXuC769Uh8jF_SiuA_P6ejd7UF";
const PRICE_FIRST = "3,49 €";
const PRICE = "4,99 €";

const DEMO = new URLSearchParams(location.search).has("demo");
const { createClient } = DEMO ? {} : await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm");
const sb = DEMO ? null : createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
});

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const $app = document.getElementById("app");
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toLocaleDateString("sv");
const dayStr = (d) => new Date(d).toLocaleDateString("sv");
const fmtDate = (d) => new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
const fmtLong = (d) => new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let toastT;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200);
}
const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

const I = {
  scan: '<path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3"/><circle cx="12" cy="12" r="4"/>',
  home: '<path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z"/>',
  leaf: '<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
  chart: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  brush: '<path d="M18 3l3 3-9 9-3-3z"/><path d="M9 12c-3 0-5 2-5 5 0 2-1 3-2 4 4 0 8-1 9-4"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  flame: '<path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-5 1-8z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',
  bowl: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4"/>',
  run: '<circle cx="14" cy="4" r="2"/><path d="M8 21l3-6 3 2v4M6 12l3-3 4 1 3 4 3 1"/>',
  bed: '<path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10.5" r="1.5"/>',
  bottle: '<path d="M10 2h4v3l2 3v13H8V8l2-3z"/><path d="M8 13h8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/>',
  link: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
};
const icon = (n, s = 22, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;

const PARAM_NAMES = { acne: "Acné", arrugas: "Arrugas", rojez_rosacea: "Rojez · rosácea", manchas: "Manchas", poros: "Poros", ojeras: "Ojeras", hidratacion: "Hidratación", cicatrices: "Cicatrices" };
const ZONES = { frente: [150, 92], entrecejo: [150, 138], nariz: [150, 192], contorno_ojos: [150, 162], menton: [150, 296], mejilla_izquierda: [196, 218], mejilla_derecha: [104, 218], mandibula_izquierda: [188, 268], mandibula_derecha: [112, 268], sien_izquierda: [220, 132], sien_derecha: [80, 132] };
const ZONE_NAMES = { frente: "frente", entrecejo: "entrecejo", nariz: "nariz", contorno_ojos: "contorno de ojos", menton: "mentón", mejilla_izquierda: "mejilla izq.", mejilla_derecha: "mejilla dcha.", mandibula_izquierda: "mandíbula izq.", mandibula_derecha: "mandíbula dcha.", sien_izquierda: "sien izq.", sien_derecha: "sien dcha." };
const LVL_RANK = { bien: 0, leve: 1, moderado: 2, alto: 3 };
const LVL_COLOR = { bien: "#3F6B4F", leve: "#4F4578", moderado: "#C08A43", alto: "#8E3B3B" };
const PHASES = [{ n: 1, t: "Corregir" }, { n: 2, t: "Mejorar" }, { n: 3, t: "Mantener" }];
const BUDGETS = { low: { t: "Low cost", s: "Menos de 15 € por producto", sym: "€" }, equilibrado: { t: "Equilibrado", s: "Entre 15 y 35 €", sym: "€€" }, premium: { t: "Premium", s: "Más de 35 €", sym: "€€€" } };

// ---------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------
const S = { user: null, profile: null, account: null, scans: [], plan: null, logs: [], features: null, chat: null, ui: {} };
const isActive = (a = S.account) => ["active", "trialing"].includes(a?.sub_status) && (!a.sub_period_end || new Date(a.sub_period_end) > new Date(Date.now() - 3600e3));
const cycleScans = () => S.scans.filter((s) => s.cycle === S.account?.cycle);
const lastScan = () => cycleScans().at(-1) || S.scans.at(-1) || null;

// ---------------------------------------------------------------------
// Datos (Supabase) · en modo demo se sustituye por datos de ejemplo
// ---------------------------------------------------------------------
let D = {
  async session() { const { data } = await sb.auth.getSession(); return data.session; },
  async token() { const { data } = await sb.auth.getSession(); return data.session?.access_token; },
  async loadAll() {
    const uid = S.user.id;
    const [p, a, sc, pl, lg, ft] = await Promise.all([
      sb.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("accounts").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("scans").select("id,cycle,kind,photos,result,score,created_at").eq("user_id", uid).order("created_at", { ascending: true }).limit(200),
      sb.from("plans").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("daily_logs").select("*").eq("user_id", uid).order("day", { ascending: false }).limit(120),
      sb.from("features").select("*").eq("user_id", uid).maybeSingle(),
    ]);
    S.profile = p.data; S.account = a.data || { sub_status: "none", free_scan_used: false, cycle: 1, phase: 1 };
    S.scans = sc.data || []; S.plan = pl.data; S.logs = lg.data || []; S.features = ft.data;
  },
  async reloadAccount() {
    const { data } = await sb.from("accounts").select("*").eq("user_id", S.user.id).maybeSingle();
    if (data) S.account = data;
  },
  async saveProfile(patch) {
    const row = { user_id: S.user.id, ...patch, updated_at: new Date().toISOString() };
    const { data, error } = await sb.from("profiles").upsert(row).select("*").single();
    if (error) throw error; S.profile = data;
  },
  async upload(blob, name) {
    const path = `${S.user.id}/${name}`;
    const { error } = await sb.storage.from("faces").upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw error; return path;
  },
  async signed(paths) {
    if (!paths.length) return {};
    const { data } = await sb.storage.from("faces").createSignedUrls(paths, 3600);
    return Object.fromEntries((data || []).map((d) => [d.path, d.signedUrl]));
  },
  async saveLog(day, done, total) {
    const row = { user_id: S.user.id, day, done, total };
    const { error } = await sb.from("daily_logs").upsert(row);
    if (error) throw error;
  },
  async diary() {
    const { data } = await sb.from("diary").select("*").eq("user_id", S.user.id).order("created_at", { ascending: false }).limit(200);
    return data || [];
  },
  async diaryAdd(path) {
    const { error } = await sb.from("diary").insert({ user_id: S.user.id, path });
    if (error) throw error;
  },
  async chatHistory() {
    const { data } = await sb.from("chat_messages").select("role,content,created_at").eq("user_id", S.user.id).order("created_at", { ascending: false }).limit(40);
    return (data || []).reverse();
  },
  async api(path, body = {}) {
    const token = await D.token();
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    let out = {}; try { out = await res.json(); } catch {}
    if (!res.ok) { const e = new Error(out.error || "Algo ha fallado."); e.status = res.status; e.data = out; throw e; }
    return out;
  },
  async signIn(email) {
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/app/` } });
    if (error) throw error;
  },
  async verify(email, token) {
    const { data, error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    if (error) throw error; return data.session;
  },
  async signOut() { await sb.auth.signOut(); },
};

// ---------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------
async function boot() {
  if (DEMO) { const m = await import("./demo.js"); D = m.makeDemo(S, D); }
  const session = await D.session();
  S.user = session?.user || null;
  if (S.user) await D.loadAll();
  if (!DEMO) sb.auth.onAuthStateChange(async (ev, session) => {
    if (ev === "SIGNED_IN" && !S.user) { S.user = session.user; await D.loadAll(); render(); }
    if (ev === "SIGNED_OUT") { S.user = null; render(); }
  });
  const params = new URLSearchParams(location.search);
  if (params.get("pago") === "ok") S.ui.confirmingPayment = true;
  if (params.get("pago") === "cancelado") toast("Pago cancelado. Puedes hacerlo cuando quieras.");
  if (params.has("pago")) history.replaceState(null, "", location.pathname + (DEMO ? "?demo" : "") + location.hash);
  window.addEventListener("hashchange", render);
  render();
}

// ¿Qué pantalla toca obligatoriamente?
function gate() {
  if (!S.user) return "login";
  if (S.ui.confirmingPayment) return "confirmando";
  const a = S.account;
  if (isActive()) {
    if (a.needs_restart) {
      const redone = S.profile?.updated_at && new Date(S.profile.updated_at) > new Date(a.cycle_started_at);
      return redone && S.profile?.questionnaire ? "escaneo" : "cuestionario";
    }
    if (!S.profile?.questionnaire) return "cuestionario";
    if (!cycleScans().length) return "escaneo";
    if (!S.plan || S.plan.cycle !== a.cycle || a.plan_dirty) return "generando";
    return null;
  }
  if (["canceled", "unpaid", "incomplete_expired", "past_due"].includes(a.sub_status)) return "pausa";
  if (!S.profile?.questionnaire) return "cuestionario";
  if (!a.free_scan_used || !S.scans.length) return "escaneo";
  return "informe";
}

const FREE_ROUTES = new Set(["cuenta", "privacidad"]);
function render() {
  window.scrollTo(0, 0);
  const route = (location.hash.replace(/^#\/?/, "").split("?")[0] || "hoy");
  const forced = gate();
  const allowed = (S.user && FREE_ROUTES.has(route)) || (forced === "pausa" && route === "informe") || (forced === "escaneo" && route === "cuestionario" && S.ui.q);
  const screen = forced && !allowed ? forced : route;
  const fn = SCREENS[screen] || SCREENS.hoy;
  try { fn(); } catch (e) { console.error(e); $app.innerHTML = errorView(e); }
}
const errorView = (e) => `<div class="center-screen"><h2>Vaya…</h2><p>${esc(e.message || "Algo ha fallado.")}</p><button class="btn small" onclick="location.reload()">Recargar</button></div>`;

// ---------------------------------------------------------------------
// Piezas comunes
// ---------------------------------------------------------------------
function nav(active) {
  const items = [["hoy", "home", "Hoy"], ["plan", "leaf", "Plan"], ["progreso", "chart", "Progreso"], ["estilo", "brush", "Estilo"]];
  return `<nav class="nav">${items.map(([r, i, t]) => `<a href="#/${r}" class="${active === r ? "on" : ""}">${icon(i, 22, active === r ? 2.2 : 1.8)}${t}</a>`).join("")}</nav>`;
}
const fab = () => `<a class="fab" href="#/chat" aria-label="Chat con Ifacelis IA">${icon("chat", 24, 2)}</a>`;
const topbar = (right = `<a class="icon-btn" href="#/cuenta" aria-label="Mi cuenta">${icon("user", 20)}</a>`) =>
  `<div class="topbar"><a class="brand" href="#/hoy">Ifacelis</a>${right}</div>`;
const backBtn = (to = "#/hoy", label = "Volver") => `<a class="back" href="${to}">${icon("back", 18, 2.2)} ${label}</a>`;

function ring(score, size = 132, label = "DE 100") {
  const r = 56, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, score || 0));
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 132 132">
    <circle cx="66" cy="66" r="${r}" fill="none" stroke="#E8E2DA" stroke-width="10"/>
    <circle cx="66" cy="66" r="${r}" fill="none" stroke="#2B2725" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - v / 100)}"/></svg>
    <div class="val"><b>${esc(score ?? "–")}</b><span>${label}</span></div></div>`;
}

function faceMap(params = [], w = 150) {
  const zoneLvl = {};
  for (const p of params) for (const z of p.zonas || []) if (ZONES[z] && (zoneLvl[z] === undefined || LVL_RANK[p.nivel] > LVL_RANK[zoneLvl[z]])) zoneLvl[z] = p.nivel;
  const dots = Object.entries(zoneLvl).filter(([, l]) => l && l !== "bien").map(([z, l]) => {
    const [x, y] = ZONES[z];
    return `<circle cx="${x}" cy="${y}" r="15" fill="${LVL_COLOR[l]}" opacity=".18"/><circle cx="${x}" cy="${y}" r="5" fill="${LVL_COLOR[l]}"/>`;
  }).join("");
  return `<svg class="face-map" style="width:${w}px" viewBox="50 36 200 300" role="img" aria-label="Mapa de zonas de tu cara">
    <path d="M150 52 C90 52 66 104 66 178 C66 252 104 316 150 322 C196 316 234 252 234 178 C234 104 210 52 150 52 Z" fill="#EBD5D1" opacity=".55" stroke="#2B2725" stroke-width="1.4"/>
    <path d="M100 146 q16 -9 32 0 M168 146 q16 -9 32 0" fill="none" stroke="#2B2725" stroke-width="2.2" stroke-linecap="round"/>
    <ellipse cx="116" cy="164" rx="12" ry="5.5" fill="none" stroke="#2B2725" stroke-width="1.6"/><ellipse cx="184" cy="164" rx="12" ry="5.5" fill="none" stroke="#2B2725" stroke-width="1.6"/>
    <path d="M150 170 L144 212 Q150 218 158 212" fill="none" stroke="#2B2725" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M128 250 Q150 262 172 250" fill="none" stroke="#2B2725" stroke-width="2" stroke-linecap="round"/>
    ${dots}</svg>`;
}

function paramRows(params = [], { showText = true } = {}) {
  const order = Object.keys(PARAM_NAMES);
  return [...params].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)).map((p) => {
    const bar = p.id === "hidratacion" ? p.valor : p.valor; // hidratación: 100 = bien
    const zonas = (p.zonas || []).map((z) => ZONE_NAMES[z] || z).join(", ");
    return `<div class="stack" style="gap:6px">
      <div class="between"><h3>${esc(p.nombre || PARAM_NAMES[p.id] || p.id)}</h3><span class="lvl ${esc(p.nivel)}">${esc(p.nivel)}</span></div>
      <div class="bar"><i class="${esc(p.nivel)}" style="width:${Math.max(4, Math.min(100, Number(bar) || 0))}%"></i></div>
      ${showText ? `<p class="small">${esc(p.explicacion || "")}${zonas ? ` <span class="dim">· ${esc(zonas)}</span>` : ""}${p.confianza === "baja" ? ` <span class="dim">· poca fiabilidad con esta foto</span>` : ""}</p>` : ""}
    </div>`;
  }).join("<hr>");
}

const derivarBox = (r) => r?.derivar ? `<div class="notice bad"><b>Te recomendamos ver a un dermatólogo.</b><br>${esc(r.motivo_derivar || "Hay algo que conviene que revise un profesional.")}</div>` : "";
const legal = `<p class="legal">Ifacelis ofrece un análisis cosmético orientativo, no un diagnóstico médico. Ante cualquier problema persistente, consulta con un dermatólogo.</p>`;

// ---------------------------------------------------------------------
// Pantallas
// ---------------------------------------------------------------------
const SCREENS = {};

// ---------- Entrar ----------
SCREENS.login = () => {
  const st = S.ui.login || (S.ui.login = { step: "email", email: "" });
  if (st.step === "email") {
    $app.innerHTML = `<div class="page no-nav" style="justify-content:center;min-height:100dvh">
      <a class="back" href="/">${icon("back", 18, 2.2)} ifacelis.com</a>
      <div class="stack" style="gap:6px;margin-top:10px"><div class="eyebrow">Tu piel, semana a semana</div><h1>Entra en <span class="dim">Ifacelis</span></h1></div>
      <p>Sin contraseñas: te enviamos un código a tu correo. Una cuenta es para una sola persona.</p>
      <form id="f" class="stack">
        <div class="field"><label for="em">Tu correo</label><input class="input" id="em" type="email" autocomplete="email" required placeholder="tu@correo.com" value="${esc(st.email)}"></div>
        <label class="check"><input type="checkbox" id="ok" required><span>Tengo 14 años o más y acepto las <a href="/terminos.html" target="_blank">condiciones</a> y la <a href="/privacidad.html" target="_blank">política de privacidad</a>.</span></label>
        <button class="btn" id="b">Enviarme el código</button>
      </form>
      ${legal}</div>`;
    document.getElementById("f").onsubmit = async (e) => {
      e.preventDefault();
      const b = document.getElementById("b"); b.disabled = true; b.textContent = "Enviando…";
      st.email = document.getElementById("em").value.trim().toLowerCase();
      try { await D.signIn(st.email); st.step = "code"; render(); }
      catch (err) { toast(/rate|limit/i.test(err.message) ? "Demasiados intentos. Espera unos minutos." : "No se ha podido enviar. Revisa el correo."); b.disabled = false; b.textContent = "Enviarme el código"; }
    };
  } else {
    $app.innerHTML = `<div class="page no-nav" style="justify-content:center;min-height:100dvh">
      <button class="back" id="bk">${icon("back", 18, 2.2)} Cambiar correo</button>
      <h2>Mira tu correo</h2>
      <p>Hemos enviado un código a <b>${esc(st.email)}</b>. Escríbelo aquí o pulsa el enlace del correo. Si no lo ves, mira en spam.</p>
      <form id="f" class="stack"><input class="input otp" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="······" required>
      <button class="btn" id="b">Entrar</button></form>
      <button class="link-btn small" id="again">Reenviar código</button></div>`;
    document.getElementById("bk").onclick = () => { st.step = "email"; render(); };
    document.getElementById("again").onclick = async () => { try { await D.signIn(st.email); toast("Código reenviado"); } catch { toast("Espera un minuto antes de pedir otro."); } };
    document.getElementById("code").focus();
    document.getElementById("f").onsubmit = async (e) => {
      e.preventDefault();
      const b = document.getElementById("b"); b.disabled = true; b.textContent = "Entrando…";
      try {
        const session = await D.verify(st.email, document.getElementById("code").value.replace(/\D/g, ""));
        S.user = session.user; S.ui.login = null; await D.loadAll(); go("#/hoy");
      } catch { toast("Código incorrecto o caducado."); b.disabled = false; b.textContent = "Entrar"; }
    };
  }
};

// ---------- Cuestionario ----------
const Q_STEPS = [
  { id: "sexo", t: "¿Cuál es tu sexo?", s: "Las hormonas cambian cómo se comporta la piel.", type: "one", opts: [["mujer", "Mujer"], ["hombre", "Hombre"], ["otro", "Prefiero no decirlo"]] },
  { id: "edad", t: "¿Cuántos años tienes?", s: "Adaptamos los activos a tu edad.", type: "number" },
  { id: "objetivos", t: "¿Qué te gustaría mejorar?", s: "Elige todo lo que quieras. Analizaremos igualmente toda tu piel.", type: "many", opts: [["acne", "Acné y granitos"], ["arrugas", "Arrugas y líneas"], ["rojez", "Rojez o rosácea"], ["manchas", "Manchas"], ["poros", "Poros"], ["ojeras", "Ojeras"], ["hidratacion", "Hidratación"], ["cicatrices", "Cicatrices o marcas"], ["luminosidad", "Luminosidad"]] },
  { id: "alergias", t: "¿Tienes alguna alergia o intolerancia?", s: "Nunca te recomendaremos nada que la contenga.", type: "many", none: "ninguna", other: true, opts: [["ninguna", "Ninguna"], ["perfumes", "Perfumes o fragancias"], ["frutos secos", "Frutos secos"], ["marisco", "Marisco o pescado"], ["lactosa", "Lactosa"], ["gluten", "Gluten"], ["huevo", "Huevo"]] },
  { id: "embarazo", t: "¿Estás embarazada o en lactancia?", s: "Algunos activos no se recomiendan en estas etapas.", type: "one", when: (q) => q.sexo !== "hombre", opts: [["no", "No"], ["embarazo", "Embarazada"], ["lactancia", "En lactancia"]] },
  { id: "actividad", t: "¿Cuánto te mueves al día?", s: "Lo usamos para el agua y los hábitos.", type: "one", opts: [["poca", "Poco", "Trabajo sentado, poco deporte"], ["media", "Normal", "Camino o hago deporte a veces"], ["mucha", "Mucho", "Deporte casi cada día"]] },
  { id: "presupuesto", t: "¿Cuánto quieres gastar en productos?", s: "Puedes cambiarlo cuando quieras desde tu plan.", type: "one", opts: Object.entries(BUDGETS).map(([k, b]) => [k, `${b.sym} ${b.t}`, b.s]) },
];

SCREENS.cuestionario = () => {
  const st = S.ui.q || (S.ui.q = { i: 0, a: { ...(S.profile?.questionnaire || {}), presupuesto: S.profile?.budget || S.profile?.questionnaire?.presupuesto } });
  const steps = Q_STEPS.filter((s) => !s.when || s.when(st.a));
  if (st.i >= steps.length) st.i = steps.length - 1;
  const step = steps[st.i];
  const val = st.a[step.id];
  const restart = isActive() && S.account?.needs_restart;
  const editing = isActive() && !restart && S.profile?.questionnaire;

  let body = "";
  if (step.type === "number") {
    body = `<input class="input" id="num" type="number" inputmode="numeric" min="10" max="99" placeholder="Edad" value="${esc(val ?? "")}" style="font-size:22px;font-weight:700">`;
  } else {
    const sel = step.type === "many" ? new Set(val || []) : new Set(val ? [val] : []);
    body = `<div class="stack">${step.opts.map(([k, t, s]) => `<button class="option ${sel.has(k) ? "on" : ""}" data-k="${esc(k)}"><span>${esc(t)}${s ? `<span class="sub">${esc(s)}</span>` : ""}</span><span class="tick">${sel.has(k) ? icon("check", 14, 3) : ""}</span></button>`).join("")}</div>`;
    if (step.other) body += `<input class="input" id="other" placeholder="Otra (escríbela)" value="${esc(st.a.alergias_otras || "")}">`;
  }
  $app.innerHTML = `<div class="page no-nav">
    <div class="between">${st.i > 0 ? `<button class="back" id="prev">${icon("back", 18, 2.2)} Atrás</button>` : editing ? backBtn("#/cuenta") : "<span></span>"}<span class="tiny">${st.i + 1} de ${steps.length}</span></div>
    <div class="steps-bar">${steps.map((_, j) => `<span class="${j <= st.i ? "on" : ""}"></span>`).join("")}</div>
    ${restart && st.i === 0 ? `<div class="notice info">¡Bienvenida de vuelta! Empezamos de nuevo: tus respuestas pueden haber cambiado.</div>` : ""}
    <div class="stack" style="gap:6px"><h2>${esc(step.t)}</h2><p>${esc(step.s)}</p></div>
    ${body}
    <div style="flex:1"></div>
    <button class="btn" id="next">${st.i === steps.length - 1 ? (editing ? "Guardar cambios" : "Continuar") : "Siguiente"}</button>
  </div>`;

  $app.querySelectorAll(".option").forEach((b) => b.onclick = () => {
    const k = b.dataset.k;
    if (step.type === "one") st.a[step.id] = k;
    else {
      let arr = new Set(st.a[step.id] || []);
      if (step.none && k === step.none) arr = new Set([k]);
      else { arr.delete(step.none); arr.has(k) ? arr.delete(k) : arr.add(k); }
      st.a[step.id] = [...arr];
    }
    render();
  });
  const prev = document.getElementById("prev"); if (prev) prev.onclick = () => { st.i--; render(); };
  document.getElementById("next").onclick = async () => {
    if (step.type === "number") {
      const n = parseInt(document.getElementById("num").value, 10);
      if (!n || n < 10 || n > 99) return toast("Escribe tu edad.");
      if (n < 14) { $app.innerHTML = `<div class="center-screen"><h2>Ifacelis es para mayores de 14 años</h2><p>Para cuidar la piel a tu edad, lo mejor es preguntar en la farmacia o al pediatra.</p></div>`; return; }
      st.a.edad = n;
    } else if (step.other) {
      st.a.alergias_otras = document.getElementById("other").value.trim().slice(0, 80);
    }
    if (step.type !== "number" && (!st.a[step.id] || (Array.isArray(st.a[step.id]) && !st.a[step.id].length) ) && !(step.other && st.a.alergias_otras))
      return toast("Elige una opción.");
    if (st.i < steps.length - 1) { st.i++; return render(); }
    // guardar
    const a = { ...st.a };
    if (a.sexo === "hombre") a.embarazo = "no";
    const alergias = [...(a.alergias || []).filter((x) => x !== "ninguna"), ...(a.alergias_otras ? [a.alergias_otras] : [])];
    const q = { sexo: a.sexo, edad: a.edad, objetivos: a.objetivos || [], alergias, embarazo: a.embarazo || "no", actividad: a.actividad, presupuesto: a.presupuesto };
    const btn = document.getElementById("next"); btn.disabled = true;
    try {
      const prevQ = JSON.stringify(S.profile?.questionnaire || {});
      await D.saveProfile({ questionnaire: q, budget: a.presupuesto });
      S.ui.q = null;
      if (editing && prevQ !== JSON.stringify(q)) { S.ui.planReason = "answers"; return go("#/generando"); }
      go(editing ? "#/cuenta" : "#/escaneo");
    } catch (e) { toast("No se ha podido guardar. Prueba otra vez."); btn.disabled = false; }
  };
};

// ---------- Escaneo (inicial y revisión semanal) ----------
const SHOTS = [
  { id: "frente", t: "De frente", hint: "Mira a la cámara, cara dentro del óvalo" },
  { id: "izquierda", t: "Lado izquierdo", hint: "Gira la cabeza hacia tu derecha para enseñar tu mejilla izquierda" },
  { id: "derecha", t: "Lado derecho", hint: "Gira la cabeza hacia tu izquierda para enseñar tu mejilla derecha" },
];
let cam = null;
function stopCam() { if (cam) { cam.getTracks().forEach((t) => t.stop()); cam = null; } }
window.addEventListener("hashchange", stopCam);

async function shrink(fileOrCanvas) {
  let src = fileOrCanvas;
  if (fileOrCanvas instanceof Blob) {
    src = await createImageBitmap(fileOrCanvas).catch(async () => {
      const img = new Image(); img.src = URL.createObjectURL(fileOrCanvas); await img.decode(); return img;
    });
  }
  const w0 = src.width || src.videoWidth, h0 = src.height || src.videoHeight;
  const k = Math.min(1, 1280 / Math.max(w0, h0));
  const c = document.createElement("canvas"); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, "image/jpeg", 0.86));
}

function scanFlow(kind) {
  const st = S.ui.scan?.kind === kind ? S.ui.scan : (S.ui.scan = { kind, stage: S.profile?.photo_consent_at ? "tips" : "consent", shots: {}, cur: 0, retry: null });
  const weekly = kind === "weekly";
  const back = weekly ? backBtn("#/progreso") : `<button class="back" id="editq">${icon("back", 18, 2.2)} Mis respuestas</button>`;

  if (st.stage === "consent") {
    $app.innerHTML = `<div class="page no-nav">${back}
      <div class="stack" style="gap:6px"><div class="eyebrow">Antes de escanear</div><h2>Tus fotos, solo para ti</h2></div>
      <div class="card stack small">
        <div class="row">${icon("lock", 20)}<p class="small">Se guardan en una carpeta privada. Nadie más puede verlas.</p></div>
        <div class="row">${icon("scan", 20)}<p class="small">Una IA las analiza para tu informe y tu seguimiento. No hacemos reconocimiento facial.</p></div>
        <div class="row">${icon("out", 20)}<p class="small">Puedes borrar tus fotos y tu cuenta cuando quieras desde "Mi cuenta".</p></div>
      </div>
      <label class="check"><input type="checkbox" id="ok"><span>Doy mi consentimiento expreso para que Ifacelis analice las fotos de mi cara con inteligencia artificial para generar mi informe y mi seguimiento, según la <a href="/privacidad.html" target="_blank">política de privacidad</a>.</span></label>
      <div style="flex:1"></div><button class="btn" id="go">Continuar</button></div>`;
    bindEditQ();
    document.getElementById("go").onclick = async () => {
      if (!document.getElementById("ok").checked) return toast("Marca la casilla para continuar.");
      try { await D.saveProfile({ photo_consent_at: new Date().toISOString() }); st.stage = "tips"; render(); } catch { toast("No se ha podido guardar."); }
    };
    return;
  }

  if (st.stage === "tips") {
    $app.innerHTML = `<div class="page no-nav">${back}
      <div class="stack" style="gap:6px"><div class="eyebrow">${weekly ? "Revisión semanal" : "Escaneo facial"}</div><h1>3 fotos, <span class="dim">1 minuto</span></h1></div>
      <p>${weekly ? "Hazlas en el mismo sitio y con la misma luz que la última vez: así la comparación es más fiable." : "Frente y los dos lados, para ver también mejillas, mandíbula y sienes."}</p>
      <div class="stack">
        ${[["sun", "Luz de día de frente", "Junto a una ventana, sin sol directo ni contraluz."], ["drop", "Cara limpia", "Sin maquillaje ni filtros. Pelo recogido."], ["scan", "Teléfono a la altura de los ojos", "A un brazo de distancia, sin gafas."]].map(([i, t, s], j) =>
          `<div class="card row ${["tint-stone", "tint-rose", "tint-lilac"][j]}">${icon(i, 24)}<div><h3>${t}</h3><p class="small">${s}</p></div></div>`).join("")}
      </div>
      <div style="flex:1"></div>
      <button class="btn" id="go">${icon("camera", 20, 2)} Empezar</button>
      <label class="btn ghost" style="cursor:pointer">Subir fotos de la galería<input type="file" id="files" accept="image/*" multiple hidden></label>
      ${legal}</div>`;
    bindEditQ();
    document.getElementById("go").onclick = () => { st.stage = "camera"; st.cur = 0; render(); };
    document.getElementById("files").onchange = async (e) => {
      const files = [...e.target.files].slice(0, 3);
      if (files.length < 3) return toast("Elige las 3 fotos: frente, izquierda y derecha (en ese orden).");
      for (let i = 0; i < 3; i++) st.shots[SHOTS[i].id] = await shrink(files[i]);
      st.stage = "review"; render();
    };
    return;
  }

  if (st.stage === "camera") return cameraView(st);
  if (st.stage === "review") return reviewView(st);
  if (st.stage === "analyzing") return analyzingView(st);
}

function bindEditQ() { const b = document.getElementById("editq"); if (b) b.onclick = () => { S.ui.q = { i: 0, a: { ...(S.profile?.questionnaire || {}), presupuesto: S.profile?.budget } }; S.ui.scan = null; go("#/cuestionario"); }; }

async function cameraView(st) {
  const shot = SHOTS[st.cur];
  $app.innerHTML = `<div class="page no-nav">
    <div class="between"><button class="back" id="bk">${icon("back", 18, 2.2)} Atrás</button><span class="tiny">Foto ${st.cur + 1} de 3</span></div>
    <h2>${shot.t}</h2>
    <div class="cam"><video id="v" class="mirror" playsinline autoplay muted></video><div class="oval"></div><div class="hint">${shot.hint}</div><div class="count" id="cd"></div></div>
    <div class="thumbs">${SHOTS.map((s, i) => `<div class="thumb ${i === st.cur ? "cur" : ""}">${st.shots[s.id] ? `<img src="${URL.createObjectURL(st.shots[s.id])}" alt="">` : ""}<span class="lab">${s.t}</span></div>`).join("")}</div>
    <button class="btn" id="shoot">${icon("camera", 20, 2)} Hacer foto (3 s)</button>
    <label class="btn ghost" style="cursor:pointer">Usar la cámara del móvil<input type="file" id="file" accept="image/*" capture="user" hidden></label>
  </div>`;
  document.getElementById("bk").onclick = () => { stopCam(); st.stage = st.cur > 0 ? "camera" : "tips"; if (st.cur > 0) st.cur--; render(); };
  const v = document.getElementById("v");
  const next = async (blob) => {
    st.shots[shot.id] = blob;
    if (st.retry) { st.retry = null; stopCam(); st.stage = "review"; return render(); }
    const missing = SHOTS.findIndex((s) => !st.shots[s.id]);
    if (missing === -1) { stopCam(); st.stage = "review"; } else st.cur = missing;
    render();
  };
  document.getElementById("file").onchange = async (e) => { const f = e.target.files[0]; if (f) next(await shrink(f)); };
  try {
    if (!cam) cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1440 }, height: { ideal: 1920 } }, audio: false });
    v.srcObject = cam;
  } catch {
    document.querySelector(".cam").innerHTML = `<div class="center-screen" style="min-height:0;height:100%;color:#fff"><p style="color:#E8E2DA">No podemos abrir la cámara aquí. Si estás dentro de TikTok o Instagram, abre la web en Safari o Chrome, o usa el botón de abajo.</p></div>`;
    document.getElementById("shoot").disabled = true;
  }
  document.getElementById("shoot").onclick = async () => {
    const b = document.getElementById("shoot"); b.disabled = true;
    const cd = document.getElementById("cd");
    for (let n = 3; n > 0; n--) { cd.textContent = n; await sleep(800); }
    cd.textContent = "";
    if (!v.videoWidth) { b.disabled = false; return toast("La cámara aún no está lista."); }
    next(await shrink(v));
  };
}

function reviewView(st) {
  $app.innerHTML = `<div class="page no-nav">
    <h2>¿Se ven bien?</h2><p>Si alguna está borrosa u oscura, repítela.</p>
    <div class="thumbs">${SHOTS.map((s) => `<div class="stack" style="gap:6px"><div class="thumb">${st.shots[s.id] ? `<img src="${URL.createObjectURL(st.shots[s.id])}" alt="${s.t}">` : ""}<span class="lab">${s.t}</span></div><button class="btn soft small" style="width:100%" data-redo="${s.id}">Repetir</button></div>`).join("")}</div>
    ${st.error ? `<div class="notice warn">${esc(st.error)}</div>` : ""}
    <div style="flex:1"></div>
    <button class="btn" id="go">Analizar mi piel</button></div>`;
  $app.querySelectorAll("[data-redo]").forEach((b) => b.onclick = () => { st.cur = SHOTS.findIndex((s) => s.id === b.dataset.redo); st.retry = true; st.stage = "camera"; render(); });
  document.getElementById("go").onclick = () => { st.error = null; st.stage = "analyzing"; render(); };
}

async function analyzingView(st) {
  const msgs = ["Subiendo tus fotos de forma privada…", "Revisando luz y ángulos…", "Analizando frente, nariz y contorno de ojos…", "Analizando mejillas y mandíbula…", "Preparando tu informe…"];
  $app.innerHTML = `<div class="center-screen"><div style="position:relative;width:200px">${faceMap([], 200)}<div class="scanline"></div></div>
    <h2 id="am">${msgs[0]}</h2><p class="small">Tarda unos 30 segundos. No cierres la página.</p></div>`;
  let k = 0; const t = setInterval(() => { const el = document.getElementById("am"); if (el) el.textContent = msgs[Math.min(++k, msgs.length - 1)]; }, 6000);
  try {
    const stamp = Date.now();
    const paths = [];
    for (const s of SHOTS) paths.push(await D.upload(st.shots[s.id], `${st.kind}-${stamp}-${s.id}.jpg`));
    const res = await D.api("/api/scan", { kind: st.kind, photos: paths });
    clearInterval(t);
    if (res.retry) {
      const i = Math.max(0, SHOTS.findIndex((s) => s.id === res.foto_a_repetir));
      st.error = `La foto "${SHOTS[i].t}" no vale: ${res.motivo}`; delete st.shots[SHOTS[i].id];
      st.cur = i; st.retry = true; st.stage = "camera"; return render();
    }
    S.scans.push(res.scan);
    if (res.plan_dirty) S.account.plan_dirty = true;
    if (st.kind === "initial") { S.account.free_scan_used = true; S.account.needs_restart = false; S.account.phase = 1; }
    S.ui.scan = null; S.ui.lastResult = res.scan;
    go(st.kind === "weekly" ? "#/resultado" : (isActive() ? "#/generando" : "#/informe"));
  } catch (e) {
    clearInterval(t);
    if (e.data?.code === "wait") { S.ui.scan = null; toast("Tu próxima revisión aún no toca."); return go("#/progreso"); }
    st.error = e.message; st.stage = "review"; render();
  }
}
SCREENS.escaneo = () => scanFlow("initial");
SCREENS.revision = () => {
  if (!isActive()) return go("#/informe");
  const nxt = nextCheckin();
  if (nxt && nxt > new Date()) { toast(`Tu próxima revisión es el ${fmtDate(nxt)}.`); return go("#/progreso"); }
  scanFlow("weekly");
};

// ---------- Informe gratis + pago ----------
SCREENS.informe = () => {
  const scan = lastScan();
  if (!scan) return go("#/escaneo");
  const r = scan.result || {};
  const active = isActive();
  const prios = (r.prioridades || []).map((id) => PARAM_NAMES[id] || id);
  $app.innerHTML = `${active ? "" : topbar()}<div class="page ${active ? "" : "no-nav"}">
    ${active ? backBtn("#/progreso") : ""}
    <div class="stack" style="gap:6px"><div class="eyebrow">Tu informe · ${fmtLong(scan.created_at)}</div><h1>${esc(r.titulo || "Tu piel")}</h1></div>
    <div class="card big row" style="justify-content:space-between">${ring(r.puntuacion_global)}<div class="stack" style="gap:4px;align-items:flex-end;text-align:right"><span class="tiny">TIPO DE PIEL</span><b style="font-size:20px;text-transform:capitalize">${esc(r.tipo_piel || "–")}</b>${prios.length ? `<span class="tiny" style="margin-top:8px">A TRABAJAR</span><b class="small">${prios.map(esc).join(" · ")}</b>` : ""}</div></div>
    ${derivarBox(r)}
    ${r.cambio ? `<div class="notice info">${esc(r.cambio)}</div>` : ""}
    <div class="card big row" style="align-items:flex-start">${faceMap(r.parametros, 110)}<div class="stack small" style="gap:6px"><h3>Dónde lo vemos</h3>${["alto", "moderado", "leve"].map((l) => `<div class="row" style="gap:8px"><span class="swatch" style="width:12px;height:12px;background:${LVL_COLOR[l]}"></span><span class="tiny" style="text-transform:capitalize">${l}</span></div>`).join("")}</div></div>
    <div class="card big stack" style="gap:14px"><h2>Lo que vemos</h2>${paramRows(r.parametros)}</div>
    ${active ? "" : paywall(r)}
    ${legal}
  </div>`;
  const pay = document.getElementById("pay"); if (pay) pay.onclick = checkout;
};

function paywall(r) {
  return `<div class="card big tint-stone stack" style="gap:14px">
    <div class="eyebrow">${esc(r.teaser ? "Tu siguiente paso" : "Ifacelis Pro")}</div>
    <h2>${esc(r.teaser || "Tu plan para mejorarlo, paso a paso")}</h2>
    <div class="locked card"><div class="blur stack">
      <div class="row"><div class="prod-thumb">${icon("bottle")}</div><div><h3>Sérum ██████ 10%</h3><p class="small">3 gotas · noche</p></div></div>
      <div class="row"><div class="prod-thumb">${icon("bottle")}</div><div><h3>Crema ████ calmante</h3><p class="small">Un guisante · mañana</p></div></div>
      <div class="row"><div class="prod-thumb">${icon("sun")}</div><div><h3>SPF 50 ██████</h3><p class="small">Dos dedos · cada mañana</p></div></div></div>
      <div class="over">${icon("lock", 26)}<b>Tu rutina está lista para desbloquear</b></div></div>
    <div class="stack small" style="gap:8px">${["Rutina de mañana y noche con productos reales y cuánto usar", "Agua, alimentación y hábitos para tu piel", "Revisión cada semana con 3 fotos: ves lo que mejora", "Racha diaria, chat con IA y maquillaje según tus rasgos"].map((t) => `<div class="row" style="gap:10px">${icon("check", 18, 2.4)}<span>${t}</span></div>`).join("")}</div>
    <div><span class="price">${PRICE_FIRST}</span><span class="small"> el primer mes</span><p class="small">Después ${PRICE}/mes. Cancela cuando quieras.</p></div>
    <label class="check"><input type="checkbox" id="wd"><span>Quiero empezar ya y acepto las <a href="/terminos.html" target="_blank">condiciones</a>. Entiendo que, al empezar el servicio, pierdo el derecho de desistimiento de 14 días.</span></label>
    <button class="btn" id="pay">Desbloquear mi plan</button>
    <p class="tiny" style="text-align:center">Pago seguro con Stripe</p></div>`;
}

async function checkout(e) {
  const wd = document.getElementById("wd");
  if (wd && !wd.checked) return toast("Marca la casilla para continuar.");
  const b = e?.currentTarget; if (b) { b.disabled = true; b.textContent = "Abriendo el pago…"; }
  try { const { url } = await D.api("/api/checkout"); location.href = url; }
  catch (err) { toast(err.message); if (b) { b.disabled = false; b.textContent = "Desbloquear mi plan"; } }
}

SCREENS.confirmando = () => {
  $app.innerHTML = `<div class="center-screen"><div class="spinner"></div><h2>Confirmando tu pago…</h2><p class="small">Solo unos segundos.</p></div>`;
  if (S.ui.polling) return; S.ui.polling = true;
  (async () => {
    for (let i = 0; i < 20 && !isActive(); i++) { await sleep(2000); await D.reloadAccount(); }
    S.ui.polling = false; S.ui.confirmingPayment = false;
    if (isActive()) { toast("¡Bienvenida a Ifacelis Pro!"); go("#/hoy"); }
    else { $app.innerHTML = `<div class="center-screen"><h2>Tu pago está en camino</h2><p>Stripe aún no nos ha confirmado el pago. Recarga en un minuto. Si el cargo aparece en tu banco y esto no cambia, escríbenos a hola@ifacelis.com.</p><button class="btn small" onclick="location.reload()">Recargar</button></div>`; }
  })();
};

// ---------- Pausa (baja) ----------
SCREENS.pausa = () => {
  const r = lastScan()?.result || {};
  const pastDue = S.account.sub_status === "past_due";
  $app.innerHTML = `${topbar()}<div class="page no-nav">
    <div class="stack" style="gap:6px"><div class="eyebrow">${pastDue ? "Pago pendiente" : "Cuenta en pausa"}</div><h1>${pastDue ? "No hemos podido cobrar" : "Te echamos de menos"}</h1></div>
    <p>${pastDue ? "Actualiza tu tarjeta para seguir con tu plan y tu racha." : "Tu plan, tu racha, las revisiones y el chat están en pausa. Si vuelves, empiezas de nuevo: cuestionario, escaneo nuevo y plan desde la fase 1, comparando con tu última vez."}</p>
    ${r.puntuacion_global ? `<div class="card big row">${ring(r.puntuacion_global, 96)}<div><span class="tiny">TU ÚLTIMO INFORME</span><h3>${esc(r.titulo || "")}</h3><a class="small" href="#/informe">Ver resumen</a></div></div>` : ""}
    <div style="flex:1"></div>
    ${pastDue ? `<button class="btn" id="portal">Actualizar mi tarjeta</button>` : `<div><span class="price">${PRICE}</span><span class="small">/mes</span></div><label class="check"><input type="checkbox" id="wd"><span>Quiero empezar ya y acepto las <a href="/terminos.html" target="_blank">condiciones</a>. Entiendo que, al empezar el servicio, pierdo el derecho de desistimiento de 14 días.</span></label><button class="btn" id="pay">Volver a Ifacelis Pro</button>`}
    <a class="btn ghost" href="#/cuenta">Mi cuenta</a></div>`;
  const p = document.getElementById("pay"); if (p) p.onclick = checkout;
  const po = document.getElementById("portal"); if (po) po.onclick = openPortal;
};

// ---------- Creando el plan ----------
SCREENS.generando = () => {
  if (!isActive()) return go("#/informe");
  $app.innerHTML = `<div class="center-screen"><div style="position:relative;width:180px">${faceMap(lastScan()?.result?.parametros, 180)}<div class="scanline"></div></div>
    <h2 id="gm">Eligiendo tus productos…</h2><p class="small">Estamos creando tu rutina, tu alimentación y tus tareas diarias. Tarda menos de un minuto.</p></div>`;
  if (S.ui.generating) return; S.ui.generating = true;
  const msgs = ["Eligiendo tus productos…", "Calculando cuánto usar de cada uno…", "Preparando tu alimentación…", "Creando tus tareas diarias…"];
  let k = 0; const t = setInterval(() => { const el = document.getElementById("gm"); if (el) el.textContent = msgs[++k % msgs.length]; }, 7000);
  (async () => {
    try {
      const reason = S.ui.planReason || "first"; S.ui.planReason = null;
      const { plan } = await D.api("/api/plan", { reason });
      S.plan = plan; S.account.plan_dirty = false;
      clearInterval(t); S.ui.generating = false; go("#/plan");
    } catch (e) {
      clearInterval(t); S.ui.generating = false;
      $app.innerHTML = `<div class="center-screen"><h2>No hemos podido crear tu plan</h2><p>${esc(e.message)}</p><button class="btn small" id="again">Intentar de nuevo</button></div>`;
      document.getElementById("again").onclick = () => render();
    }
  })();
};

// ---------- Hoy ----------
function logFor(day) { return S.logs.find((l) => l.day === day) || { day, done: [], total: 0 }; }
const completedCount = (done) => done.filter((x) => !x.includes(":")).length;
const isComplete = (l) => l.total > 0 && completedCount(l.done) / l.total >= 0.8;
function streak() {
  const start = S.account?.cycle_started_at ? dayStr(S.account.cycle_started_at) : "0000";
  let n = 0; const d = new Date();
  if (!isComplete(logFor(today()))) d.setDate(d.getDate() - 1);
  for (;;) { const k = dayStr(d); if (k < start || !isComplete(logFor(k))) break; n++; d.setDate(d.getDate() - 1); }
  return n;
}
function nextCheckin() {
  const s = cycleScans().at(-1); if (!s) return null;
  return new Date(new Date(s.created_at).getTime() + 6 * 24 * 3600e3);
}
const TASK_STYLE = { piel: ["tint-lilac", "#4F4578", "sun"], agua: ["tint-stone", "#4A403B", "drop"], dieta: ["tint-rose", "#7A4650", "bowl"], deporte: ["tint-stone", "#4A403B", "run"], sueno: ["tint-lilac", "#4F4578", "bed"] };
function taskStyle(t) {
  if (t.id === "rutina_noche") return ["tint-lilac", "#4F4578", "moon"];
  if (t.id === "sueno") return TASK_STYLE.sueno;
  return TASK_STYLE[t.tipo] || TASK_STYLE[t.id] || ["tint-stone", "#4A403B", "check"];
}

SCREENS.hoy = () => {
  const plan = S.plan?.plan || {};
  const tasks = plan.tareas_diarias || [];
  const day = today(); const log = logFor(day);
  const vasos = Number(plan.agua?.vasos) || 8;
  const waterN = Number((log.done.find((x) => x.startsWith("agua:")) || "agua:0").split(":")[1]);
  const doneN = tasks.filter((t) => log.done.includes(t.id)).length;
  const pct = tasks.length ? Math.round((doneN / tasks.length) * 100) : 0;
  const nxt = nextCheckin(); const due = nxt && nxt <= new Date();
  const name = ["Buenos días", "Buenas tardes", "Buenas noches"][new Date().getHours() < 13 ? 0 : new Date().getHours() < 20 ? 1 : 2];
  $app.innerHTML = `${topbar()}<div class="page">
    <div class="between"><div class="stack" style="gap:2px"><div class="eyebrow">${esc(new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }))}</div><h1>${name}</h1></div>
    <div class="streak" title="Días seguidos">${icon("flame", 18, 2)} ${streak()}</div></div>
    <div class="card big tint-ink row" style="justify-content:space-between"><div class="stack" style="gap:4px"><span class="eyebrow" style="color:#CFC6BE">Hoy</span><b style="font-size:28px">${doneN} de ${tasks.length}</b><p class="small">${pct >= 80 ? "¡Día conseguido! Tu racha sigue." : "Completa al menos el 80 % para sumar a tu racha."}</p></div>${ring(pct, 84, "%").replace(/#2B2725/g, "#F6F3EF").replace(/#E8E2DA/g, "#5C534D")}</div>
    ${due ? `<a href="#/revision" class="card big tint-rose row" style="text-decoration:none">${icon("camera", 26)}<div style="flex:1"><h3>Toca tu revisión semanal</h3><p class="small">3 fotos y verás qué ha mejorado.</p></div>${icon("back", 18, 2.2).replace("M15 5l-7 7 7 7", "M9 5l7 7-7 7")}</a>` : ""}
    <div class="stack">${tasks.map((t) => {
      const [tint, col, ic] = taskStyle(t); const done = log.done.includes(t.id);
      if (t.id === "agua" || t.tipo === "agua") return `<div class="task ${tint} ${done ? "done" : ""}" style="color:${col};cursor:default"><button class="dot" data-t="${esc(t.id)}" style="color:${col};background:${done ? col : "transparent"};border-color:${col}" aria-label="Marcar">${done ? icon("check", 14, 3) : ""}</button><div style="flex:1"><div class="t-title">${esc(t.titulo)}</div><div class="t-detail">${waterN} de ${vasos} vasos</div><div class="glasses">${Array.from({ length: vasos }, (_, i) => `<button class="glass ${i < waterN ? "on" : ""}" data-g="${i + 1}" aria-label="Vaso ${i + 1}"></button>`).join("")}</div></div></div>`;
      return `<button class="task ${tint} ${done ? "done" : ""}" data-t="${esc(t.id)}" style="color:${col}"><span class="dot" style="background:${done ? col : "transparent"}">${done ? icon("check", 14, 3) : ""}</span><div style="flex:1"><div class="t-title">${esc(t.titulo)}</div><div class="t-detail">${esc(t.detalle || "")}</div></div><span style="opacity:.7">${icon(ic, 22)}</span></button>`;
    }).join("")}</div>
    ${!due && nxt ? `<p class="tiny" style="text-align:center">Próxima revisión: ${fmtDate(nxt)}</p>` : ""}
  </div>${fab()}${nav("hoy")}`;

  const save = async (done) => {
    const prev = S.logs.find((l) => l.day === day);
    const row = { day, done, total: tasks.length };
    if (prev) Object.assign(prev, row); else S.logs.unshift(row);
    render();
    try { await D.saveLog(day, done, tasks.length); } catch { toast("No se ha guardado. Revisa tu conexión."); }
  };
  $app.querySelectorAll("[data-t]").forEach((b) => b.onclick = () => {
    const id = b.dataset.t; const set = new Set(log.done);
    set.has(id) ? set.delete(id) : set.add(id);
    const wasComplete = isComplete(log);
    save([...set]).then(() => { if (!wasComplete && isComplete(logFor(day))) toast(`¡Racha de ${streak()} ${streak() === 1 ? "día" : "días"}!`); });
  });
  $app.querySelectorAll("[data-g]").forEach((b) => b.onclick = () => {
    let n = Number(b.dataset.g); if (n === waterN) n--;
    const set = new Set(log.done.filter((x) => !x.startsWith("agua:"))); set.add(`agua:${n}`);
    const aguaId = (tasks.find((t) => t.id === "agua" || t.tipo === "agua") || {}).id || "agua";
    n >= vasos ? set.add(aguaId) : set.delete(aguaId);
    save([...set]);
  });
};

// ---------- Plan ----------
SCREENS.plan = () => {
  const P = S.plan?.plan || {}; const tab = S.ui.planTab || "rutina";
  const budget = S.profile?.budget || "equilibrado";
  const stepCard = (s) => {
    const p = s.producto;
    return `<div class="card stack" style="gap:12px">
      <div class="step"><span class="n">${esc(s.paso)}</span><div class="stack" style="gap:2px;flex:1"><span class="eyebrow">${esc(s.tipo)}${s.activo ? ` · ${esc(s.activo)}` : ""}</span>
      ${p ? `<h3>${esc(p.marca)} · ${esc(p.nombre)}</h3>` : `<h3>${esc(s.tipo)}</h3><p class="small">Busca un producto de este tipo que no lleve nada de tus alergias.</p>`}</div></div>
      <div class="stack" style="gap:6px">
        <div class="kv"><b>Cantidad</b><span>${esc(s.cantidad || p?.cantidad || "")}</span></div>
        ${s.como_aplicar ? `<div class="kv"><b>Cómo</b><span>${esc(s.como_aplicar)}</span></div>` : ""}
        ${s.frecuencia ? `<div class="kv"><b>Cuándo</b><span>${esc(s.frecuencia)}</span></div>` : ""}
      </div>
      ${p ? `<div class="between"><span class="small"><b>${p.precio != null ? `≈ ${esc(String(p.precio).replace(".", ","))} €` : ""}</b> <span class="dim">${esc(p.donde || "")}</span></span>${p.enlace ? `<a class="btn ghost small" href="${esc(p.enlace)}" target="_blank" rel="noopener nofollow">Ver ${icon("link", 16, 2)}</a>` : ""}</div>` : ""}
    </div>`;
  };
  let body = "";
  if (tab === "rutina") {
    body = `<div class="stack" style="gap:8px"><span class="eyebrow">Presupuesto</span><div class="chips">${Object.entries(BUDGETS).map(([k, b]) => `<button class="chip ${budget === k ? "on" : ""}" data-b="${k}">${b.sym} ${b.t}</button>`).join("")}</div>${P.nota_presupuesto ? `<p class="tiny">${esc(P.nota_presupuesto)}</p>` : ""}</div>
      <div class="row" style="gap:8px">${icon("sun", 20)}<h2>Mañana</h2></div>${(P.rutina_manana || []).map(stepCard).join("")}
      <div class="row" style="gap:8px;margin-top:8px">${icon("moon", 20)}<h2>Noche</h2></div>${(P.rutina_noche || []).map(stepCard).join("")}
      <p class="tiny">Precios aproximados. Antes de usar un producto nuevo, pruébalo 24 h en una zona pequeña.</p>`;
  } else if (tab === "comida") {
    const A = P.alimentacion || {}; const m = A.menu_ejemplo || {};
    body = `<div class="card big tint-lilac row">${icon("drop", 28)}<div><h3>${esc(P.agua?.litros)} L de agua al día</h3><p class="small">${esc(P.agua?.vasos)} vasos de 250 ml. ${esc(P.agua?.nota || "")}</p></div></div>
      <h2>Menú de ejemplo</h2>
      ${[["desayuno", "Desayuno", "tint-stone", "sun"], ["comida", "Comida", "tint-rose", "bowl"], ["cena", "Cena", "tint-lilac", "moon"]].map(([k, t, c, i]) => m[k] ? `<div class="card ${c} row">${icon(i, 24)}<div><span class="eyebrow">${t}</span><h3>${esc(m[k])}</h3></div></div>` : "").join("")}
      <div class="grid2"><div class="card stack" style="gap:8px"><span class="eyebrow" style="color:var(--lilac-ink)">Más de esto</span>${(A.potenciar || []).map((x) => `<div><b class="small">${esc(x.alimento)}</b><p class="tiny">${esc(x.porque)}</p></div>`).join("")}</div>
      <div class="card stack" style="gap:8px"><span class="eyebrow" style="color:var(--rose-ink)">Reduce</span>${(A.reducir || []).map((x) => `<div><b class="small">${esc(x.alimento)}</b><p class="tiny">${esc(x.porque)}</p></div>`).join("")}</div></div>`;
  } else {
    body = `<div class="stack">${(P.habitos || []).map((h, i) => `<div class="card row ${["tint-stone", "tint-rose", "tint-lilac"][i % 3]}">${icon("check", 20, 2.2)}<p style="color:var(--ink);font-weight:600">${esc(h)}</p></div>`).join("")}</div>`;
  }
  $app.innerHTML = `${topbar()}<div class="page">
    <div class="stack" style="gap:4px"><div class="eyebrow">Fase ${esc(P.fase || S.account.phase)} · ${esc(P.fase_nombre || PHASES[(S.account.phase || 1) - 1].t)}</div><h1>Tu <span class="dim">plan</span></h1><p class="small">${esc(P.objetivo_fase || "")}</p></div>
    <div class="seg">${[["rutina", "Rutina"], ["comida", "Alimentación"], ["habitos", "Hábitos"]].map(([k, t]) => `<button class="${tab === k ? "on" : ""}" data-tab="${k}">${t}</button>`).join("")}</div>
    ${body}${legal}</div>${fab()}${nav("plan")}`;
  $app.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { S.ui.planTab = b.dataset.tab; render(); });
  $app.querySelectorAll("[data-b]").forEach((b) => b.onclick = async () => {
    if (b.dataset.b === budget) return;
    if (!confirm(`¿Cambiar a ${BUDGETS[b.dataset.b].t}? Rehacemos tu rutina con los mismos pasos y productos de esa gama.`)) return;
    try { await D.saveProfile({ budget: b.dataset.b }); S.ui.planReason = "budget"; go("#/generando"); } catch { toast("No se ha podido cambiar."); }
  });
};

// ---------- Progreso ----------
SCREENS.progreso = () => {
  const scans = cycleScans(); const phase = S.account.phase || 1;
  const last = scans.at(-1)?.result || {}; const nxt = nextCheckin(); const due = nxt && nxt <= new Date();
  const pts = scans.map((s) => s.score ?? s.result?.puntuacion_global).filter((x) => x != null);
  const chart = (() => {
    if (pts.length < 2) return `<p class="small">Tu gráfico aparecerá después de tu primera revisión semanal.</p>`;
    const W = 320, H = 120, n = pts.length, min = Math.max(0, Math.min(...pts) - 10), max = Math.min(100, Math.max(...pts) + 10);
    const xy = pts.map((v, i) => [12 + (i * (W - 24)) / (n - 1), H - 12 - ((v - min) / (max - min || 1)) * (H - 24)]);
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Evolución de tu puntuación"><polyline fill="none" stroke="#2B2725" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${xy.map((p) => p.join(",")).join(" ")}"/>${xy.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === n - 1 ? 5 : 3.5}" fill="${i === n - 1 ? "#2B2725" : "#fff"}" stroke="#2B2725" stroke-width="2"/>`).join("")}<text x="${xy.at(-1)[0] - 4}" y="${xy.at(-1)[1] - 10}" font-size="12" font-weight="800" text-anchor="end" fill="#2B2725">${pts.at(-1)}</text></svg>
      <div class="between tiny"><span>${fmtDate(scans[0].created_at)}</span><span>${fmtDate(scans.at(-1).created_at)}</span></div>`;
  })();
  const diff = pts.length >= 2 ? pts.at(-1) - pts[0] : null;
  $app.innerHTML = `${topbar()}<div class="page">
    <div class="stack" style="gap:4px"><div class="eyebrow">Semana ${Math.max(1, scans.length)}</div><h1>Tu <span class="dim">progreso</span></h1></div>
    <div class="phases">${PHASES.map((p) => `<div class="phase ${p.n === phase ? "on" : p.n < phase ? "done" : ""}"><span>FASE ${p.n}</span><b>${p.t}</b></div>`).join("")}</div>
    <div class="card big stack"><div class="between"><h3>Puntuación de tu piel</h3>${diff != null ? `<span class="lvl ${diff >= 0 ? "bien" : "alto"}">${diff >= 0 ? "+" : ""}${diff}</span>` : ""}</div>${chart}</div>
    ${last.mensaje ? `<div class="notice info">${esc(last.mensaje)}</div>` : ""}
    ${derivarBox(last)}
    <div class="card big ${due ? "tint-rose" : ""} stack"><span class="eyebrow">Revisión semanal · 3 fotos</span>
      <h3>${due ? "¡Ya puedes hacer tu revisión!" : nxt ? `Próxima revisión: ${fmtLong(nxt)}` : "Haz tu primera revisión"}</h3>
      <a class="btn ${due ? "" : "soft"}" href="#/revision" ${due ? "" : 'aria-disabled="true" style="pointer-events:none;opacity:.5"'}>${icon("camera", 20, 2)} Hacer revisión</a>
      <a class="small" href="#/informe">Ver mi último informe completo</a></div>
    <div class="between"><h2>Diario de fotos</h2><label class="btn small" style="cursor:pointer">${icon("plus", 18, 2.4)} Foto<input type="file" id="add" accept="image/*" capture="user" hidden></label></div>
    <p class="small">Sube fotos cuando quieras, sin límite. Toca dos para compararlas.</p>
    <div id="cmp"></div><div class="diary" id="diary"><div class="spinner"></div></div>
  </div>${fab()}${nav("progreso")}`;

  document.getElementById("add").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    toast("Guardando…");
    try { const path = await D.upload(await shrink(f), `diary-${Date.now()}.jpg`); await D.diaryAdd(path); S.ui.diary = null; render(); toast("Foto guardada"); }
    catch { toast("No se ha podido subir."); }
  };
  loadDiary();
};

async function loadDiary() {
  const box = document.getElementById("diary"); if (!box) return;
  if (!S.ui.diary) {
    const rows = await D.diary();
    const items = [...rows.map((r) => ({ path: r.path, date: r.created_at, tag: "Diario" })), ...S.scans.map((s) => ({ path: s.photos[0], date: s.created_at, tag: s.kind === "initial" ? "Inicio" : "Revisión" }))]
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const urls = await D.signed(items.map((i) => i.path));
    S.ui.diary = items.map((i) => ({ ...i, url: urls[i.path] })).filter((i) => i.url);
    S.ui.sel = [];
  }
  const items = S.ui.diary;
  if (!document.getElementById("diary")) return;
  box.innerHTML = items.length ? items.map((it, i) => `<button class="${S.ui.sel.includes(i) ? "sel" : ""}" data-i="${i}"><img src="${esc(it.url)}" alt="Foto del ${fmtDate(it.date)}" loading="lazy"><span class="d">${fmtDate(it.date)}</span></button>`).join("") : `<p class="small">Aún no hay fotos.</p>`;
  box.querySelectorAll("[data-i]").forEach((b) => b.onclick = () => {
    const i = Number(b.dataset.i); const sel = S.ui.sel;
    sel.includes(i) ? sel.splice(sel.indexOf(i), 1) : sel.push(i);
    if (sel.length > 2) sel.shift();
    loadDiary();
  });
  const cmp = document.getElementById("cmp");
  if (S.ui.sel.length === 2) {
    const [a, b] = S.ui.sel.map((i) => items[i]).sort((x, y) => new Date(x.date) - new Date(y.date));
    cmp.innerHTML = `<div class="card compare"><figure><img src="${esc(a.url)}" alt=""><figcaption>Antes · ${fmtDate(a.date)}</figcaption></figure><figure><img src="${esc(b.url)}" alt=""><figcaption>Después · ${fmtDate(b.date)}</figcaption></figure></div>`;
  } else cmp.innerHTML = "";
}

// ---------- Resultado de la revisión ----------
SCREENS.resultado = () => {
  const s = S.ui.lastResult || cycleScans().at(-1); if (!s) return go("#/progreso");
  const r = s.result || {};
  const trend = { mejor: ["bien", "Mejor"], igual: ["leve", "Igual"], peor: ["alto", "Peor"] };
  $app.innerHTML = `<div class="page no-nav">
    <div class="eyebrow">Revisión semanal · ${fmtLong(s.created_at)}</div>
    <div class="card big row" style="justify-content:space-between">${ring(r.puntuacion_global)}<div class="stack" style="gap:4px;text-align:right"><span class="tiny">FASE</span><b style="font-size:20px">${esc(PHASES[(Number(r.fase) || S.account.phase || 1) - 1].t)}</b></div></div>
    ${r.coherente_con_historial === false ? `<div class="notice warn">${esc(r.mensaje || "Este escaneo no encaja con tu historial. Recuerda que tu cuenta es personal.")}</div>` : r.mensaje ? `<div class="notice info">${esc(r.mensaje)}</div>` : ""}
    ${derivarBox(r)}
    <div class="card big stack" style="gap:12px"><h2>Esta semana</h2>${(r.cambios || []).map((c) => { const [cls, t] = trend[c.tendencia] || trend.igual; return `<div class="between"><span class="small"><b>${esc(PARAM_NAMES[c.id] || c.id)}</b> <span class="dim">${esc(c.antes)} → ${esc(c.ahora)}</span></span><span class="lvl ${cls}">${t}</span></div>`; }).join("")}</div>
    <div style="flex:1"></div>
    <button class="btn" id="go">${S.account.plan_dirty ? "Ver mi plan actualizado" : "Seguir"}</button></div>`;
  document.getElementById("go").onclick = () => { S.ui.lastResult = null; S.ui.diary = null; go(S.account.plan_dirty ? "#/generando" : "#/progreso"); };
};

// ---------- Estilo (maquillaje según rasgos) ----------
SCREENS.estilo = () => {
  const f = S.features?.result; const tab = S.ui.styleTab || "natural";
  if (!f) {
    $app.innerHTML = `${topbar()}<div class="page"><div class="stack" style="gap:4px"><div class="eyebrow">Maquillaje y grooming</div><h1>Según <span class="dim">tus rasgos</span></h1></div>
      <p>Analizamos la forma de tu cara, tu subtono, tus ojos y cejas para decirte qué te favorece: maquillaje natural, de noche, y cejas y barba.</p>
      <div style="flex:1"></div><button class="btn" id="go">Analizar mis rasgos</button></div>${fab()}${nav("estilo")}`;
    document.getElementById("go").onclick = async (e) => {
      e.currentTarget.disabled = true; e.currentTarget.textContent = "Analizando… (unos 20 s)";
      try { const { features } = await D.api("/api/rasgos"); S.features = features; render(); } catch (err) { toast(err.message); render(); }
    };
    return;
  }
  const tips = f.consejos?.[tab] || [];
  $app.innerHTML = `${topbar()}<div class="page">
    <div class="stack" style="gap:4px"><div class="eyebrow">Rostro ${esc(f.forma_rostro)} · subtono ${esc(f.subtono)}</div><h1>Tu <span class="dim">estilo</span></h1>${f.resumen ? `<p class="small">${esc(f.resumen)}</p>` : ""}</div>
    <div class="seg">${[["natural", "Natural"], ["noche", "Noche"], ["cejas_barba", "Cejas y barba"]].map(([k, t]) => `<button class="${tab === k ? "on" : ""}" data-tab="${k}">${t}</button>`).join("")}</div>
    <div class="stack">${tips.map((t, i) => `<div class="card row ${["tint-stone", "tint-rose", "tint-lilac"][i % 3]}">${t.color && /^#[0-9a-f]{3,8}$/i.test(t.color) ? `<span class="swatch" style="background:${t.color}"></span>` : icon("brush", 22)}<div><span class="eyebrow">${esc(t.categoria)}</span><p style="color:var(--ink);font-weight:600">${esc(t.texto)}</p></div></div>`).join("")}</div>
  </div>${fab()}${nav("estilo")}`;
  $app.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { S.ui.styleTab = b.dataset.tab; render(); });
};

// ---------- Chat ----------
SCREENS.chat = () => {
  if (!isActive()) return go("#/informe");
  const draw = () => {
    const list = S.chat || [];
    $app.innerHTML = `<div class="page" style="padding-bottom:110px">
      <div class="between">${backBtn("#/hoy")}<span class="tiny">Ifacelis IA</span></div>
      <div class="chat" id="msgs">
        <div class="msg assistant">Hola 👋 Soy Ifacelis IA. Conozco tu informe y tu plan: pregúntame lo que quieras sobre tu piel, tus productos o tus hábitos.</div>
        ${list.map((m) => `<div class="msg ${m.role}">${esc(m.content)}</div>`).join("")}
        ${S.ui.typing ? `<div class="msg assistant dim">Escribiendo…</div>` : ""}
      </div>
      ${list.length ? "" : `<div class="chips">${["¿Cuánto sérum me pongo?", "¿Puedo usar retinol?", "Me ha salido un granito, ¿qué hago?"].map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>`}
      <p class="legal">No sustituye a un dermatólogo. En una urgencia, llama al 112.</p>
    </div>
    <form class="composer" id="f"><input class="input" id="m" placeholder="Escribe tu pregunta…" maxlength="1000" autocomplete="off"><button class="btn" aria-label="Enviar" ${S.ui.typing ? "disabled" : ""}>${icon("send", 20, 2)}</button></form>`;
    window.scrollTo(0, document.body.scrollHeight);
    const send = async (text) => {
      if (!text || S.ui.typing) return;
      S.chat.push({ role: "user", content: text }); S.ui.typing = true; draw();
      try { const { reply } = await D.api("/api/chat", { message: text }); S.chat.push({ role: "assistant", content: reply }); }
      catch (e) { S.chat.pop(); toast(e.message); }
      S.ui.typing = false; if (location.hash.includes("chat")) draw();
    };
    document.getElementById("f").onsubmit = (e) => { e.preventDefault(); const v = document.getElementById("m").value.trim(); send(v); };
    $app.querySelectorAll("[data-q]").forEach((b) => b.onclick = () => send(b.dataset.q));
  };
  if (!S.chat) { $app.innerHTML = `<div class="center-screen"><div class="spinner"></div></div>`; D.chatHistory().then((h) => { S.chat = h; draw(); }); }
  else draw();
};

// ---------- Cuenta ----------
async function openPortal(e) {
  const b = e?.currentTarget; if (b) b.disabled = true;
  try { const { url } = await D.api("/api/portal"); location.href = url; } catch (err) { toast(err.message); if (b) b.disabled = false; }
}
SCREENS.cuenta = () => {
  const a = S.account || {}; const active = isActive();
  const status = active ? `Ifacelis Pro · ${a.sub_period_end ? `se renueva el ${fmtLong(a.sub_period_end)}` : "activa"}` : { canceled: "Cancelada", past_due: "Pago pendiente", none: "Gratis" }[a.sub_status] || a.sub_status;
  $app.innerHTML = `<div class="page no-nav">
    ${backBtn(active ? "#/hoy" : "#/")}
    <h1>Mi <span class="dim">cuenta</span></h1>
    <div class="card stack"><div class="kv"><b>Correo</b><span>${esc(S.user?.email)}</span></div><div class="kv"><b>Plan</b><span>${esc(status)}</span></div></div>
    ${a.stripe_customer_id ? `<button class="btn ghost" id="portal">Gestionar o cancelar suscripción</button>` : ""}
    ${active ? `<p class="tiny">Si cancelas, sigues teniendo acceso hasta el final del mes pagado. Si vuelves más adelante, empiezas de nuevo con un escaneo nuevo.</p>` : ""}
    ${active ? `<button class="btn ghost" id="editq">Cambiar mis respuestas</button>` : ""}
    <a class="btn ghost" href="/privacidad.html" target="_blank">Privacidad</a>
    <button class="btn ghost" id="out">${icon("out", 20)} Cerrar sesión</button>
    <div style="flex:1"></div>
    <div class="card stack" style="border-color:var(--bad-bg)"><h3>Eliminar mi cuenta y mis fotos</h3><p class="small">Se borra todo: fotos, informes, plan, racha y chat. Se cancela tu suscripción. No se puede deshacer.</p><button class="btn danger small" id="del">Eliminar todo</button></div>
    ${legal}</div>`;
  const po = document.getElementById("portal"); if (po) po.onclick = openPortal;
  const eq = document.getElementById("editq"); if (eq) eq.onclick = () => { S.ui.q = { i: 0, a: { ...(S.profile?.questionnaire || {}), presupuesto: S.profile?.budget } }; go("#/cuestionario"); };
  document.getElementById("out").onclick = async () => { await D.signOut(); S.user = null; location.href = "/"; };
  document.getElementById("del").onclick = async () => {
    const t = prompt('Para confirmar, escribe ELIMINAR');
    if (t !== "ELIMINAR") return;
    try { await D.api("/api/delete-account", { confirm: "ELIMINAR" }); await D.signOut(); alert("Tu cuenta y tus fotos se han eliminado."); location.href = "/"; }
    catch (e) { toast(e.message); }
  };
};

boot().catch((e) => { console.error(e); $app.innerHTML = errorView(e); });
