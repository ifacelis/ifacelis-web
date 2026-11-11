// Darse de baja de los correos de Lis desde el enlace de cualquier correo (/api/baja, que Vercel pasa a /api/webhook).
// GET: abre una página de confirmación. POST: baja con un clic (botón del propio Gmail / Apple Mail).
import { admin } from "./common.js";
import { checkUnsub, appUrl } from "./email.js";

async function optOut(uid) {
  await admin().from("profiles").upsert({ user_id: uid, emails_off: true, marketing_consent_at: null });
}

const page = (title, text) => new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Ifacelis · ${title}</title>
<style>body{margin:0;background:#F1EBE5;color:#2B2725;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif}main{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px}
img{width:64px;height:64px;border-radius:16px;margin-bottom:20px}h1{font-family:Georgia,serif;font-style:italic;font-weight:500;font-size:30px;margin:0 0 10px}p{max-width:320px;line-height:1.55;color:#5C534D;margin:0 0 24px}
a{background:#2B2725;color:#F6F3EF;border-radius:999px;padding:13px 24px;text-decoration:none;font-weight:700}</style></head>
<body><main><img src="/apple-touch-icon.png" alt=""><h1>${title}</h1><p>${text}</p><a href="${appUrl()}/app/">Ir a Ifacelis</a></main></body></html>`,
  { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export async function bajaGET(request) {
  const url = new URL(request.url);
  const uid = url.searchParams.get("u"), t = url.searchParams.get("t");
  if (!checkUnsub(uid, t)) return page("Enlace no válido", "Este enlace de baja no es correcto. Puedes desactivar los correos desde Mi cuenta en la app.");
  try { await optOut(uid); }
  catch (e) { console.error(e); return page("Vaya…", "No hemos podido darte de baja ahora mismo. Prueba otra vez en un momento."); }
  return page("Hecho", "No te enviaremos más correos de Lis. Si cambias de idea, puedes activarlos desde Mi cuenta en la app.");
}

export async function bajaPOST(request) {
  const url = new URL(request.url);
  const uid = url.searchParams.get("u"), t = url.searchParams.get("t");
  if (!checkUnsub(uid, t)) return new Response("Enlace no válido", { status: 400 });
  try { await optOut(uid); return new Response("OK"); }
  catch (e) { console.error(e); return new Response("Error", { status: 500 }); }
}
