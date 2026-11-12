// Tarea diaria (Vercel Cron, ver vercel.json: llama a /api/webhook con GET).
// 1) Hace una consulta a la base de datos: así Supabase nunca pasa 7 días sin actividad y no se pausa.
// 2) Correos a quien se escaneó, dio su correo y su permiso, pero no se ha suscrito (3 correos en una semana).
// 3) Avisos a quien paga: revisión semanal pendiente y racha parada.
import { admin, env, isActive } from "./common.js";
import { layout, sendEmail, appUrl } from "./email.js";

const DAY = 864e5;
const MAX_SENDS = 60; // por ejecución, para no pasarnos de los límites de Resend
const PARAM_NAMES = { acne: "acné", arrugas: "arrugas", rojez_rosacea: "rojez", manchas: "manchas", poros: "poros", ojeras: "ojeras", hidratacion: "hidratación", cicatrices: "marcas" };

// Un consejo útil y general para cada cosa a trabajar (correo 2)
const TIPS = {
  acne: ["Menos es más con los granitos", "Lavarte la cara más veces o frotar fuerte no los quita: irrita la piel y hace que produzca más grasa. Limpia mañana y noche con un gel suave, no toques los granitos y cambia la funda de la almohada un par de veces por semana."],
  arrugas: ["El mejor antiarrugas es el que usas cada mañana", "El protector solar, todos los días del año, aunque esté nublado. La mayor parte del envejecimiento visible de la cara viene del sol. Dos dedos de crema para cara y cuello, y repítelo si pasas el día fuera."],
  rojez_rosacea: ["Tu piel te pide calma", "El agua muy caliente, los exfoliantes con granitos y los perfumes en la crema suelen empeorar la rojez. Lávate con agua templada, sécate a toquecitos y elige productos sin fragancia."],
  manchas: ["Las manchas se trabajan por la mañana", "Cualquier tratamiento para manchas pierde su efecto si no te proteges del sol. Protector solar alto cada mañana, también en invierno, y repítelo si estás al aire libre."],
  poros: ["Los poros no se cierran, pero se ven menos", "Cuando están limpios y la piel está hidratada se notan mucho menos. Limpia bien por la noche, sobre todo si usas maquillaje o protector solar, y no te saltes la crema aunque tengas la piel grasa."],
  ojeras: ["Las ojeras también se cuidan fuera del lavabo", "Dormir 7 u 8 horas, beber agua durante el día y reducir la sal por la noche ayuda a que se vean menos. Y por la mañana, un poco de frío (una cuchara fría, por ejemplo) baja la hinchazón."],
  hidratacion: ["La hidratación empieza por dentro", "Bebe agua repartida durante el día, no toda de golpe, y aplica la crema con la piel aún un poco húmeda después de lavarte: así retiene mucha más agua."],
  cicatrices: ["Las marcas necesitan constancia (y sol, nunca)", "Las marcas se oscurecen con el sol, así que el protector solar diario es tu mejor aliado. Y no toques ni revientes granitos: es lo que más marcas deja."],
};
const GENERIC_TIP = ["El secreto está en la constancia", "Una rutina sencilla hecha cada día da mejores resultados que muchos productos usados de vez en cuando. Limpieza suave, hidratación y protector solar por la mañana: esa es la base."];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dayStr = (d) => new Date(d).toISOString().slice(0, 10);

function authorized(request) {
  const secret = env("CRON_SECRET", "");
  if (secret) return request.headers.get("authorization") === `Bearer ${secret}`;
  return (request.headers.get("user-agent") || "").startsWith("vercel-cron/");
}

async function allUsers(db) {
  const out = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    out.push(...(data?.users || []));
    if (!data?.users || data.users.length < 1000) break;
  }
  return out;
}

async function inChunks(ids, q) {
  const out = [];
  for (let i = 0; i < ids.length; i += 150) {
    const { data, error } = await q(ids.slice(i, i + 150));
    if (error) throw error;
    out.push(...(data || []));
  }
  return { data: out };
}

const byUser = (rows) => {
  const m = new Map();
  for (const r of rows || []) { if (!m.has(r.user_id)) m.set(r.user_id, []); m.get(r.user_id).push(r); }
  return m;
};

