# Flujo: Exportación a PDF

## Descripción

Genera un documento PDF del calendario de producción con todos los eventos del proyecto, agrupados por etapa, con fechas y duración.

---

## Trigger

- Usuario hace clic en el botón **"PDF"** en `CalendarView.vue`
- Se llama `usePdfExport().exportPdf(proj, lang)`

---

## Proceso de Generación

```
exportPdf(proj, lang)
  │
  ├── 1. Inicializa jsPDF en modo Landscape A4
  │
  ├── 2. Header
  │      ├── Logo del estudio (si existe, base64)
  │      ├── Nombre del cliente / agencia / proyecto
  │      ├── Director / Fotógrafo / EP
  │      └── Versión + fecha de exportación
  │
  ├── 3. Tabla de eventos (agrupados por etapa)
  │      ├── Orden de etapas: bid → pre → sht → vpst → spst
  │      ├── Cabecera de etapa con color de etapa
  │      ├── Por cada evento activo:
  │      │     ├── Columna: Etapa
  │      │     ├── Columna: Nombre del evento (en `lang`)
  │      │     ├── Columna: Fecha formateada (D/M/YY)
  │      │     ├── Columna: Duración (días calendario/hábiles)
  │      │     └── Si keyDate === true → estrella ★ al lado del nombre
  │      └── Filas alternas con fondo gris suave
  │
  ├── 4. Footer (cada página)
  │      ├── Número de página
  │      └── Timestamp de exportación
  │
  └── 5. Descarga automática del PDF
         Nombre: "[cliente]-[proyecto]-v[version].pdf"
```

---

## Colores de Etapa en PDF

| Etapa | Color |
|-------|-------|
| Licitación (bid) | `#7CAEFF` |
| Preproducción (pre) | `#06CCB4` |
| Rodaje (sht) | `#f97316` |
| Video Post (vpst) | `#a855f7` |
| Still Post (spst) | `#ec4899` |

---

## Consideraciones

- Solo se exportan eventos con `active = true`
- El idioma del PDF sigue el parámetro `lang` pasado (puede diferir del idioma de la UI)
- El logo se renderiza desde `settingsStore.logo` (base64 guardado en localStorage)
- No requiere conexión a internet; todo se genera en el cliente

---

## Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `composables/usePdfExport.js` | Lógica completa de generación |
| `components/schedule/CalendarView.vue` | Botón trigger + pasa datos |
| `stores/settings.js` | Logo y nombre del estudio |
| `utils/helpers.js` → `fmtDate()` | Formato de fechas |
| `utils/constants.js` → `STAGE_ORDER` | Orden de etapas |
