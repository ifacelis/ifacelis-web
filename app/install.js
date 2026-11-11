// Ifacelis · "Añade Ifacelis a tu pantalla de inicio"
// 1. Activa el service worker.
// 2. Enseña un aviso discreto para instalar la app, adaptado a cada móvil:
//    - Android / Chrome: botón "Instalar" que abre la ventana del sistema.
//    - iPhone (Safari): explica Compartir → "Añadir a pantalla de inicio".
//    - Navegador de TikTok / Instagram: pide abrir la página en Safari o Chrome,
//      porque desde ahí no se puede instalar.
// No sale si ya está instalada, en ordenador, durante el escaneo o el chat,
// ni si la usuaria lo cerró hace menos de 7 días.

(() => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }

  const ua = navigator.userAgent || "";
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|BytedanceWebview|TikTok|Line\//i.test(ua);
  const isIOSSafari = isIOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua) && !inApp;
  const isDemo = /[?&]demo/.test(location.search);

  if (standalone || isDemo || (!isIOS && !isAndroid)) return;

  const KEY = "ifacelis-install-closed";
  const DAYS = 7;
  const closedRecently = () => {
    try { const t = +localStorage.getItem(KEY); return t && Date.now() - t < DAYS * 864e5; } catch { return false; }
  };
  const remember = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch {} };

  let deferred = null; // aviso nativo de Android
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; schedule(); });
  window.addEventListener("appinstalled", () => { remember(); hide(); });

  // Pantallas donde el aviso molestaría
  const busy = () => /escaneo|chat|login|confirmando|generando|cuestionario/.test(location.hash) || !!document.querySelector("video");

  const shareIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>`;
  const plusIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="vertical-align:-3px"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>`;

  function content() {
    if (inApp) return {
      title: "Ábrela en tu navegador",
      text: `Desde TikTok o Instagram no se puede guardar en el móvil. Toca <b>···</b> arriba a la derecha y elige <b>Abrir en ${isIOS ? "Safari" : "el navegador"}</b>.`,
      btn: null
    };
    if (deferred) return {
      title: "Ten Ifacelis en tu móvil",
      text: "Añádela a tu pantalla de inicio y ábrela como una app, sin buscarla en el navegador.",
      btn: "Instalar"
    };
    if (isIOSSafari) return {
      title: "Ten Ifacelis en tu móvil",
      text: `Toca ${shareIcon} <b>Compartir</b> abajo y luego ${plusIcon} <b>Añadir a pantalla de inicio</b>.`,
      btn: null
    };
    if (isIOS) return {
      title: "Ten Ifacelis en tu móvil",
      text: "Abre esta página en <b>Safari</b> para poder añadirla a tu pantalla de inicio.",
      btn: null
    };
    return null; // Android sin aviso nativo disponible: mejor no decir nada
  }

  const css = `
  #ifi{position:fixed;left:50%;transform:translate(-50%,140%);bottom:calc(84px + env(safe-area-inset-bottom));width:calc(100% - 24px);max-width:456px;
    background:#2B2725;color:#F6F3EF;border-radius:20px;padding:14px 14px 14px 16px;display:flex;gap:12px;align-items:center;
    box-shadow:0 10px 30px rgba(43,39,37,.25);z-index:60;transition:transform .45s cubic-bezier(.2,.8,.2,1);font-family:'Plus Jakarta Sans',system-ui,sans-serif}
  #ifi.show{transform:translate(-50%,0)}
  #ifi img{width:44px;height:44px;border-radius:11px;flex:none;border:1px solid rgba(255,255,255,.14)}
  #ifi .t{flex:1;min-width:0}
  #ifi b.h{display:block;font-size:14px;font-weight:700;margin-bottom:2px}
  #ifi p{margin:0;font-size:12.5px;line-height:1.45;color:#DDD3C9}
  #ifi p b{color:#fff;font-weight:700}
  #ifi .go{flex:none;background:#E1DCEC;color:#2B2725;border:0;border-radius:999px;padding:9px 14px;font-weight:700;font-size:13px}
  #ifi .x{position:absolute;top:6px;right:8px;background:none;border:0;color:#8A8079;font-size:20px;line-height:1;padding:4px}
  body.no-nav #ifi{bottom:calc(16px + env(safe-area-inset-bottom))}`;

  let el = null, timer = null;

  function show() {
    if (el || closedRecently() || busy()) return;
    const c = content();
    if (!c) return;
    const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);
    el = document.createElement("div");
    el.id = "ifi"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", c.title);
    el.innerHTML = `<img src="/apple-touch-icon.png" alt=""><div class="t"><b class="h">${c.title}</b><p>${c.text}</p></div>
      ${c.btn ? `<button class="go">${c.btn}</button>` : ""}<button class="x" aria-label="Cerrar">×</button>`;
    document.body.classList.toggle("no-nav", !document.querySelector(".nav"));
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el && el.classList.add("show")));
    el.querySelector(".x").onclick = () => { remember(); hide(); };
    const go = el.querySelector(".go");
    if (go) go.onclick = async () => {
      if (!deferred) return;
      deferred.prompt();
      const { outcome } = await deferred.userChoice.catch(() => ({}));
      deferred = null;
      if (outcome !== "accepted") remember();
      hide();
    };
  }

  function hide() {
    if (!el) return;
    const node = el; el = null;
    node.classList.remove("show");
    setTimeout(() => node.remove(), 500);
  }

  // Sale a los 25 segundos de uso, cuando ya ha visto algo de valor
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(show, 25000);
  }

  window.addEventListener("hashchange", () => { if (busy()) hide(); else if (!el) schedule(); });
  if (document.readyState === "complete") schedule(); else window.addEventListener("load", schedule);
})();
