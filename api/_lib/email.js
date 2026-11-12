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
export function layout({ preheader = "", title, paras = [], button, footnote = "", uid, highlight = "", after = [], signoff = true, unsub = true }) {
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
<tr><td style="padding:0 6px 18px"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="vertical-align:middle"><img src="${appUrl()}/icon-192.png" width="40" height="40" alt="" style="border-radius:10px;display:block"></td><td style="vertical-align:middle;padding-left:10px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#211D1B">Ifacelis</td></tr></table></td></tr>
<tr><td style="background:#FFFFFF;border-radius:24px;padding:30px 26px">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-style:italic;font-size:28px;line-height:1.2;color:#211D1B">${esc(title)}</h1>
${body}${highlight}${after.map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3A3330">${md(p)}</p>`).join("")}${btn}
${signoff ? `<p style="margin:0;font-size:15px;line-height:1.6;color:#3A3330">Un abrazo,<br><b>Lis</b> · Ifacelis</p>` : ""}
</td></tr>
<tr><td style="padding:18px 10px 0;font-size:12px;line-height:1.6;color:#8A8079">
${footnote ? `${esc(footnote)}<br>` : ""}Ifacelis ofrece un análisis cosmético orientativo, no un diagnóstico médico.<br>
${unsub ? `<a href="${unsubUrl(uid)}" style="color:#8A8079">No quiero recibir más correos de Lis</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const plain = (h) => String(h).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const text = [title, "", ...paras.map((p) => p.replace(/\*\*/g, "")), plain(highlight), ...after.map((p) => p.replace(/\*\*/g, "")), button ? `${button.text}: ${button.url}` : "", "", signoff ? "Un abrazo,\nLis · Ifacelis" : "", footnote, unsub ? `Darte de baja: ${unsubUrl(uid)}` : ""].filter((x) => x !== undefined).join("\n");
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

// Correo de bienvenida tras el primer pago (aviso de servicio)
export function welcomeEmail({ uid }) {
  const step = (n, t, d) => `<tr><td style="vertical-align:top;padding:0 14px 14px 0;font-family:Georgia,serif;font-style:italic;font-size:26px;line-height:1;color:#8A8079">${n}</td><td style="vertical-align:top;padding:0 0 14px;font-size:15px;line-height:1.55;color:#3A3330"><b style="color:#211D1B">${t}</b><br>${d}</td></tr>`;
  const highlight = `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:4px 0 18px">${step(1, "Esta noche", "Abre tu plan y haz tu rutina de noche. Tienes cada producto con la cantidad exacta.")}${step(2, "Cada día", "Marca lo que has hecho. Si cumples al menos el 80 %, tu racha suma un día.")}${step(3, "Dentro de 6 días", "Te toca tu primera revisión: 3 fotos y vemos cómo responde tu piel.")}</table>`;
  return {
    subject: "Tu plan ya está listo",
    ...layout({
      uid,
      preheader: "Tres pasos para empezar esta misma noche.",
      title: "Tu plan ya está listo",
      paras: ["Gracias por confiar en mí. A partir de hoy vamos a cuidar tu piel juntos, semana a semana. Así de fácil es empezar:"],
      highlight,
      after: ["Puedes gestionar o cancelar tu suscripción cuando quieras desde **Mi cuenta**, en la app."],
      button: { text: "Abrir mi plan", url: `${appUrl()}/app/#/hoy` },
      unsub: false,
    }),
  };
}

// Código para entrar (plantilla de Supabase). token: "{{ .Token }}" para Supabase, o un número de ejemplo
export function codeEmail({ token }) {
  const highlight = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 18px"><tr><td align="center" style="background:#F1EBE5;border-radius:18px;padding:22px 10px;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#211D1B">${token}</td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px"><tr><td style="background:#EFE9F5;border-radius:16px;padding:14px 16px;font-size:14px;line-height:1.5;color:#3A3330"><b style="color:#211D1B">Tu primer mes, a 3,49 €</b> en lugar de 4,99 €. Sin permanencia: cancelas cuando quieras.</td></tr></table>`;
  return {
    subject: `Tu código de Ifacelis: ${token}`,
    ...layout({
      uid: "",
      preheader: "Escríbelo en la web para entrar en tu cuenta.",
      title: "Tu código para entrar",
      paras: ["Escribe este código en la web de Ifacelis para entrar en tu cuenta:"],
      highlight,
      signoff: false,
      unsub: false,
      footnote: "El código caduca en 1 hora y solo sirve una vez. Si no has pedido entrar en Ifacelis, ignora este correo.",
    }),
  };
}
