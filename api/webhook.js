// Stripe avisa aquí cuando alguien paga, renueva o se da de baja.
// Esta función también hace la tarea diaria y la baja de los correos de Lis,
// porque el plan gratis de Vercel solo permite 12 funciones.
import { env, json, admin } from "./_lib/common.js";
import { stripe, applySubscription, uidForCustomer } from "./_lib/stripe.js";
import { runCron } from "./_lib/cron.js";
import { bajaGET, bajaPOST } from "./_lib/baja.js";
import { welcomeEmail, sendEmail } from "./_lib/email.js";

// Correo de bienvenida: solo una vez por persona, la primera vez que paga.
// Si falla, no rompe el aviso de Stripe (el pago ya está guardado).
async function sendWelcome(uid) {
  try {
    if (!env("RESEND_API_KEY", "")) return;
    const db = admin();
    const { data: acc } = await db.from("accounts").select("welcome_sent_at,sub_status").eq("user_id", uid).maybeSingle();
    if (!acc || acc.welcome_sent_at || !["active", "trialing"].includes(acc.sub_status)) return;
    const { data: u } = await db.auth.admin.getUserById(uid);
    const email = u?.user?.email;
    if (!email) return;
    // Marcamos antes de enviar para no mandarlo dos veces si Stripe repite el aviso
    const { data: claimed } = await db.from("accounts").update({ welcome_sent_at: new Date().toISOString() }).eq("user_id", uid).is("welcome_sent_at", null).select("user_id");
    if (!claimed?.length) return;
    const mail = welcomeEmail({ uid });
    await sendEmail({ to: email, uid, subject: mail.subject, html: mail.html, text: mail.text });
  } catch (e) { console.error("welcome", e.message); }
}

// GET: con ?u= es una baja de correos; sin nada, es la tarea diaria de Vercel Cron
export async function GET(request) {
  if (new URL(request.url).searchParams.has("u")) return bajaGET(request);
  return runCron(request);
}

export async function POST(request) {
  if (new URL(request.url).searchParams.has("u")) return bajaPOST(request); // baja con un clic desde Gmail / Apple Mail
  const s = stripe();
  const raw = await request.text();
  let event;
  try {
    event = await s.webhooks.constructEventAsync(raw, request.headers.get("stripe-signature"), env("STRIPE_WEBHOOK_SECRET"));
  } catch (e) {
    return json({ error: "Firma no válida" }, 400);
  }

  try {
    const obj = event.data.object;
    if (event.type === "checkout.session.completed" && obj.mode === "subscription") {
      const uid = obj.client_reference_id || obj.metadata?.user_id;
      if (uid && obj.subscription) {
        await applySubscription(uid, await s.subscriptions.retrieve(obj.subscription));
        await sendWelcome(uid);
      }
    } else if (event.type.startsWith("customer.subscription.")) {
      const uid = obj.metadata?.user_id || (await uidForCustomer(obj.customer));
      // Los avisos pueden llegar desordenados: siempre leemos el estado actual en Stripe
      if (uid) await applySubscription(uid, await s.subscriptions.retrieve(obj.id));
    }
    return json({ received: true });
  } catch (e) {
    console.error(e);
    return json({ error: "Error guardando" }, 500); // Stripe lo reintentará
  }
}
