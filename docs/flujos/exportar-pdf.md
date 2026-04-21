# Flujo: Exportación a PDF y Versionado

## Descripción

Genera un documento PDF del calendario de producción. Existen dos tipos de PDF: **Draft** (de trabajo, no incrementa versión) y **Versión Oficial** (formal, incrementa versión). El sistema de versionado permite distinguir entre el estado de trabajo y el estado oficial del calendario.

---

## Versionado del Calendario

### Versión inicial
Todo calendario comienza en **Versión 0**.

### Estado "con cambios" (asterisco)
Cuando hay cambios sin versionar, el número de versión lleva un asterisco:
- Ejemplo: `Versión 1*`

**Qué activa el asterisco (cambios de contenido):**
- Editar datos del proyecto (cliente, agencia, director, etc.)
- Crear, editar o eliminar eventos
- Cambiar fechas de eventos
- Cualquier cambio que altere el contenido formal del calendario

**Qué NO activa el asterisco (cambios de visualización):**
- Mostrar u ocultar feriados
- Cambiar temperatura entre °C y °F
- Cambiar inicio de semana
- Cambiar zoom (1 mes vs 2 meses)
- Cambiar el idioma del calendario (ES ↔ EN)
- Cualquier ajuste que solo afecte cómo se ve, no qué contiene

---

## Modos de Exportación

### Modo 1: Draft (Borrador de Trabajo)

- Genera un PDF con **marca DRAFT** visible.
- **No incrementa** la versión del calendario.
- **No cambia** el estado del asterisco.
- Solo disponible si hay cambios no versionados (si `hasChanges === true`).
- Una vez creada una versión oficial sin cambios posteriores, la opción Draft no debe aparecer.
- Sirve para compartir internamente o revisar sin comprometer una versión oficial.

### Modo 2: Versión Oficial

- **Incrementa la versión** del calendario (ej: de `1*` a `2`).
- Limpia el asterisco (`hasChanges = false`).
- Genera el PDF sin marca DRAFT.
- Una versión oficial puede descargarse múltiples veces mientras no cambien datos ni eventos.
- Cada nueva versión oficial es un hito formal del calendario.

---

## Trigger

- Usuario hace clic en el botón **"PDF"** en `CalendarView.vue`
- Se abre un selector: Draft o Nueva Versión Oficial
- Se llama `usePdfExport().exportPdf(proj, lang, mode)` según la opción elegida

---

## Proceso de Generación

```
exportPdf(proj, lang, mode)
  │
  ├── 1. Inicializa jsPDF en modo Landscape A4
  │
  ├── 2. Header
  │      ├── Logo del estudio/organización (si existe, base64)
  │      ├── Nombre del cliente / agencia / proyecto
  │      ├── Director / Fotógrafo / EP
  │      ├── Versión + fecha de exportación
  │      └── Si mode === 'draft' → marca DRAFT visible
  │
  ├── 3. Tabla de eventos (agrupados por etapa)
  │      ├── Orden de etapas: bid → pre → sht → vpst → spst
  │      ├── Cabecera de etapa con color de etapa
  │      ├── Por cada evento activo:
  │      │     ├── Columna: Etapa
  │      │     ├── Columna: Nombre del evento (en `lang`)
  │      │     ├── Columna: Fecha formateada (según formato de org)
  │      │     ├── Columna: Duración (días calendario/hábiles)
  │      │     └── Si keyDate === true → fila con fondo negro y texto blanco (badge destacado)
  │      └── Filas alternas con fondo gris suave
  │
  ├── 4. Feriados en PDF
  │      └── El usuario puede optar por mostrar u ocultar feriados en el PDF
  │
  ├── 5. Footer (cada página)
  │      ├── Número de página (izquierda)
  │      ├── "CONFIDENTIAL – FOR PRODUCTION USE ONLY" (centrado)
  │      └── Timestamp de exportación (derecha, fuente pequeña)
  │
  ├── 6. Si mode === 'official':
  │      ├── proj.version += 1
  │      ├── proj.hasChanges = false
  │      └── save() → localStorage
  │
  └── 7. Descarga automática del PDF
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

## Branding Organizacional en PDF

El PDF debe poder reflejar el branding de la organización:
- Logo de la organización en el header
- Nombre de la organización
- En versiones futuras: colores, pie de página personalizado, encabezado de marca

El logo se obtiene de `settingsStore.logo` (base64 guardado en localStorage).

---

## Consideraciones

- Solo se exportan eventos con `active = true`.
- El idioma del PDF sigue el parámetro `lang` pasado — puede diferir del idioma de la UI.
- El formato de fecha en el PDF usa el configurado por la organización.
- No requiere conexión a internet; todo se genera en el cliente.
- Los feriados pueden incluirse o excluirse visualmente del PDF según preferencia del usuario.

---

## Criterios de Aceptación

- Un calendario nuevo parte en versión 0.
- Cambiar un evento activa el asterisco de versión.
- Cambiar visualización **no** activa el asterisco.
- El usuario puede descargar Draft solo si hubo cambios (`hasChanges === true`).
- El usuario puede crear una nueva versión oficial desde el PDF.
- La versión oficial incrementa el número de versión y limpia el asterisco.
- El Draft genera PDF con marca DRAFT visible.
- El Draft no incrementa la versión.

---

## Archivos Involucrados

| Archivo | Rol |
|---------|-----|
| `composables/usePdfExport.js` | Lógica completa de generación |
| `components/schedule/CalendarView.vue` | Botón trigger + pasa datos |
| `stores/projects.js` | Gestión de versión y hasChanges |
| `stores/settings.js` | Logo y nombre del estudio |
| `utils/helpers.js` → `fmtDate()` | Formato de fechas |
| `utils/constants.js` → `STAGE_ORDER` | Orden de etapas |
