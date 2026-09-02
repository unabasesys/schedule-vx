// Busca REFERENCIAS GLOBALES SUELTAS a funciones de `utils/` en el bundle ya construido.
//
// Para qué existe. El 2-sep-2026 salió a producción un `stores/contacts.js` que usaba
// `lifecycleOf` y `hasBadge` de `utils/badges.js` confiando en el auto-import de Nuxt, y el
// auto-import no se inyectó. En el navegador eso es
// `ReferenceError: lifecycleOf is not defined`, y con ese getter caído se cae el directorio
// de contactos entero. Estuvo vivo en producción hasta que alguien lo abrió.
//
// Lo grave es que NADA lo detenía:
//   · el build no falla — compila, empaqueta y despliega perfecto;
//   · las pruebas no lo ven — `tests/setup.js` provee los auto-imports a mano, así que del
//     lado del test la función siempre existe (204 en verde con el bug adentro);
//   · solo revienta en tiempo de ejecución, en el navegador del cliente.
//
// Cómo se detecta. El minificador RENOMBRA todo lo declarado o importado. Un identificador
// que sobrevive con su nombre original y se está llamando es un nombre que nadie declaró:
// una referencia global. Eso es lo que se busca acá.
//
// Corre pegado al build (`npm run build`) para que un despliegue con esta falla NO salga.
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");

// Dónde queda el bundle depende del preset de Nitro, y este repo se construye en DOS
// plataformas mientras dure la migración: Railway usa `node-server` y escribe en
// `.output/public`, Vercel usa su propio preset y escribe en `.vercel/output/static`.
// Mirar solo el primero hacía fallar el build de Vercel — que hoy es producción.
const CANDIDATOS = [".output/public/_nuxt", ".vercel/output/static/_nuxt"];
const dirBundle = CANDIDATOS.map((d) => path.join(raiz, d)).find((d) => fs.existsSync(d));

// Si no aparece en ninguno, se FALLA en vez de pasar de largo: significa que el build
// dejó de escribir donde se espera, y una verificación que se salta a sí misma en
// silencio es peor que no tenerla.
if (!dirBundle) {
  console.error("✖ No encuentro el bundle. ¿Corriste el build? Busqué en:");
  for (const d of CANDIDATOS) console.error(`    ${path.join(raiz, d)}`);
  process.exit(1);
}

// Los nombres que Nuxt auto-importa desde `utils/`: los candidatos a quedar sueltos.
const nombres = new Set();
for (const f of fs.readdirSync(path.join(raiz, "utils")).filter((f) => f.endsWith(".js"))) {
  const src = fs.readFileSync(path.join(raiz, "utils", f), "utf8");
  for (const m of src.matchAll(/^export\s+(?:const|function|let)\s+([A-Za-z_]\w*)/gm)) {
    nombres.add(m[1]);
  }
}

// ¿Es una LLAMADA o la definición de un método abreviado?
//
// `hasBadge(){ ... }` dentro de un objeto conserva su nombre porque es una llave, no una
// referencia — y confundirlo con un error bloquearía despliegues sanos. Se distinguen por
// lo que sigue al paréntesis de cierre: `{` es una definición, cualquier otra cosa es una
// llamada.
const esLlamada = (src, desdeParen) => {
  let prof = 0;
  for (let i = desdeParen; i < src.length; i++) {
    if (src[i] === "(") prof++;
    else if (src[i] === ")") {
      prof--;
      if (prof === 0) {
        const resto = src.slice(i + 1, i + 40).replace(/^\s+/, "");
        return !resto.startsWith("{");
      }
    }
  }
  return true;
};

const hallazgos = [];
for (const archivo of fs.readdirSync(dirBundle).filter((f) => f.endsWith(".js"))) {
  const src = fs.readFileSync(path.join(dirBundle, archivo), "utf8");
  for (const nombre of nombres) {
    // Sin `.` ni `$` ni palabra antes: descarta `store.lifecycleOf(...)` y `miLifecycleOf(...)`.
    const re = new RegExp(`(?<![$\\w.])${nombre}\\s*\\(`, "g");
    for (const m of src.matchAll(re)) {
      const paren = src.indexOf("(", m.index);
      if (esLlamada(src, paren)) {
        hallazgos.push({ nombre, archivo, muestra: src.slice(Math.max(0, m.index - 40), m.index + 40) });
        break;
      }
    }
  }
}

if (!hallazgos.length) {
  console.log(`✔ bundle limpio: ninguno de los ${nombres.size} exports de utils/ quedó como referencia suelta`);
  process.exit(0);
}

console.error("\n✖ REFERENCIAS GLOBALES SUELTAS EN EL BUNDLE\n");
console.error("  Estos nombres se llaman pero nadie los declaró ni los importó. En el");
console.error("  navegador son `ReferenceError`, y el build no se da cuenta.\n");
for (const h of hallazgos) {
  console.error(`  · ${h.nombre}  (${h.archivo})`);
  console.error(`      …${h.muestra.replace(/\n/g, " ")}…`);
}
console.error("\n  Arreglo: importarlos EXPLÍCITAMENTE en el archivo que los usa,");
console.error("  p. ej. `import { lifecycleOf } from '~/utils/badges'`.\n");
process.exit(1);
