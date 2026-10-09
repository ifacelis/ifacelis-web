// Crea el plan tras pagar, o lo rehace al cambiar de presupuesto.
import {
  admin, handler, json, HttpError, requireUser, readBody, getAccount, getProfile, isActive, generatePlan,
} from "./_lib/common.js";

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const uid = user.id;
  const { reason } = await readBody(request);
  const db = admin();
  const [account, profile] = await Promise.all([getAccount(uid), getProfile(uid)]);
  if (!isActive(account)) throw new HttpError(402, "Tu plan es parte de Ifacelis Pro.", { code: "pay" });
  if (account.needs_restart) throw new HttpError(400, "Primero haz tu nuevo escaneo inicial.");

  const { data: scan } = await db.from("scans").select("*").eq("user_id", uid).eq("cycle", account.cycle)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!scan) throw new HttpError(400, "Primero haz tu escaneo.");

  const { data: current } = await db.from("plans").select("*").eq("user_id", uid).eq("cycle", account.cycle)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!["budget", "answers"].includes(reason) && current && !account.plan_dirty) return json({ plan: current });
  if (reason === "budget" && current && current.budget === profile?.budget) return json({ plan: current });

  // Freno de gasto: como mucho 6 planes nuevos al día
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { count } = await db.from("plans").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("created_at", since);
  if ((count || 0) >= 6) throw new HttpError(429, "Has cambiado mucho el plan hoy. Prueba mañana.");

  const plan = await generatePlan(uid, { account, profile, scan, phase: account.phase });
  await db.from("accounts").update({ plan_dirty: false }).eq("user_id", uid);
  return json({ plan });
});
