// Escaneo con IA: el inicial (informe gratis) y la revisión semanal.
import {
  admin, handler, json, HttpError, requireUser, readBody, getAccount, getProfile, isActive,
  claude, parseJson, checkPaths, photoBlocks, slimScan, MODEL_VISION,
} from "./_lib/common.js";
import { SCAN_INITIAL, SCAN_WEEKLY } from "./_lib/prompts.js";

const WEEK_MS = 6 * 24 * 3600e3; // 6 días mínimo entre revisiones (margen de un día)

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const uid = user.id;
  const { kind, photos } = await readBody(request);
  if (!["initial", "weekly"].includes(kind)) throw new HttpError(400, "Tipo de escaneo no válido.");
  checkPaths(uid, photos, 3);

  const db = admin();
  const [account, profile] = await Promise.all([getAccount(uid), getProfile(uid)]);
  if (!profile?.questionnaire) throw new HttpError(400, "Primero completa el cuestionario.");
  if (!profile?.photo_consent_at) throw new HttpError(400, "Necesitamos tu consentimiento para analizar las fotos.");

  const { data: last } = await db.from("scans").select("*").eq("user_id", uid)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  let claimedFree = false;
  const releaseFree = () =>
    claimedFree && db.from("accounts").update({ free_scan_used: false }).eq("user_id", uid);

  // ----- Permisos -----
  if (kind === "initial") {
    const free = !account.free_scan_used;
    const restart = isActive(account) && account.needs_restart;
    if (!free && !restart) throw new HttpError(403, "Tu informe gratis ya está hecho.", { code: "used" });
    if (free && !restart) {
      // Reservamos el escaneo gratis ya, para que no se pueda pedir dos veces a la vez
      const { data: claimed } = await db.from("accounts").update({ free_scan_used: true })
        .eq("user_id", uid).eq("free_scan_used", false).select("user_id");
      if (!claimed?.length) throw new HttpError(409, "Ya se está analizando tu escaneo.");
      claimedFree = true;
    }
  } else {
    if (!isActive(account)) throw new HttpError(402, "La revisión semanal es parte de Ifacelis Pro.", { code: "pay" });
    if (account.needs_restart) throw new HttpError(400, "Primero haz tu nuevo escaneo inicial.");
    const { data: lastCycle } = await db.from("scans").select("created_at").eq("user_id", uid)
      .eq("cycle", account.cycle).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!lastCycle) throw new HttpError(400, "Primero haz tu escaneo inicial.");
    const next = new Date(lastCycle.created_at).getTime() + WEEK_MS;
    if (Date.now() < next)
      throw new HttpError(429, "Tu próxima revisión aún no toca.", { code: "wait", next: new Date(next).toISOString() });
  }

  try {
    return await runScan();
  } catch (e) {
    await releaseFree();
    throw e;
  }

  async function runScan() {
  // ----- IA -----
  const images = await photoBlocks(photos);
  const ctx = { cuestionario: profile.questionnaire };
  if (kind === "initial" && last) ctx.historial_anterior = { fecha: last.created_at, analisis: slimScan(last.result) };
  if (kind === "weekly") { ctx.escaneo_anterior = slimScan(last?.result); ctx.fase_actual = account.phase; }

  const text = await claude({
    model: MODEL_VISION(),
    system: kind === "initial" ? SCAN_INITIAL : SCAN_WEEKLY,
    max_tokens: 3000,
    content: [
      { type: "text", text: "Foto 1: frente" }, images[0],
      { type: "text", text: "Foto 2: lado izquierdo" }, images[1],
      { type: "text", text: "Foto 3: lado derecho" }, images[2],
      { type: "text", text: `DATOS: ${JSON.stringify(ctx)}` },
    ],
  });
  const result = parseJson(text);

  // Foto mala: no cuenta
  if (result.foto_valida === false) {
    await releaseFree();
    return json({ retry: true, foto_a_repetir: result.foto_a_repetir || "frente", motivo: result.motivo || "Repite la foto con más luz." });
  }

  const score = Math.round(Number(result.puntuacion_global)) || null;
  const { data: scan, error } = await db.from("scans")
    .insert({ user_id: uid, cycle: account.cycle, kind, photos, result, score }).select("*").single();
  if (error) throw error;
  claimedFree = false; // ya está guardado: el gratis queda gastado

  // El plan nuevo lo crea /api/plan justo después (así cada llamada es más corta)
  let planDirty = false;
  if (kind === "initial") {
    planDirty = true;
    await db.from("accounts").update({ free_scan_used: true, needs_restart: false, phase: 1, plan_dirty: true, updated_at: new Date().toISOString() }).eq("user_id", uid);
  } else {
    const coherent = result.coherente_con_historial !== false;
    const newPhase = coherent && [1, 2, 3].includes(Number(result.fase)) ? Number(result.fase) : account.phase;
    planDirty = coherent && (newPhase !== account.phase || !!result.rehacer_plan);
    await db.from("accounts").update({ phase: newPhase, ...(planDirty ? { plan_dirty: true } : {}), updated_at: new Date().toISOString() }).eq("user_id", uid);
  }

  return json({ scan, plan_dirty: planDirty });
  }
});
