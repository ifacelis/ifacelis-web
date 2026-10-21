// Chat Ifacelis IA (solo Pro, máximo 20 mensajes al día)
import {
  admin, handler, json, HttpError, requireUser, readBody, getAccount, getProfile, isActive,
  claude, slimScan, MODEL_CHAT,
} from "./_lib/common.js";
import { CHAT } from "./_lib/prompts.js";

const DAILY_LIMIT = 20;

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const uid = user.id;
  const { message } = await readBody(request);
  const text = String(message || "").trim().slice(0, 1000);
  if (!text) throw new HttpError(400, "Escribe tu pregunta.");

  const db = admin();
  const account = await getAccount(uid);
  if (!isActive(account)) throw new HttpError(402, "El chat es parte de Ifacelis Pro.", { code: "pay" });

  const since = new Date(); since.setHours(0, 0, 0, 0);
  const { count } = await db.from("chat_messages").select("id", { count: "exact", head: true })
    .eq("user_id", uid).eq("role", "user").gte("created_at", since.toISOString());
  if ((count || 0) >= DAILY_LIMIT) throw new HttpError(429, "Has llegado a las 20 preguntas de hoy. Mañana seguimos.");

  const [profile, scanR, planR, histR] = await Promise.all([
    getProfile(uid),
    db.from("scans").select("result").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("plans").select("plan").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("chat_messages").select("role,content").eq("user_id", uid).order("created_at", { ascending: false }).limit(10),
  ]);

  const plan = planR.data?.plan;
  const slimPlan = plan && {
    fase: plan.fase_nombre, objetivo: plan.objetivo_fase,
    manana: (plan.rutina_manana || []).map((s) => `${s.tipo}${s.producto ? ` (${s.producto.marca} ${s.producto.nombre})` : ""}: ${s.cantidad}`),
    noche: (plan.rutina_noche || []).map((s) => `${s.tipo}${s.producto ? ` (${s.producto.marca} ${s.producto.nombre})` : ""}: ${s.cantidad}${s.frecuencia ? `, ${s.frecuencia}` : ""}`),
    agua: plan.agua, habitos: plan.habitos,
  };
  const system = `${CHAT}\n\nDATOS DE ESTA PERSONA\nCuestionario: ${JSON.stringify(profile?.questionnaire || {})}\nÚltimo análisis: ${JSON.stringify(slimScan(scanR.data?.result))}\nPlan actual: ${JSON.stringify(slimPlan)}`;

  // Historial alternado user/assistant empezando por user
  let history = (histR.data || []).reverse().map((m) => ({ role: m.role, content: m.content }));
  while (history.length && history[0].role !== "user") history.shift();
  history = history.filter((m, i, a) => i === 0 || m.role !== a[i - 1].role);
  if (history.length && history[history.length - 1].role === "user") history.pop();

  const reply = (await claude({ model: MODEL_CHAT(), system, history, content: text, max_tokens: 600 })).trim();

  await db.from("chat_messages").insert([
    { user_id: uid, role: "user", content: text },
    { user_id: uid, role: "assistant", content: reply },
  ]);
  return json({ reply, left: DAILY_LIMIT - (count || 0) - 1 });
});
