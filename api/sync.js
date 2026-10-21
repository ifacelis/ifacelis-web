// Comprueba en Stripe el estado real de la suscripción (por si un aviso de Stripe llegó desordenado)
import { handler, json, requireUser, getAccount } from "./_lib/common.js";
import { stripe, applySubscription } from "./_lib/stripe.js";

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const account = await getAccount(user.id);
  if (!account.stripe_customer_id) return json({ account });
  const subs = await stripe().subscriptions.list({ customer: account.stripe_customer_id, status: "all", limit: 5 });
  const order = ["active", "trialing", "past_due", "unpaid", "incomplete", "canceled", "incomplete_expired"];
  const best = [...subs.data].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || b.created - a.created)[0];
  if (best) await applySubscription(user.id, best);
  return json({ account: await getAccount(user.id) });
});
