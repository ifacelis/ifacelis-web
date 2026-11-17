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

// Informe de piel por correo (lo pide la persona al dejar su correo: aviso de servicio)
const PARAM_ORDER = ["acne", "arrugas", "rojez_rosacea", "manchas", "poros", "ojeras", "hidratacion", "cicatrices"];
const PARAM_LABEL = { acne: "Acné", arrugas: "Arrugas", rojez_rosacea: "Rojez · rosácea", manchas: "Manchas", poros: "Poros", ojeras: "Ojeras", hidratacion: "Hidratación", cicatrices: "Cicatrices" };
const ZONE_LABEL = { frente: "frente", entrecejo: "entrecejo", nariz: "nariz", contorno_ojos: "contorno de ojos", menton: "mentón", mejilla_izquierda: "mejilla izquierda", mejilla_derecha: "mejilla derecha", mandibula_izquierda: "mandíbula izquierda", mandibula_derecha: "mandíbula derecha", sien_izquierda: "sien izquierda", sien_derecha: "sien derecha" };
const LVL = { bien: ["#DDE9DF", "#3F6B4F"], leve: ["#E1DCEC", "#4F4578"], moderado: ["#F3E6D2", "#8A5A1E"], alto: ["#F2DADA", "#8E3B3B"] };

export function reportEmail({ result = {}, date }) {
  const r = result;
  const prios = (r.prioridades || []).map((p) => PARAM_LABEL[p] || p);
  const params = [...(r.parametros || [])].sort((a, b) => PARAM_ORDER.indexOf(a.id) - PARAM_ORDER.indexOf(b.id));
  const score = Number.isFinite(Number(r.puntuacion_global)) ? Math.round(Number(r.puntuacion_global)) : null;
  const scoreCard = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 20px"><tr><td style="background:#2B2725;border-radius:20px;padding:20px 22px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td style="vertical-align:middle;font-family:Georgia,serif;color:#F6F1EC"><span style="font-size:44px;line-height:1">${score ?? "–"}</span><span style="font-size:14px;color:#A99E96"> / 100</span></td>
<td align="right" style="vertical-align:middle;font-size:12px;line-height:1.5;color:#A99E96">TIPO DE PIEL<br><b style="font-size:18px;color:#F3EDE7;text-transform:capitalize">${esc(r.tipo_piel || "–")}</b></td>
</tr></table>
${prios.length ? `<p style="margin:14px 0 0;font-size:12px;color:#A99E96">LO QUE MÁS TE CONVIENE TRABAJAR</p><p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#F3EDE7">${prios.map(esc).join(" · ")}</p>` : ""}
</td></tr></table>`;
  const derivar = r.derivar ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px"><tr><td style="background:#F2DADA;border-radius:16px;padding:14px 16px;font-size:14px;line-height:1.5;color:#8E3B3B"><b>Te recomiendo ver a un dermatólogo.</b><br>${esc(r.motivo_derivar || "Hay algo que conviene que revise un profesional.")}</td></tr></table>` : "";
  const rows = params.map((p) => {
    const [bg, fg] = LVL[p.nivel] || LVL.leve;
    const w = Math.max(4, Math.min(100, Number(p.valor) || 0));
    return `<tr><td style="padding:12px 0;border-top:1px solid #EFE9E3">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="font-size:15px;font-weight:700;color:#211D1B">${esc(p.nombre || PARAM_LABEL[p.id] || p.id)}</td><td align="right"><span style="display:inline-block;background:${bg};color:${fg};border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;text-transform:capitalize">${esc(p.nivel || "")}</span></td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 6px"><tr><td style="background:#EFE9E3;border-radius:6px;height:6px;line-height:6px;font-size:0"><table role="presentation" width="${w}%" cellspacing="0" cellpadding="0"><tr><td style="background:${fg};border-radius:6px;height:6px;line-height:6px;font-size:0">&nbsp;</td></tr></table></td></tr></table>
${p.explicacion ? `<p style="margin:0;font-size:14px;line-height:1.55;color:#5C534D">${esc(p.explicacion)}</p>` : ""}
${(p.zonas || []).length ? `<p style="margin:4px 0 0;font-size:13px;line-height:1.5;color:#8A8079">Zonas: ${(p.zonas || []).map((z) => esc(ZONE_LABEL[z] || z)).join(", ")}</p>` : ""}
</td></tr>`;
  }).join("");
  const solucion = `${appUrl()}/app/#/suscribirse`;
  const locked = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 18px"><tr><td style="background:#F1EBE5;border-radius:20px;padding:20px 18px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;color:#8A8079">TU SOLUCIÓN</p>
<p style="margin:0 0 14px;font-family:Georgia,serif;font-style:italic;font-size:22px;line-height:1.25;color:#211D1B">${esc(r.teaser || "Tu rutina ya está preparada")}</p>
<a href="${solucion}" style="display:block;text-decoration:none"><img src="${appUrl()}/img/solucion-borrosa.jpg" width="100%" alt="Tu rutina, bloqueada: desbloquéala en la app" style="display:block;width:100%;max-width:468px;border-radius:14px;border:0"></a>
<p style="margin:14px 0 16px;font-size:14px;line-height:1.55;color:#3A3330">Tu rutina de mañana y noche con productos reales, cuánto usar de cada uno y dónde comprarlo, más tu revisión semanal. <b>Primer mes a 3,49 €</b>, sin permanencia.</p>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:#2B2725;border-radius:999px"><a href="${solucion}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#F6F3EF;text-decoration:none">Desbloquear mi solución</a></td></tr></table>
</td></tr></table>`;
  const highlight = `${scoreCard}${derivar}${rows ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px">${rows}</table>` : ""}${locked}`;
  const title = r.titulo || "Tu informe de piel";
  return {
    subject: "Tu informe de piel de Ifacelis",
    ...layout({
      uid: "",
      preheader: score != null ? `Tu piel: ${score}/100${prios.length ? ` · A trabajar: ${prios.join(", ").toLowerCase()}` : ""}` : "Aquí tienes tu análisis completo.",
      title,
      paras: [`Aquí tienes tu informe completo${date ? ` del ${date}` : ""}, zona por zona, para que lo tengas guardado. Es gratis y es tuyo.`],
      highlight,
      unsub: false,
    }),
  };
}
