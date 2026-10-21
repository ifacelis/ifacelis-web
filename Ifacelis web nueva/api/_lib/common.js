import { createClient } from "@supabase/supabase-js";
import catalog from "./catalogo.js";
import { PLAN } from "./prompts.js";

export const env = (k, fallback) => {
  const v = process.env[k];
  if (!v && fallback === undefined) throw new Error(`Falta la variable de entorno ${k}`);
  return v || fallback;
};

export const MODEL_VISION = () => env("ANTHROPIC_MODEL_VISION", "claude-sonnet-5-5");
export const MODEL_CHAT = () => env("ANTHROPIC_MODEL_CHAT", "claude-haiku-4-5-20251001");

let _admin;
export const admin = () =>
  (_admin ||= createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

// Envuelve cada función: errores controlados → respuesta JSON
export const handler = (fn) => async (request) => {
  try {
    return await fn(request);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message, ...(e.extra || {}) }, e.status);
    console.error(e);
    return json({ error: "Algo ha fallado. Inténtalo de nuevo en un momento." }, 500);
  }
};

export async function requireUser(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s*/i, "").trim();
  if (!token) throw new HttpError(401, "Inicia sesión de nuevo.");
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Inicia sesión de nuevo.");
  return data.user;
}

export async function readBody(request) {
  try { return await request.json(); } catch { throw new HttpError(400, "Petición no válida."); }
}

export async function getAccount(uid) {
  const db = admin();
  let { data } = await db.from("accounts").select("*").eq("user_id", uid).maybeSingle();
  if (!data) {
    const ins = await db.from("accounts").insert({ user_id: uid }).select("*").single();
    if (ins.error && ins.error.code !== "23505") throw ins.error;
    data = ins.data || (await db.from("accounts").select("*").eq("user_id", uid).single()).data;
  }
  return data;
}

export async function getProfile(uid) {
  const { data } = await admin().from("profiles").select("*").eq("user_id", uid).maybeSingle();
  return data;
}

export const isActive = (acc) =>
  ["active", "trialing"].includes(acc?.sub_status) &&
  (!acc.sub_period_end || new Date(acc.sub_period_end).getTime() > Date.now() - 3600e3);

// ---------- Claude ----------
export async function claude({ model, system, content, max_tokens = 4000, history = [] }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens, system, messages: [...history, { role: "user", content }] }),
  });
  if (!res.ok) {
    console.error("Anthropic", res.status, await res.text());
    throw new HttpError(502, "La IA no está disponible ahora mismo. Prueba en unos minutos.");
  }
  const data = await res.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}

export function parseJson(text) {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e < s) throw new HttpError(502, "La IA ha dado una respuesta rara. Prueba otra vez.");
  try { return JSON.parse(text.slice(s, e + 1)); }
  catch { throw new HttpError(502, "La IA ha dado una respuesta rara. Prueba otra vez."); }
}

// ---------- Fotos ----------
export function checkPaths(uid, paths, n) {
  if (!Array.isArray(paths) || paths.length !== n) throw new HttpError(400, `Hacen falta ${n} fotos.`);
  for (const p of paths)
    if (typeof p !== "string" || !p.startsWith(`${uid}/`) || p.includes("..")) throw new HttpError(400, "Foto no válida.");
}

export async function photoBlocks(paths) {
  const out = [];
  for (const p of paths) {
    const { data, error } = await admin().storage.from("faces").download(p);
    if (error || !data) throw new HttpError(400, "No encuentro una de las fotos. Vuelve a hacerla.");
    const buf = Buffer.from(await data.arrayBuffer());
    const media_type = data.type && data.type.startsWith("image/") ? data.type : "image/jpeg";
    out.push({ type: "image", source: { type: "base64", media_type, data: buf.toString("base64") } });
  }
  return out;
}

// ---------- Catálogo ----------
export const productById = (id) => catalog.find((p) => p.id === id) || null;

const ORDER = ["low", "equilibrado", "premium"];
export function filterCatalog(q = {}, budget = "equilibrado") {
  const alergias = (q.alergias || []).map((a) => String(a).toLowerCase());
  const noPerfume = alergias.some((a) => a.includes("perfum") || a.includes("fragan"));
  const edad = Number(q.edad) || 30;
  const noRetinoid = edad < 18 || ["embarazo", "lactancia"].includes(q.embarazo);
  const idx = Math.max(0, ORDER.indexOf(budget));
  const gamas = new Set([ORDER[idx], ORDER[idx + 1]].filter(Boolean)); // su gama + la siguiente por si falta algo
  const otras = alergias.filter((a) => !a.includes("perfum") && !a.includes("fragan") && a !== "ninguna" && a.length > 2);
  return catalog.filter((p) => {
    if (!gamas.has(p.gama)) return false;
    if (noPerfume && p.perfume) return false;
    if (noRetinoid && p.retinoide) return false;
    const act = (p.activos || "").toLowerCase();
    if (otras.some((a) => act.includes(a))) return false;
    return true;
  });
}

const catalogLines = (list) =>
  list.map((p) => [p.id, p.marca, p.nombre, p.tipo, p.cuando, p.activos, p.ayuda, p.piel, p.precio ?? "?", p.cantidad].join(" | ")).join("\n");

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

// Crea el plan con IA y lo guarda. Se usa tras pagar, al cambiar de fase y al cambiar presupuesto.
export async function generatePlan(uid, { account, profile, scan, phase }) {
  const budget = profile?.budget || profile?.questionnaire?.presupuesto || "equilibrado";
  const list = filterCatalog(profile?.questionnaire, budget);
  const system = PLAN.replace("{{MES}}", MESES[new Date().getMonth()]);
  const text = await claude({
    model: MODEL_VISION(),
    system,
    max_tokens: 6000,
    content: [{
      type: "text",
      text:
        `CUESTIONARIO: ${JSON.stringify(profile?.questionnaire || {})}\n` +
        `PRESUPUESTO: ${budget}\nFASE: ${phase}\n` +
        `ÚLTIMO ANÁLISIS: ${JSON.stringify(slimScan(scan?.result))}\n\n` +
        `CATÁLOGO (${list.length} productos):\n${catalogLines(list)}`,
    }],
  });
  const plan = parseJson(text);
  // Seguridad: solo productos que existen en el catálogo filtrado; añadimos sus datos
  const allowed = new Set(list.map((p) => p.id));
  for (const key of ["rutina_manana", "rutina_noche"]) {
    plan[key] = (plan[key] || []).map((s) => {
      const ok = s.producto_id && allowed.has(s.producto_id);
      return { ...s, producto_id: ok ? s.producto_id : null, producto: ok ? productById(s.producto_id) : null };
    });
  }
  plan.fase = Number(plan.fase) || phase;
  const { data, error } = await admin()
    .from("plans")
    .insert({ user_id: uid, cycle: account.cycle, phase: plan.fase, budget, plan })
    .select("*").single();
  if (error) throw error;
  return data;
}

export const slimScan = (r) =>
  r && {
    titulo: r.titulo, tipo_piel: r.tipo_piel, puntuacion_global: r.puntuacion_global,
    prioridades: r.prioridades, derivar: r.derivar,
    parametros: (r.parametros || []).map((p) => ({ id: p.id, valor: p.valor, nivel: p.nivel, zonas: p.zonas })),
  };