// ---------- Correos ----------
function leadEmail(step, { uid, scan }) {
  const r = scan?.result || {};
  const prios = (r.prioridades || []).map((p) => PARAM_NAMES[p] || p).filter(Boolean);
  const list = prios.length > 1 ? `${prios.slice(0, -1).join(", ")} y ${prios.at(-1)}` : prios[0];
  const solucion = { text: "Ver mi solución", url: `${appUrl()}/app/#/suscribirse` };
  if (step === 1) {
    const paras = [
      `Ayer miré tu piel con calma y quería contarte lo más importante.`,
      r.tipo_piel ? `Tienes la piel **${r.tipo_piel}**${list ? `, y lo que más te conviene trabajar ahora es **${list}**` : ""}.` : list ? `Lo que más te conviene trabajar ahora es **${list}**.` : `Tu informe ya está guardado en tu cuenta.`,
      r.teaser || "Ya tengo preparada tu rutina, con productos reales según tu presupuesto, cuánto usar de cada uno y en qué orden.",
      `Cuando quieras, la tienes aquí:`,
    ];
    return { subject: "Lo que más necesita tu piel", ...layout({ uid, preheader: "Lo más importante de tu informe, en un minuto.", title: "Lo que más necesita tu piel", paras, button: solucion }) };
  }
  if (step === 2) {
    const [t, tip] = TIPS[(r.prioridades || [])[0]] || GENERIC_TIP;
    const paras = [tip, `Este es solo un consejo general. En tu plan te digo exactamente qué productos usar, cuánto y cuándo, y cada semana revisamos cómo va tu piel con 3 fotos.`];
    return { subject: t, ...layout({ uid, preheader: "Un consejo rápido para tu piel.", title: t, paras, button: { text: "Ver mi plan", url: solucion.url } }) };
  }
  const paras = [
    `La dejé preparada con los productos que mejor encajan con tu piel y con tu presupuesto, y sigue ahí cuando quieras empezar.`,
    `El primer mes es a **3,49 €**, y después 4,99 € al mes. Sin permanencia: cancelas cuando quieras desde la app.`,
    `Incluye tu rutina de mañana y noche con productos reales, la racha diaria, una revisión cada semana con antes y después, consejos de alimentación y yo para resolver tus dudas cuando las tengas.`,
  ];
  return { subject: "Tu rutina sigue esperándote", ...layout({ uid, preheader: "Primer mes a 3,49 €, sin permanencia.", title: "Tu rutina sigue esperándote", paras, button: { text: "Empezar mi plan", url: solucion.url }, footnote: "Este es el último correo de esta serie." }) };
}

function reviewEmail({ uid }) {
  const paras = [
    `Ha pasado una semana desde tu última revisión y ya te toca la siguiente.`,
    `Son solo 3 fotos (frente, izquierda y derecha) y así vemos cómo está respondiendo tu piel y ajusto tu plan si hace falta.`,
    `Consejo: hazlas con la misma luz que la vez anterior, para que la comparación sea justa.`,
  ];
  return { subject: "Te toca tu revisión semanal", ...layout({ uid, preheader: "3 fotos y vemos cómo va tu piel.", title: "Te toca tu revisión semanal", paras, button: { text: "Hacer mi revisión", url: `${appUrl()}/app/#/escaneo` } }) };
}

function streakEmail({ uid }) {
  const paras = [
    `Llevas unos días sin marcar tu rutina. Nos pasa a todos: lo importante es retomarla.`,
    `La piel responde a lo que haces cada día, así que hoy es un buen día para volver a empezar. Abre tu plan, haz tu rutina de esta noche y márcala: tu racha vuelve a contar desde hoy.`,
  ];
  return { subject: "¿Retomamos tu rutina?", ...layout({ uid, preheader: "Hoy es un buen día para volver a empezar.", title: "¿Retomamos tu rutina?", paras, button: { text: "Abrir mi plan", url: `${appUrl()}/app/#/hoy` } }) };
}

