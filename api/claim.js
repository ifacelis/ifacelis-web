// Dos cosas:
// 1) "lead": alguien escanea sin cuenta y deja su correo para ver el informe completo.
//    No creamos cuenta todavía: guardamos el correo en su sesión anónima y le enviamos el informe.
// 2) Al entrar con el código del correo, le pasamos a su cuenta lo que hizo sin cuenta:
//    el escaneo de este móvil (anon_token) y cualquier escaneo hecho en otro móvil con ese mismo correo.
import { admin, handler, json, HttpError, requireUser, readBody, getAccount } from "./_lib/common.js";
import { reportEmail, sendEmail, altaUrl } from "./_lib/email.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const fmtDate = (d) => new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });

async function lead(db, user, body) {
  if (!user.is_anonymous) throw new HttpError(400, "Ya tienes cuenta.");
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) throw new HttpError(400, "Revisa el correo, parece que no está bien escrito.");
  const meta = user.user_metadata || {};
  const sends = Number(meta.lead_sends || 0);
  const { data: last } = await db.from("scans").select("result,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!last?.result) throw new HttpError(400, "Primero haz tu escaneo.");

  // Como mucho 3 envíos por escaneo sin cuenta (para que nadie use esto para mandar correos a otros)
  const send = sends < 3 && meta.lead_email !== email || sends === 0;
  await db.auth.admin.updateUserById(user.id, {
    user_metadata: { ...meta, lead_email: email, lead_mk: !!body.mk, lead_at: new Date().toISOString(), lead_sends: send ? sends + 1 : sends },
  });
  let sent = false;
  if (send) {
    try {
      const mail = reportEmail({ result: last.result, date: fmtDate(last.created_at), optIn: body.mk ? altaUrl(user.id) : null });
      await sendEmail({ to: email, uid: user.id, subject: mail.subject, html: mail.html, text: mail.text });
      sent = true;
    } catch (e) { console.error("lead email", e.message); }
  }
  return json({ ok: true, sent });
}

// Pasa todo lo de una sesión anónima (aid) a la cuenta (uid) y borra la anónima
async function migrate(db, aid, uid) {
  const accA = await getAccount(aid);
  const accU = await getAccount(uid);

  // Fotos
  const { data: files } = await db.storage.from("faces").list(aid, { limit: 1000 });
  for (const f of files || []) await db.storage.from("faces").move(`${aid}/${f.name}`, `${uid}/${f.name}`);
  const fix = (p) => (typeof p === "string" && p.startsWith(`${aid}/`) ? `${uid}/${p.slice(aid.length + 1)}` : p);

  // Escaneos y diario
  const { data: scans } = await db.from("scans").select("id,photos").eq("user_id", aid);
  for (const s of scans || []) await db.from("scans").update({ user_id: uid, cycle: accU.cycle, photos: (s.photos || []).map(fix) }).eq("id", s.id);
  const { data: diary } = await db.from("diary").select("id,path").eq("user_id", aid);
  for (const d of diary || []) await db.from("diary").update({ user_id: uid, path: fix(d.path) }).eq("id", d.id);

  // Consentimiento, respuestas y permiso para consejos, si la cuenta no los tenía
  const [{ data: pa }, { data: pu }] = await Promise.all([
    db.from("profiles").select("*").eq("user_id", aid).maybeSingle(),
    db.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
  ]);
  if (pa) {
    await db.from("profiles").upsert({
      user_id: uid,
      questionnaire: pu?.questionnaire || pa.questionnaire || null,
      budget: pu?.budget || pa.budget || null,
      photo_consent_at: pu?.photo_consent_at || pa.photo_consent_at || null,
      marketing_consent_at: pu?.marketing_consent_at || (pu?.emails_off ? null : pa.marketing_consent_at) || null,
      updated_at: pu?.updated_at || new Date().toISOString(),
    });
  }
  if (accA.free_scan_used && !accU.free_scan_used)
    await db.from("accounts").update({ free_scan_used: true }).eq("user_id", uid);

  await db.auth.admin.deleteUser(aid);
  return (scans || []).length;
}

// Sesiones anónimas que dejaron este correo (en otro móvil o navegador)
async function anonsByEmail(db, email) {
  const out = [];
  for (let page = 1; page < 30; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data?.users || []) if (u.is_anonymous && u.user_metadata?.lead_email === email) out.push(u);
    if (!data?.users || data.users.length < 1000) break;
  }
  return out;
}

export const POST = handler(async (request) => {
  const db = admin();
  const user = await requireUser(request);
  const body = await readBody(request);
  if (body.lead) return lead(db, user, body.lead);

  const uid = user.id;
  if (user.is_anonymous) throw new HttpError(400, "Primero entra con tu correo.");
  const email = (user.email || "").toLowerCase();

  const anons = [];
  if (body.anon_token) {
    const { data: a } = await db.auth.getUser(body.anon_token);
    if (a?.user?.is_anonymous && a.user.id !== uid) anons.push(a.user);
  }
  // Por correo solo si la cuenta aún no tiene escaneos propios (así nadie puede meter su escaneo en la cuenta de otra persona)
  const { count: own } = await db.from("scans").select("id", { count: "exact", head: true }).eq("user_id", uid);
  if (email && !own) {
    try { for (const u of await anonsByEmail(db, email)) if (!anons.some((x) => x.id === u.id)) anons.push(u); }
    catch (e) { console.error("anonsByEmail", e.message); }
  }
  if (!anons.length) return json({ moved: 0 });

  let moved = 0, alreadySent = false, wantsTips = false;
  for (const a of anons) {
    const m = a.user_metadata || {};
    if (m.lead_email === email && m.lead_sends) alreadySent = true;
    if (m.lead_email === email && m.lead_mk) wantsTips = true; // marcó la casilla y ahora ha confirmado su correo con el código
    try { moved += await migrate(db, a.id, uid); } catch (e) { console.error("migrate", a.id, e.message); }
  }
  if (wantsTips) {
    const { data: p } = await db.from("profiles").select("marketing_consent_at,emails_off").eq("user_id", uid).maybeSingle();
    if (!p?.marketing_consent_at && !p?.emails_off)
      await db.from("profiles").upsert({ user_id: uid, marketing_consent_at: new Date().toISOString(), emails_off: false });
  }

  // Si aún no le habíamos mandado el informe, se lo mandamos ahora (si falla, no impide entrar)
  if (moved && !alreadySent && email) {
    try {
      const { data: last } = await db.from("scans").select("result,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (last?.result) {
        const mail = reportEmail({ result: last.result, date: fmtDate(last.created_at) });
        await sendEmail({ to: email, uid, subject: mail.subject, html: mail.html, text: mail.text });
      }
    } catch (e) { console.error("report email", e.message); }
  }
  return json({ moved });
});
