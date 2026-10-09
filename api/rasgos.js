// Maquillaje y grooming según rasgos (se calcula una vez con la foto de frente)
import {
  admin, handler, json, HttpError, requireUser, getAccount, isActive, getProfile,
  claude, parseJson, photoBlocks, MODEL_VISION,
} from "./_lib/common.js";
import { RASGOS } from "./_lib/prompts.js";

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const uid = user.id;
  const db = admin();
  const account = await getAccount(uid);
  if (!isActive(account)) throw new HttpError(402, "Maquillaje es parte de Ifacelis Pro.", { code: "pay" });

  const { data: existing } = await db.from("features").select("*").eq("user_id", uid).maybeSingle();
  if (existing) return json({ features: existing });

  const { data: scan } = await db.from("scans").select("photos").eq("user_id", uid)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!scan) throw new HttpError(400, "Primero haz tu escaneo.");

  const profile = await getProfile(uid);
  const [front] = await photoBlocks([scan.photos[0]]);
  const result = parseJson(await claude({
    model: MODEL_VISION(), system: RASGOS, max_tokens: 2000,
    content: [front, { type: "text", text: `CUESTIONARIO: ${JSON.stringify(profile?.questionnaire || {})}` }],
  }));
  if (result.foto_valida === false) throw new HttpError(400, result.motivo || "La foto de frente no sirve. Haz una revisión nueva.");

  const { data, error } = await db.from("features").upsert({ user_id: uid, result }).select("*").single();
  if (error) throw error;
  return json({ features: data });
});
