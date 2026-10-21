// Cuando alguien escanea sin cuenta (sesión anónima) y luego entra con una cuenta que ya existía,
// pasamos su escaneo, sus fotos y su consentimiento a esa cuenta.
import { admin, handler, json, HttpError, requireUser, readBody, getAccount } from "./_lib/common.js";

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const uid = user.id;
  if (user.is_anonymous) throw new HttpError(400, "Primero entra con tu correo.");
  const { anon_token } = await readBody(request);
  if (!anon_token) return json({ moved: 0 });

  const db = admin();
  const { data: a } = await db.auth.getUser(anon_token);
  const anon = a?.user;
  if (!anon || !anon.is_anonymous || anon.id === uid) return json({ moved: 0 });
  const aid = anon.id;

  const accA = await getAccount(aid);
  const accU = await getAccount(uid);

  // 1) Fotos: mover de la carpeta anónima a la de la cuenta
  const { data: files } = await db.storage.from("faces").list(aid, { limit: 1000 });
  for (const f of files || []) {
    await db.storage.from("faces").move(`${aid}/${f.name}`, `${uid}/${f.name}`);
  }
  const fix = (p) => (typeof p === "string" && p.startsWith(`${aid}/`) ? `${uid}/${p.slice(aid.length + 1)}` : p);

  // 2) Escaneos y diario
  const { data: scans } = await db.from("scans").select("id,photos").eq("user_id", aid);
  for (const s of scans || []) {
    await db.from("scans").update({ user_id: uid, cycle: accU.cycle, photos: (s.photos || []).map(fix) }).eq("id", s.id);
  }
  const { data: diary } = await db.from("diary").select("id,path").eq("user_id", aid);
  for (const d of diary || []) await db.from("diary").update({ user_id: uid, path: fix(d.path) }).eq("id", d.id);

  // 3) Consentimiento y respuestas, si la cuenta no los tenía
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
      updated_at: pu?.updated_at || new Date().toISOString(),
    });
  }

  // 4) El informe gratis queda gastado también en la cuenta
  if (accA.free_scan_used && !accU.free_scan_used)
    await db.from("accounts").update({ free_scan_used: true }).eq("user_id", uid);

  // 5) Borrar la sesión anónima (ya vacía)
  await db.auth.admin.deleteUser(aid);
  return json({ moved: (scans || []).length });
});