// ---------- Tarea ----------
export async function runCron(request) {
  if (!authorized(request)) return new Response("No autorizado", { status: 401 });
  const db = admin();
  const now = Date.now();
  const report = { ping: false, leads: 0, reviews: 0, streaks: 0, errors: 0, skipped_no_key: false };

  // 1) Mantener Supabase activo
  const { error: pingErr } = await db.from("accounts").select("user_id", { count: "exact", head: true });
  report.ping = !pingErr;

  if (!env("RESEND_API_KEY", "")) {
    report.skipped_no_key = true;
    return Response.json(report);
  }

  const users = (await allUsers(db)).filter((u) => u.email && !u.is_anonymous);
  if (!users.length) return Response.json(report);
  const ids = users.map((u) => u.id);

  const [{ data: profiles }, { data: accounts }, { data: scans }, { data: logs }] = await Promise.all([
    inChunks(ids, (c) => db.from("profiles").select("user_id,marketing_consent_at,emails_off").in("user_id", c)),
    inChunks(ids, (c) => db.from("accounts").select("*").in("user_id", c)),
    inChunks(ids, (c) => db.from("scans").select("user_id,cycle,kind,result,created_at").in("user_id", c).order("created_at", { ascending: true })),
    inChunks(ids, (c) => db.from("daily_logs").select("user_id,day,done,total").in("user_id", c).gte("day", dayStr(now - 4 * DAY))),
  ]);
  const P = new Map((profiles || []).map((p) => [p.user_id, p]));
  const A = new Map((accounts || []).map((a) => [a.user_id, a]));
  const SC = byUser(scans), LG = byUser(logs);

  let sent = 0;
  const send = async (u, mail, patch, kind) => {
    if (sent >= MAX_SENDS) return;
    try {
      await sendEmail({ to: u.email, uid: u.id, subject: mail.subject, html: mail.html, text: mail.text });
      await db.from("accounts").update({ ...patch, last_email_at: new Date().toISOString() }).eq("user_id", u.id);
      report[kind]++; sent++;
      await sleep(500);
    } catch (e) { console.error(kind, u.id, e.message); report.errors++; }
  };

  for (const u of users) {
    if (sent >= MAX_SENDS) break;
    const p = P.get(u.id) || {}, a = A.get(u.id), userScans = SC.get(u.id) || [];
    if (!a || p.emails_off || !userScans.length) continue;
    const lastMail = a.last_email_at ? new Date(a.last_email_at).getTime() : 0;
    if (now - lastMail < 40 * 3600e3) continue; // como mucho un correo cada ~2 días

    if (isActive(a)) {
      // Revisión semanal pendiente (avisos de servicio: no necesitan el permiso comercial)
      const cycleScans = userScans.filter((s) => s.cycle === a.cycle);
      const last = cycleScans.at(-1);
      if (last) {
        const due = new Date(last.created_at).getTime() + 6 * DAY;
        const reminded = a.last_review_reminder_at ? new Date(a.last_review_reminder_at).getTime() : 0;
        if (now >= due + DAY && reminded < due) { await send(u, reviewEmail({ uid: u.id }), { last_review_reminder_at: new Date().toISOString() }, "reviews"); continue; }
      }
      // Racha parada: 3 días sin completar la rutina
      const started = a.cycle_started_at ? new Date(a.cycle_started_at).getTime() : now;
      const recent = (LG.get(u.id) || []).filter((l) => l.day >= dayStr(now - 3 * DAY));
      const anyDone = recent.some((l) => l.total > 0 && (l.done || []).length / l.total >= 0.8);
      const streakMail = a.last_streak_reminder_at ? new Date(a.last_streak_reminder_at).getTime() : 0;
      if (now - started > 4 * DAY && !anyDone && now - streakMail > 7 * DAY) await send(u, streakEmail({ uid: u.id }), { last_streak_reminder_at: new Date().toISOString() }, "streaks");
      continue;
    }

    // No suscrita: solo con su permiso, solo quien nunca ha pagado, y solo 3 correos
    if (!p.marketing_consent_at || a.sub_status !== "none") continue;
    const step = (a.nurture_step || 0) + 1;
    if (step > 3) continue;
    const base = Math.max(new Date(userScans.at(-1).created_at).getTime(), new Date(p.marketing_consent_at).getTime());
    const waitDays = { 1: 0.8, 2: 3, 3: 6 }[step];
    if (now - base < waitDays * DAY) continue;
    await send(u, leadEmail(step, { uid: u.id, scan: userScans.at(-1) }), { nurture_step: step }, "leads");
  }

  console.log("cron", report);
  return Response.json(report);
}

// Para las muestras y para otras funciones
export { leadEmail, reviewEmail, streakEmail };
