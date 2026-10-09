// Abre el pago de Stripe: 3,49 € el primer mes (solo la primera vez) y luego 4,99 €/mes
import { admin, env, handler, json, HttpError, requireUser, getAccount, isActive } from "./_lib/common.js";
import { stripe } from "./_lib/stripe.js";

export const POST = handler(async (request) => {
  const user = await requireUser(request);
  const uid = user.id;
  const account = await getAccount(uid);
  if (isActive(account)) throw new HttpError(400, "Ya tienes Ifacelis Pro.");
  if (account.sub_status === "none" && !account.free_scan_used)
    throw new HttpError(400, "Primero haz tu escaneo gratis.");

  const s = stripe();
  let customer = account.stripe_customer_id;
  if (!customer) {
    const c = await s.customers.create({ email: user.email, metadata: { user_id: uid } });
    customer = c.id;
    await admin().from("accounts").update({ stripe_customer_id: customer }).eq("user_id", uid);
  }

  const appUrl = env("APP_URL", "https://www.ifacelis.com").replace(/\/$/, "");
  const firstTime = account.sub_status === "none";
  const coupon = env("STRIPE_COUPON_ID", "");

  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: uid,
    line_items: [{ price: env("STRIPE_PRICE_ID"), quantity: 1 }],
    ...(firstTime && coupon ? { discounts: [{ coupon }] } : { allow_promotion_codes: true }),
    subscription_data: { metadata: { user_id: uid } },
    locale: "es",
    success_url: `${appUrl}/app/?pago=ok`,
    cancel_url: `${appUrl}/app/?pago=cancelado`,
  });
  return json({ url: session.url });
});
