// Modo demostración: /app/?demo  (datos de ejemplo, no guarda nada ni usa la IA)
const PRODS = {"cat_023": {"id": "cat_023", "marca": "CeraVe", "nombre": "Limpiador Hidratante", "tipo": "Limpiador", "cuando": "Mañana y noche", "activos": "Ceramidas, ácido hialurónico", "ayuda": "Hidratación, Barrera", "piel": "Seca", "gama": "low", "donde": "Promofarma", "perfume": false, "retinoide": false, "acido": false, "cantidad": "Una avellana", "precio": 11, "enlace": "https://www.promofarma.com/en/cerave-sa-moisturizing-cleaner-236ml/p-90425"}, "cat_001": {"id": "cat_001", "marca": "The Ordinary", "nombre": "Niacinamide 10% + Zinc 1%", "tipo": "Sérum", "cuando": "Mañana y noche", "activos": "Niacinamida, zinc", "ayuda": "Acné, Poros", "piel": "Grasa / mixta", "gama": "low", "donde": "Primor", "perfume": false, "retinoide": false, "acido": false, "cantidad": "2-4 gotas", "precio": 7, "enlace": "https://www.primor.eu/es_es/the-ordinary-niacinamida-10-zinc-1-serum-122158.html"}, "cat_048": {"id": "cat_048", "marca": "La Roche-Posay", "nombre": "Anthelios UVMune 400 Fluido Invisible SPF50+", "tipo": "Protector solar", "cuando": "Mañana", "activos": "Filtros de amplio espectro", "ayuda": "Manchas", "piel": "Todas", "gama": "equilibrado", "donde": "Farmacia online (farmavazquez.com)", "perfume": false, "retinoide": false, "acido": false, "cantidad": "Dos dedos (cara y cuello)", "precio": 22, "enlace": "https://www.farmavazquez.com/la-roche-posay-anthelios-uvmune-400-fluido-invisible-spf50-50-ml-192229.html"}, "cat_003": {"id": "cat_003", "marca": "The Ordinary", "nombre": "Azelaic Acid Suspension 10%", "tipo": "Tratamiento", "cuando": "Mañana y noche", "activos": "Ácido azelaico", "ayuda": "Rojez, Acné, Manchas", "piel": "Todas", "gama": "low", "donde": "Primor", "perfume": false, "retinoide": false, "acido": false, "cantidad": "Un guisante", "precio": 10, "enlace": "https://www.primor.eu/es_es/the-ordinary-acido-azelaico-en-suspension-10-106602.html"}, "cat_027": {"id": "cat_027", "marca": "CeraVe", "nombre": "Crema Hidratante", "tipo": "Hidratante", "cuando": "Mañana y noche", "activos": "Ceramidas, ácido hialurónico", "ayuda": "Hidratación, Barrera", "piel": "Seca", "gama": "equilibrado", "donde": "Farmacia online (farma2go.com)", "perfume": false, "retinoide": false, "acido": false, "cantidad": "Un guisante", "precio": 16, "enlace": "https://farma2go.com/products/cerave-crema-hidratante-340g"}};

const face = (hue, label) => "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="hsl(${hue},25%,88%)"/><path d="M150 70 C95 70 72 118 72 186 C72 254 106 312 150 318 C194 312 228 254 228 186 C228 118 205 70 150 70 Z" fill="hsl(${hue},30%,78%)"/><text x="150" y="370" font-family="sans-serif" font-size="22" text-anchor="middle" fill="#5C534D">${label}</text></svg>`);

