// Genera PDF de muestra corriendo el EXPORTADOR REAL de Calendar
// (`composables/usePdfExport.js`), sin navegador y sin cuenta.
//
//   npm run pdf:muestra
//
// Para qué existe y cómo funciona sin Nuxt: ver README.md de esta carpeta.
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.env.CAL_FRONT || path.resolve(import.meta.dirname, "../..");
const DIR  = process.env.PDF_DIR   || path.join(import.meta.dirname, "salida");
fs.mkdirSync(DIR, { recursive: true });

// El calendario de prueba, armado para ejercitar los casos molestos: eventos de varios
// días, de días HÁBILES, fechas clave, un día con más eventos de los que caben en la celda
// (para ver el "+N"), un rango que cruza de mes, y dos eventos que NO deben aparecer.
const hoy = new Date();
const y = hoy.getFullYear();
const m = hoy.getMonth() + 1;
const mSig = m === 12 ? 1 : m + 1;
const d = (dia, mes = m) => `${y}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

const proyecto = {
  name: "Campaña Verano",
  client: "Cliente Grande S.A.",
  agency: "Agencia Norte",
  director: "Paulina Fe",
  photographer: "Ignacio Pinto",
  ep: "Carolina Díaz",
  version: 3,
  hasChanges: false,
  holidays: [],
  disabledHolidays: [],
  events: [
    { active: true, date: d(2),  duration: 3, stage: "bid",  name: "Recepción de Brief", nameEN: "Brief Received" },
    { active: true, date: d(6),  duration: 1, stage: "bid",  name: "Llamada de Treatment", keyDate: true },
    { active: true, date: d(9),  duration: 5, stage: "pre",  name: "Preproducción", durDayType: "business" },
    { active: true, date: d(9),  duration: 1, stage: "pre",  name: "Scouting" },
    { active: true, date: d(9),  duration: 1, stage: "pre",  name: "Casting" },
    { active: true, date: d(9),  duration: 1, stage: "pre",  name: "Wardrobe" },
    { active: true, date: d(9),  duration: 1, stage: "pre",  name: "Tech Scout" },
    { active: true, date: d(9),  duration: 1, stage: "pre",  name: "PPM" },
    { active: true, date: d(16), duration: 2, stage: "sht",  name: "Rodaje", keyDate: true },
    { active: true, date: d(20), duration: 4, stage: "vpst", name: "Post video" },
    { active: true, date: d(26), duration: 2, stage: "spst", name: "Post sonido" },
    { active: true, date: d(1, mSig), duration: 3, stage: "vpst", name: "Entrega final", keyDate: true },
    { active: true, date: d(8, mSig), duration: 1, stage: "spst", name: "Aprobación cliente" },
    // Estos dos NO deben salir en el PDF.
    { active: false, date: d(3), duration: 1, stage: "bid", name: "INACTIVO — no debe aparecer" },
    { active: true, internal: true, date: d(4), duration: 1, stage: "bid", name: "INTERNO — no debe aparecer" },
  ],
};

// El otro calendario para el modo multi: mismo esqueleto, corrido unos días.
const otro = {
  ...proyecto, name: "Campaña Invierno", client: "Otro Cliente Ltda.", version: 1,
  events: proyecto.events.map((e) => ({
    ...e,
    date: e.date.replace(/-(\d\d)$/, (_, dd) => "-" + String(Math.min(28, Number(dd) + 4)).padStart(2, "0")),
  })),
};

// Las festividades: el exportador consulta esta store, no la red.
globalThis.useHolidaysStore = () => ({ getHolidaysForYear: () => [] });

const { usePdfExport } = await import(path.join(RAIZ, "composables/usePdfExport.js"));
const { exportPdf } = usePdfExport();

const CASOS = [
  ["simple",   () => exportPdf(proyecto, "es")],
  ["multi",    () => exportPdf([proyecto, otro], "es")],
  ["borrador", () => exportPdf({ ...proyecto, hasChanges: true }, "es")],
  ["ingles",   () => exportPdf(proyecto, "en")],
];

for (const [nombre, correr] of CASOS) {
  globalThis.__PDF__ = null;
  await correr();
  const g = globalThis.__PDF__;
  if (!g) {
    console.error(`✖ ${nombre}: exportPdf terminó SIN llamar a save()`);
    process.exit(1);
  }
  fs.writeFileSync(path.join(DIR, `${nombre}.pdf`), g.bytes);
  console.log(`✔ ${nombre.padEnd(9)} ${(g.bytes.length / 1024).toFixed(1).padStart(6)} KB   nombre que propone la app: ${g.nombre}`);
}

console.log(`\n${CASOS.length} PDF en ${DIR}`);
