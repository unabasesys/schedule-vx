// Resuelve los alias `~/` de Nuxt y sustituye SOLO las dos stores (que necesitarían Pinia
// y un contexto de Nuxt). El código que se está probando queda intacto.
//
// Y fija jspdf a UNA sola ruta (JSPDF), para dos cosas: que el banco y el exportador usen
// la MISMA instancia del módulo —si no, el parche de `save` cae en una copia distinta y no
// se escribe nada— y que se pueda elegir con qué versión correr.
import { pathToFileURL } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const AQUI  = import.meta.dirname;
const RAIZ  = process.env.CAL_FRONT || path.resolve(AQUI, "../..");
// Por defecto, el jspdf del propio repo. `JSPDF=/ruta/...` sirve para comparar versiones.
const JSPDF = process.env.JSPDF
  || path.join(path.dirname(createRequire(path.join(RAIZ, "package.json")).resolve("jspdf/package.json")), "dist/jspdf.es.min.js");
const STUBS = {
  "~/stores/settings": path.join(AQUI, "stub-settings.mjs"),
};

export function resolve(specifier, context, next) {
  // `jspdf` → el envoltorio que se queda con el PDF; y `#jspdf-real` → la versión real
  // que se quiere probar. Así el banco y el exportador comparten instancia.
  if (specifier === "jspdf" && JSPDF) {
    return { url: pathToFileURL(path.join(AQUI, "envoltorio-jspdf.mjs")).href, shortCircuit: true, format: "module" };
  }
  if (specifier === "#jspdf-real") {
    return { url: pathToFileURL(JSPDF).href, shortCircuit: true, format: "module" };
  }
  if (STUBS[specifier]) return { url: pathToFileURL(STUBS[specifier]).href, shortCircuit: true };
  if (specifier.startsWith("~/")) {
    let p = path.join(RAIZ, specifier.slice(2));
    if (!p.endsWith(".js") && !p.endsWith(".mjs")) p += ".js";
    return { url: pathToFileURL(p).href, shortCircuit: true };
  }
  return next(specifier, context);
}