const PARAMS = (d = 0) => [
  { id: "acne", nombre: "Acné", valor: 22 - d, nivel: "leve", zonas: ["menton"], explicacion: "Algunos granitos pequeños en el mentón.", confianza: "alta" },
  { id: "arrugas", nombre: "Arrugas", valor: 12, nivel: "bien", zonas: [], explicacion: "Sin líneas marcadas.", confianza: "alta" },
  { id: "rojez_rosacea", nombre: "Rojez · rosácea", valor: 58 - d * 2, nivel: d ? "leve" : "moderado", zonas: ["mejilla_izquierda", "mejilla_derecha", "nariz"], explicacion: "Rojez difusa en ambas mejillas, algo más marcada en la izquierda.", confianza: "alta" },
  { id: "manchas", nombre: "Manchas", valor: 30, nivel: "leve", zonas: ["sien_derecha"], explicacion: "Pequeñas manchas de sol en la sien derecha.", confianza: "media" },
  { id: "poros", nombre: "Poros", valor: 46 - d, nivel: "moderado", zonas: ["nariz", "mejilla_derecha"], explicacion: "Poros visibles en nariz y zona central de las mejillas.", confianza: "alta" },
  { id: "ojeras", nombre: "Ojeras", valor: 34, nivel: "leve", zonas: ["contorno_ojos"], explicacion: "Ojeras suaves de tono violáceo.", confianza: "media" },
  { id: "hidratacion", nombre: "Hidratación", valor: 52 + d, nivel: "moderado", zonas: ["frente", "mejilla_izquierda"], explicacion: "Zonas algo deshidratadas en frente y mejillas.", confianza: "media" },
  { id: "cicatrices", nombre: "Cicatrices", valor: 8, nivel: "bien", zonas: [], explicacion: "Sin marcas destacables.", confianza: "alta" },
];

const SCAN0 = { id: 1, cycle: 1, kind: "initial", photos: ["u/a", "u/b", "u/c"], score: 64, created_at: new Date(Date.now() - 22 * 864e5).toISOString(),
  result: { titulo: "Piel mixta, reactiva", tipo_piel: "mixta", puntuacion_global: 64, parametros: PARAMS(0), prioridades: ["rojez_rosacea", "poros", "hidratacion"], teaser: "Tu rojez suele responder muy bien a una rutina bien elegida: tu plan te dice exactamente cuál.", derivar: false } };
const weekly = (n, score, d) => ({ id: 1 + n, cycle: 1, kind: "weekly", photos: [`u/w${n}`, "u/b", "u/c"], score, created_at: new Date(Date.now() - (22 - n * 7) * 864e5).toISOString(),
  result: { titulo: "Piel mixta, más calmada", tipo_piel: "mixta", puntuacion_global: score, parametros: PARAMS(d), fase: 1, mensaje: "Tu rojez ha bajado otra vez esta semana y tu piel está más hidratada. ¡Vas muy bien!", cambios: [{ id: "rojez_rosacea", antes: 58 - (d - 3) * 2, ahora: 58 - d * 2, tendencia: "mejor" }, { id: "hidratacion", antes: 49 + d, ahora: 52 + d, tendencia: "mejor" }, { id: "poros", antes: 46, ahora: 46 - d, tendencia: "igual" }] } });

