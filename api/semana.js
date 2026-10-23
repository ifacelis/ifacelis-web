// Menú y hábitos de la semana (uno nuevo cada lunes), con lista de la compra.
import {
  admin, handler, json, HttpError, requireUser, getAccount, getProfile, isActive,
  claude, parseJson, slimScan, MODEL_CHAT,
} from "./_lib/common.js";
import { SEMANA } from "./_lib/prompts.js";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function mondayKey(d = new Date()) {
  const x = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const uid = user.id;
  const db = admin();
  const [account, profile] = await Promise.all([getAccount(uid), getProfile(uid)]);
  if (!isActive(account)) throw new HttpError(402, "Es parte de Ifacelis Pro.", { code: "pay" });
  const { data: row } = await db.from("plans").select("*").eq("user_id", uid).eq("cycle", account.cycle)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!row) throw new HttpError(400, "Primero necesitas tu plan.");

  const week = mondayKey();
  if (row.plan?.semana?.week === week) return json({ semana: row.plan.semana });

  const { data: scan } = await db.from("scans").select("result").eq("user_id", uid)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const A = row.plan?.alimentacion || {};
  const text = await claude({
    model: MODEL_CHAT(),
    system: SEMANA.replace("{{MES}}", MESES[new Date().getMonth()]),
    max_tokens: 5000,
    content: `CUESTIONARIO: ${JSON.stringify(profile?.questionnaire || {})}
PIEL: ${JSON.stringify(slimScan(scan?.result))}
OBJETIVO DE LA FASE: ${row.plan?.objetivo_fase || ""}
POTENCIAR: ${JSON.stringify(A.potenciar || [])}
REDUCIR: ${JSON.stringify(A.reducir || [])}`,
  });
  const semana = { ...parseJson(text), week };
  if (!Array.isArray(semana.dias) || semana.dias.length < 7) throw new HttpError(502, "Lis no ha podido preparar el menú. Prueba otra vez.");
  const plan = { ...row.plan, semana };
  await db.from("plans").update({ plan }).eq("id", row.id);
  return json({ semana });
});
