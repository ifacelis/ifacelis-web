// Gestionar o cancelar la suscripción (página de Stripe)
import { env, handler, json, HttpError, requireUser, getAccount } from "./_lib/common.js";
import { stripe } from "./_lib/stripe.js";

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const account = await getAccount(user.id);
  if (!account.stripe_customer_id) throw new HttpError(400, "Todavía no tienes ninguna suscripción.");
  const appUrl = env("APP_URL", "https://www.ifacelis.com").replace(/\/$/, "");
  const session = await stripe().billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: `${appUrl}/app/#/cuenta`,
  });
  return json({ url: session.url });
});
