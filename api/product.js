// Cambiar un producto de la rutina: ver alternativas (por gama) y elegir otra.
import {
  admin, handler, json, HttpError, requireUser, readBody, getAccount, getProfile, isActive,
  filterCatalog, productById, describe,
} from "./_lib/common.js";

const LISTS = ["rutina_manana", "rutina_noche"];
const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const RETINOID = /retin|bakuchiol/;
const KEYS = [
  /azela/, RETINOID, /niacinam/, /vitamina c|ascorb|ascorbil/, /salicil|bha\b/, /glicol|lactic|mandel|aha\b/,
  /hialuron/, /ceramid/, /peptid/, /centella|cica\b/, /cafeina/, /urea/,
];
// Sérum, tratamiento y ampollas se usan igual: cuentan como el mismo tipo de paso
const fam = (t) => (["Sérum", "Tratamiento", "Ampollas"].includes(t) ? "tratamiento" : t);
const keyActive = (text) => { const t = norm(text); return KEYS.find((re) => re.test(t)) || null; };
const words = (t) => new Set(String(t || "").toLowerCase().split(/[,\s/]+/).filter((w) => w.length > 3));

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const uid = user.id;
  const { action, list, index, product_id } = await readBody(request);
  if (!LISTS.includes(list) || !Number.isInteger(index)) throw new HttpError(400, "Paso no válido.");

  const db = admin();
  const [account, profile] = await Promise.all([getAccount(uid), getProfile(uid)]);
  if (!isActive(account)) throw new HttpError(402, "Es parte de Ifacelis Pro.", { code: "pay" });
  const { data: row } = await db.from("plans").select("*").eq("user_id", uid).eq("cycle", account.cycle)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const step = row?.plan?.[list]?.[index];
  if (!step) throw new HttpError(404, "No encuentro ese paso.");

  // Productos compatibles con sus alergias, de cualquier gama y del mismo tipo
  const current = step.producto || null;
  const stepTipo = String(step.tipo || "").toLowerCase();
  const all = filterCatalog(profile?.questionnaire, "equilibrado", true);
  // El activo principal del paso (p. ej. "Sérum con ácido azelaico") manda: la alternativa tiene que llevarlo
  const key = keyActive(`${step.tipo || ""} ${step.activo || ""}`);
  const sameType = all.filter((p) =>
    (current ? fam(p.tipo) === fam(current.tipo) : stepTipo.includes(String(p.tipo).toLowerCase())) &&
    (!key || key.test(norm(`${p.activos} ${p.nombre}`)) || (key === RETINOID && p.retinoide)));
  const target = new Set([...words(current?.ayuda), ...words(current?.activos), ...words(step.activo)]);
  const score = (p) => [...words(p.ayuda), ...words(p.activos)].filter((w) => target.has(w)).length;

  if (action === "list") {
    const groups = { low: [], equilibrado: [], premium: [] };
    sameType
      .filter((p) => p.id !== current?.id)
      .sort((a, b) => score(b) - score(a) || (a.precio ?? 99) - (b.precio ?? 99))
      .forEach((p) => { if (groups[p.gama] && groups[p.gama].length < 4) groups[p.gama].push({ ...p, desc: describe(p) }); });
    return json({ options: groups, current: current?.id || null });
  }

  if (action === "swap") {
    const p = sameType.find((x) => x.id === product_id);
    if (!p) throw new HttpError(400, "Ese producto no encaja con este paso o con tus alergias.");
    const plan = structuredClone(row.plan);
    plan[list][index] = { ...plan[list][index], producto_id: p.id, producto: productById(p.id), cantidad: (current && current.tipo === p.tipo && plan[list][index].cantidad) || p.cantidad || plan[list][index].cantidad };
    const { error } = await db.from("plans").update({ plan }).eq("id", row.id);
    if (error) throw error;
    return json({ plan: { ...row, plan } });
  }
  throw new HttpError(400, "Acción no válida.");
});
