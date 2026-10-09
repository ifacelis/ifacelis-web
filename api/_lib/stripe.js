import Stripe from "stripe";
import { env, admin } from "./common.js";

let _s;
export const stripe = () => (_s ||= new Stripe(env("STRIPE_SECRET_KEY")));

const periodEnd = (sub) => {
  const t = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return t ? new Date(t * 1000).toISOString() : null;
};

const ENDED = ["canceled", "unpaid", "incomplete_expired"];

// Guarda el estado de la suscripción. Si vuelve tras una baja: empieza de cero.
export async function applySubscription(uid, sub) {
  const db = admin();
  const { data: prev } = await db.from("accounts").select("*").eq("user_id", uid).maybeSingle();
  const status = sub.status;
  const update = {
    user_id: uid,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    sub_status: status,
    sub_period_end: periodEnd(sub),
    updated_at: new Date().toISOString(),
  };
  const nowActive = ["active", "trialing"].includes(status);
  if (prev && ENDED.includes(prev.sub_status) && nowActive) {
    update.cycle = (prev.cycle || 1) + 1;
    update.needs_restart = true;
    update.phase = 1;
    update.cycle_started_at = new Date().toISOString();
  }
  const { error } = await db.from("accounts").upsert(update);
  if (error) throw error;
}

export async function uidForCustomer(customerId) {
  const { data } = await admin().from("accounts").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.user_id || null;
}
