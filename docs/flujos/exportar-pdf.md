# Flujo: Exportación a PDF y Versionado

> **Reescrito el 2-sep-2026.** Lo que había acá describía un PDF de TABLA por etapas, en
> horizontal, generado por `composables/usePdfExport.js` desde un botón de
> `CalendarView.vue`. Nada de eso existe: ni ese diseño, ni ese botón, ni ese archivo.
>
> El PDF se rediseñó el 21-abr-2026 (`6ba249a`, el commit que trajo `pages/print/[id].vue`)
> y el exportador viejo quedó sin llamador ese mismo día, pero el documento nunca se
> actualizó. Costó una tarde de auditoría y una afirmación falsa sobre bugs que los
> clientes supuestamente estaban recibiendo.
>
> **Regla que se saca de esto: cuando un flujo se reemplaza, el documento del flujo viejo
> se reescribe o se borra en el MISMO commit.** Un documento desactualizado no es un
> documento incompleto: es una mentira que alguien va a creer.

## Descripción

El PDF del calendario **no se dibuja**: se FOTOGRAFÍA. Una página web (`pages/print/`)
maqueta el calendario en hojas A4 horizontales, `html2canvas` captura cada hoja a PNG y
`jsPDF` pega esos PNG en el documento.

Eso es deliberado y tiene una consecuencia que conviene tener presente: **lo que se ve en
la vista previa es exactamente lo que sale en el PDF**, tipografías y todo, porque es la
misma pantalla. El precio es que el texto del PDF no es seleccionable ni buscable, y que
el archivo pesa alrededde 1 MB por 3 páginas.

---

## Los tres documentos

Todos salen de `components/modals/ShareDropdown.vue`, el menú **Compartir**:

| Opción | A dónde va | Versiona |
|---|---|---|
| **Borrador** | `/print/<id>?draft=1&type=client\|internal` | **No.** Abre la vista previa sin tocar la versión. |
| **Nueva Versión** | `/print/<id>?draft=0&type=client\|internal` | **Sí.** Si hay cambios, `bumpVersion()` antes de abrir. |
| **Daily** | `/print-daily/<id>?from&to&type&lang` | No. Es el schedule operacional día a día. |

### "Para": Cliente o Interno

Un solo par de palabras para los tres documentos, porque es un solo concepto: **si se
incluyen los eventos internos (los del candado)**. `client` los oculta, `internal` los
incluye. No se reformula por sección — está escrito así en `LABELS` de `ShareDropdown.vue`.

---

## Versionado

Todo calendario parte en **versión 0**. `hasChanges` es la banderita del asterisco.

**La pone en `true`** cualquier edición de contenido, en `stores/projects.js`:
`updateProject()`, `addEvent()`, `cycleStatus()` y las demás mutaciones de eventos.

**La limpia UN SOLO lugar:** `bumpVersion()`, que sube `version` en 1, pone
`hasChanges = false`, refresca `updatedAt`/`editedAt` y agenda la sincronización
explícitamente (porque `save()` no la levanta con la bandera ya en false).

Los cambios de VISUALIZACIÓN no tocan la bandera: feriados, °C/°F, inicio de semana, zoom,
idioma. Solo cambian cómo se ve, no qué contiene.

> **Cuidado con `hasChanges`:** es una bandera de PRODUCTO —"editado desde la última
> versión"— y vive en Mongo. NO sirve como "tiene cambios sin guardar": se queda en `true`
> toda la vida de un calendario en uso. Leerla como "sin guardar" ya desactivó en silencio
> la sincronización de frescura una vez. Para eso está `hasUnsyncedWork()`.

---

## El detalle que no es obvio: por qué se abre una pestaña en blanco

`openPrintTab()` hace tres cosas en un orden que importa:

```js
const w = window.open('about:blank', '_blank')      // 1. sincrónico, dentro del gesto
await projectsStore.syncProjectNow(props.project.id) // 2. el servidor ya tiene el estado
if (w) w.location = url                              // 3. recién ahí se apunta a /print
```

1. La pestaña se abre **en blanco y de inmediato**, dentro del gesto del usuario, porque
   Safari bloquea el popup si se abre después de un `await`.
2. **Las páginas de impresión vuelven a pedir el proyecto a la API.** Si el guardado
   diferido todavía viaja, el PDF se arma con datos viejos — típicamente una versión
   atrasada. Por eso se fuerza el sync antes.
3. Con el servidor al día, se apunta la pestaña.

---

## Qué lleva cada hoja

Lo maqueta `pages/print/[id].vue` (y `print-daily/[id].vue` el diario):

- **Encabezado**: logo de la organización, nombre, "PRODUCTION SCHEDULE", proyecto,
  `DRAFT V8*` o la versión, y "LAST UPDATED".
- **Barra de metadatos**: cliente, agencia, director, fotógrafo, productor ejecutivo,
  productor de agencia — se omite el que esté vacío.
- **La grilla del mes**, una hoja por mes, con las barras de evento por etapa, la ★ de las
  fechas clave (sobrevive porque viaja como imagen), el día de hoy marcado, y los feriados.
- **Pie**: "Calendar by unabase.com", "CONFIDENTIAL · FOR PRODUCTION USE ONLY", y `01 / 03`.

El nombre del archivo lo arma `pages/print/[id].vue`:
`Organización_Cliente_Agencia_Proyecto_Versión.pdf`.

---

## Cómo se verifica

**No se puede sin navegador.** `html2canvas` necesita un DOM real, así que ningún banco de
pruebas headless cubre este camino — se intentó, y lo que se probó fue el exportador
muerto.

La forma que sí funciona:

1. Abrir **Compartir → Borrador**. Es seguro: no avanza la versión.
2. Revisar la vista previa y la consola.
3. Apretar **Download PDF** y comparar contra un PDF anterior del mismo calendario.
   `strings archivo.pdf | grep Producer` dice con qué versión de jsPDF se generó, y
   `pdftoppm -r 90 -png` deja las páginas como imágenes para comparar.

Así se verificó la subida de jsPDF 2.5.2 → 4.2.1 (2-sep-2026): mismo calendario, misma
versión, dos PDF a dos días de distancia, idénticos salvo "LAST UPDATED" y el círculo del
día de hoy.

---

## Archivos

| Archivo | Rol |
|---|---|
| `components/modals/ShareDropdown.vue` | El menú Compartir: las tres opciones y el "Para" |
| `pages/print/[id].vue` | La maqueta del calendario + html2canvas + jsPDF |
| `pages/print-daily/[id].vue` | Lo mismo para el schedule diario |
| `stores/projects.js` → `bumpVersion()` | El único lugar que limpia `hasChanges` |
| `stores/settings.js` | Logo y nombre de la organización |