const PLAN = { id: 1, cycle: 1, phase: 1, budget: "equilibrado", created_at: new Date().toISOString(), plan: {
  fase: 1, fase_nombre: "Corregir", objetivo_fase: "Calmar la rojez de las mejillas y reforzar la hidratación.",
  rutina_manana: [
    { paso: 1, tipo: "Limpiador suave", activo: "Ceramidas", producto_id: "cat_023", producto: PRODS.cat_023, cantidad: "Una avellana", como_aplicar: "Masajea 30 segundos con agua templada y aclara sin frotar.", frecuencia: "Cada mañana" },
    { paso: 2, tipo: "Sérum", activo: "Niacinamida 10%", producto_id: "cat_001", producto: PRODS.cat_001, cantidad: "3 gotas", como_aplicar: "Sobre la piel seca, a toquecitos en mejillas y nariz.", frecuencia: "Cada mañana" },
    { paso: 3, tipo: "Protector solar", activo: "SPF 50+", producto_id: "cat_048", producto: PRODS.cat_048, cantidad: "Dos dedos para cara y cuello", como_aplicar: "Último paso, 15 minutos antes de salir.", frecuencia: "Cada mañana, también en invierno" } ],
  rutina_noche: [
    { paso: 1, tipo: "Limpiador suave", activo: null, producto_id: "cat_023", producto: PRODS.cat_023, cantidad: "Una avellana", como_aplicar: "Igual que por la mañana.", frecuencia: "Cada noche" },
    { paso: 2, tipo: "Tratamiento", activo: "Ácido azelaico 10%", producto_id: "cat_003", producto: PRODS.cat_003, cantidad: "Un guisante", como_aplicar: "Sobre la piel seca, evitando ojos y comisuras.", frecuencia: "3 noches por semana al principio" },
    { paso: 3, tipo: "Crema hidratante", activo: "Ceramidas", producto_id: "cat_027", producto: PRODS.cat_027, cantidad: "Un guisante", como_aplicar: "Extiende hacia fuera con las yemas.", frecuencia: "Cada noche" } ],
  agua: { litros: 2, vasos: 8, nota: "Reparte los vasos a lo largo del día." },
  alimentacion: { potenciar: [{ alimento: "Pescado azul", porque: "Omega 3, ayuda a calmar." }, { alimento: "Verdura de hoja", porque: "Antioxidantes." }, { alimento: "Té verde", porque: "Calmante y antioxidante." }],
    reducir: [{ alimento: "Picante y alcohol", porque: "Pueden aumentar la rojez." }, { alimento: "Bollería", porque: "Azúcar y grasas refinadas." }, { alimento: "Bebidas muy calientes", porque: "Enrojecen la piel." }],
    menu_ejemplo: { desayuno: "Avena con frutos rojos y yogur", comida: "Bowl de quinoa, salmón y aguacate", cena: "Crema de calabaza y tortilla" } },
  habitos: ["Duerme 7-8 horas: la piel se repara de noche.", "Protector solar cada mañana, también nublado.", "Lava la funda de la almohada cada semana.", "Agua templada, nunca muy caliente, al lavarte la cara."],
  tareas_diarias: [
    { id: "rutina_manana", titulo: "Rutina de mañana", detalle: "Limpiador · niacinamida · SPF 50", tipo: "piel" },
    { id: "agua", titulo: "2 L de agua", detalle: "8 vasos", tipo: "agua" },
    { id: "comida", titulo: "Comida antiinflamatoria", detalle: "Pescado azul o verdura de hoja", tipo: "dieta" },
    { id: "movimiento", titulo: "30 min de movimiento", detalle: "Un paseo cuenta", tipo: "deporte" },
    { id: "rutina_noche", titulo: "Rutina de noche", detalle: "Limpiador · azelaico · crema", tipo: "piel" },
    { id: "sueno", titulo: "A dormir antes de las 0:00", detalle: "7-8 horas", tipo: "sueno" } ] } };

const FEATURES = { result: { forma_rostro: "ovalado", subtono: "neutro", ojos: "almendrados", resumen: "Rostro equilibrado: te favorecen acabados naturales y tonos tierra rosados.", consejos: {
  natural: [{ categoria: "BASE", texto: "Tinte hidratante con acabado satinado, solo donde haga falta.", color: "#E3C3AC" }, { categoria: "MEJILLAS", texto: "Colorete en crema rosa tostado, hacia la sien.", color: "#C98D86" }, { categoria: "LABIOS", texto: "Bálsamo con color nude rosado.", color: "#B97C77" }],
  noche: [{ categoria: "OJOS", texto: "Ahumado marrón difuminado hacia fuera.", color: "#5E4438" }, { categoria: "LABIOS", texto: "Frambuesa mate.", color: "#8E3B54" }],
  cejas_barba: [{ categoria: "CEJAS", texto: "Peina hacia arriba y rellena solo los huecos, un tono más claro que tu pelo.", color: "#6B5244" }, { categoria: "BARBA", texto: "Si la llevas, más corta en mejillas y algo más larga en el mentón.", color: "#4A3A33" }, { categoria: "OJERAS", texto: "Corrector melocotón en el lagrimal antes del corrector.", color: "#E8B79A" }] } } };

