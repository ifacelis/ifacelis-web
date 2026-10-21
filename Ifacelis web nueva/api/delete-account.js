// "Eliminar mi cuenta y mis fotos": cancela el pago, borra fotos y todos los datos.
import { admin, handler, json, HttpError, requireUser, readBody, getAccount } from "./_lib/common.js";
import { stripe } from "./_lib/stripe.js";

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const uid = user.id;
  const { confirm } = await readBody(request);
  if (confirm !== "ELIMINAR") throw new HttpError(400, "Escribe ELIMINAR para confirmar.");

  const account = await getAccount(uid);
  if (account.stripe_customer_id) {
    const s = stripe();
    const subs = await s.subscriptions.list({ customer: account.stripe_customer_id, status: "all", limit: 20 });
    for (const sub of subs.data)
      if (!["canceled", "incomplete_expired"].includes(sub.status)) await s.subscriptions.cancel(sub.id);
  }

  const db = admin();
  for (;;) {
    const { data: files } = await db.storage.from("faces").list(uid, { limit: 1000 });
    if (!files?.length) break;
    await db.storage.from("faces").remove(files.map((f) => `${uid}/${f.name}`));
    if (files.length < 1000) break;
  }
  const { error } = await db.auth.admin.deleteUser(uid); // borra en cascada todas las tablas
  if (error) throw error;
  return json({ ok: true });
});
