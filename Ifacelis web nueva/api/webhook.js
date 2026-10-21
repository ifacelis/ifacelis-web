// Stripe avisa aquí cuando alguien paga, renueva o se da de baja.
import { env, json } from "./_lib/common.js";
import { stripe, applySubscription, uidForCustomer } from "./_lib/stripe.js";

export async function POST(request) {
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
      if (uid && obj.subscription) await applySubscription(uid, await s.subscriptions.retrieve(obj.subscription));
    } else if (event.type.startsWith("customer.subscription.")) {
      const uid = obj.metadata?.user_id || (await uidForCustomer(obj.customer));
      if (uid) await applySubscription(uid, obj);
    }
    return json({ received: true });
  } catch (e) {
    console.error(e);
    return json({ error: "Error guardando" }, 500); // Stripe lo reintentará
  }
}