export function makeDemo(S, realD) {
  const stage = new URLSearchParams(location.search).get("demo") || "pro";
  const user = { id: "u", email: "demo@ifacelis.com" };
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString("sv"); };
  const all = PLAN.plan.tareas_diarias.map((t) => t.id);
  const st = {
    nuevo: { profile: null, account: { sub_status: "none", free_scan_used: false, cycle: 1, phase: 1 }, scans: [], plan: null },
    informe: { profile: { questionnaire: { sexo: "mujer", edad: 27 }, budget: "equilibrado", photo_consent_at: "x" }, account: { sub_status: "none", free_scan_used: true, cycle: 1, phase: 1 }, scans: [SCAN0], plan: null },
    pro: { profile: { questionnaire: { sexo: "mujer", edad: 27, objetivos: ["rojez"], alergias: [] }, budget: "equilibrado", photo_consent_at: "x" },
      account: { sub_status: "active", free_scan_used: true, cycle: 1, phase: 1, cycle_started_at: new Date(Date.now() - 22 * 864e5).toISOString(), sub_period_end: new Date(Date.now() + 9 * 864e5).toISOString(), stripe_customer_id: "cus" },
      scans: [SCAN0, weekly(1, 67, 3), weekly(2, 71, 6), weekly(3, 74, 9)], plan: PLAN,
      logs: [1, 2, 3, 4, 5].map((n) => ({ day: day(n), done: all, total: all.length })).concat([{ day: day(0), done: ["rutina_manana", "agua:5"], total: all.length }]) },
  }[stage];
  if (stage === "pro") st.scans[3].created_at = new Date(Date.now() - 7 * 864e5).toISOString();
  const photos = { "u/a": face(20, "Inicio"), "u/w1": face(30, "Semana 1"), "u/w2": face(35, "Semana 2"), "u/w3": face(40, "Semana 3") };
  return {
    async session() { return stage === "login" ? null : { user }; },
    async token() { return "demo"; },
    async loadAll() { S.profile = st.profile; S.account = st.account; S.scans = st.scans; S.plan = st.plan; S.logs = st.logs || []; S.features = null; },
    async reloadAccount() { S.account.sub_status = "active"; },
    async saveProfile(p) { S.profile = { ...(S.profile || {}), ...p, updated_at: new Date().toISOString() }; },
    async upload(b, name) { photos[`u/${name}`] = URL.createObjectURL(b); return `u/${name}`; },
    async signed(paths) { return Object.fromEntries(paths.map((p) => [p, photos[p] || face(10, "Foto")])); },
    async saveLog() {},
    async diary() { return []; },
    async diaryAdd() {},
    async chatHistory() { return []; },
    async signIn() {}, async verify() { return { user }; }, async signOut() {},
    async api(path, body) {
      await new Promise((r) => setTimeout(r, 1200));
      if (path === "/api/scan") { const s = body.kind === "weekly" ? weekly(4, 76, 11) : { ...SCAN0, created_at: new Date().toISOString() }; s.created_at = new Date().toISOString(); return { scan: s, plan_dirty: body.kind === "initial" }; }
      if (path === "/api/plan") return { plan: PLAN };
      if (path === "/api/checkout") return { url: "?demo=pro#/generando" };
      if (path === "/api/chat") return { reply: "Para tu piel, 3 gotas de niacinamida por la mañana son suficientes. Ponlas sobre la piel seca, a toquecitos, sobre todo en mejillas y nariz." };
      if (path === "/api/rasgos") return { features: FEATURES };
      if (path === "/api/portal") return { url: "#/cuenta" };
      throw new Error("Demo");
    },
  };
}
