// Correos de Lis: plantilla con la marca, envío por Resend y enlace de baja firmado.
import crypto from "node:crypto";
import { env } from "./common.js";

export const appUrl = () => env("APP_URL", "https://ifacelis.com").replace(/\/+$/, "");

// Enlace de baja: firmado con una clave del servidor, para que nadie pueda dar de baja a otra persona
const sign = (uid) => crypto.createHmac("sha256", env("SUPABASE_SECRET_KEY")).update(`baja:${uid}`).digest("hex").slice(0, 32);
export const unsubUrl = (uid) => `${appUrl()}/api/baja?u=${encodeURIComponent(uid)}&t=${sign(uid)}`;
export const checkUnsub = (uid, t) => {
  if (!uid || !t) return false;
  const a = Buffer.from(sign(uid)), b = Buffer.from(String(t));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// paras: lista de párrafos (texto plano; **negrita** permitida). button: { text, url }
export function layout({ preheader = "", title, paras = [], button, footnote = "", uid }) {
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  const body = paras.map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3A3330">${md(p)}</p>`).join("");
  const btn = button
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 22px"><tr><td style="background:#2B2725;border-radius:999px"><a href="${esc(button.url)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#F6F3EF;text-decoration:none">${esc(button.text)}</a></td></tr></table>`
    : "";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F1EBE5;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F1EBE5"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px">
<tr><td style="padding:0 6px 18px"><img src="${appUrl()}/icon-192.png" width="44" height="44" alt="Ifacelis" style="border-radius:11px;display:block"></td></tr>
<tr><td style="background:#FFFFFF;border-radius:24px;padding:30px 26px">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-style:italic;font-size:28px;line-height:1.2;color:#211D1B">${esc(title)}</h1>
${body}${btn}
<p style="margin:0;font-size:15px;line-height:1.6;color:#3A3330">Un abrazo,<br><b>Lis</b> · Ifacelis</p>
</td></tr>
<tr><td style="padding:18px 10px 0;font-size:12px;line-height:1.6;color:#8A8079">
${footnote ? `${esc(footnote)}<br>` : ""}Ifacelis ofrece un análisis cosmético orientativo, no un diagnóstico médico.<br>
<a href="${unsubUrl(uid)}" style="color:#8A8079">No quiero recibir más correos de Lis</a>
</td></tr></table></td></tr></table></body></html>`;
  const text = [title, "", ...paras.map((p) => p.replace(/\*\*/g, "")), button ? `${button.text}: ${button.url}` : "", "", "Un abrazo,", "Lis · Ifacelis", "", `Darte de baja: ${unsubUrl(uid)}`].join("\n");
  return { html, text };
}

export async function sendEmail({ to, subject, html, text, uid }) {
  const key = env("RESEND_API_KEY", "");
  if (!key) throw new Error("Falta RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env("EMAIL_FROM", "Lis de Ifacelis <hola@ifacelis.com>"),
      to: [to],
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${unsubUrl(uid)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
