// Instala el resolvedor de módulos ANTES de cargar el exportador. Ver README.md.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register(pathToFileURL(import.meta.dirname + "/loader.mjs"));
