# CLAUDE.md — Calendar by unabase

> Guía de colaboración para Claude Code en este proyecto.

---

## 1. Descripción del Producto

**Calendar by unabase** es una aplicación para crear y gestionar calendarios de producción audiovisual y creativa.

El producto busca replicar la familiaridad operativa de herramientas que la industria ya usa —especialmente **Apple Calendar** y **Google Sheets con vista mensual**— pero adaptadas a la lógica real de producción.

La propuesta no es introducir una herramienta completamente nueva, sino una evolución natural del flujo actual de trabajo.

**El problema que resuelve:** Los equipos de producción creativa construyen sus calendarios en herramientas genéricas no diseñadas para producción. Esto genera falta de estructura para eventos de producción, dificultad para manejar dependencias reales, falta de lógica de versionado formal, poca integración de feriados y clima, repetición de procesos, poca consistencia en nombres de eventos y poca colaboración entre equipos.

**Objetivo del producto:** Permitir que usuarios de producción creen, editen, organicen y exporten calendarios de producción de manera rápida, intuitiva, consistente y profesional.

**Stack:** Nuxt 3 · Vue 3 · Pinia · Supabase · dayjs · jsPDF · i18n (es/en)
**Modo:** Client-only (SSR desactivado) · localStorage-first · Supabase solo para sharing

---

## 2. Usuarios Objetivo

**Usuario principal:** Profesionales de producción o coordinación dentro de industrias creativas:
- Productores y productores ejecutivos
- Coordinadores de producción y postproducción
- Asistentes de producción
- Equipos de agencias de publicidad y diseño
- Estudios de diseño y estudios fotográficos
- Productoras audiovisuales y de publicidad/comerciales
- Casas de postproducción

**Contexto de uso:** Usuarios acostumbrados a trabajar con Apple Calendar, hojas de cálculo, calendarios mensuales hechos manualmente y cronogramas compartidos dentro de equipos de producción.

---

## 3. Principios del Producto

1. **Familiaridad visual inmediata** — debe verse como una herramienta que ya conocen
2. **Curva de aprendizaje baja** — sin onboarding complejo
3. **Edición rápida** — doble click para crear/editar
4. **Terminología de industria** — usar los términos reales del rubro
5. **Estructura clara para producción real** — etapas, dependencias, feriados, weather
6. **Flexibilidad sin perder simplicidad** — customizable pero no abrumador
7. **Versionado formal** — cuando el calendario se convierte en documento compartible
8. **Consistencia entre calendarios** — templates para reutilizar estructura
9. **Rapidez de ejecución** — calendarios en minutos, no horas
10. **Capacidad de colaboración** — compartir con equipos externos
11. **Posibilidad de aplicar branding de organización** — logo, colores, nombre

---

## 4. Arquitectura General

```
schedule-nuxt/
├── pages/
│   ├── index.vue              # Redirect → /schedule
│   ├── schedule/index.vue     # App principal
│   └── share/index.vue        # Vista pública compartida (read-only)
├── components/
│   ├── schedule/              # Calendario y eventos
│   │   ├── CalendarView.vue   # Contenedor del mes con navegación
│   │   ├── CalendarMonth.vue  # Grid del mes con eventos
│   │   ├── EventListView.vue  # Vista tabla de eventos
│   │   └── EventRow.vue       # Fila de evento individual (editor inline)
│   ├── layout/
│   │   ├── AppSidebar.vue     # Sidebar izquierda con proyectos
│   │   └── ProjectItem.vue    # Tarjeta de proyecto en sidebar
│   ├── modals/
│   │   ├── ProjectModal.vue   # Crear/editar proyecto
│   │   ├── CopyModal.vue      # Duplicar proyecto
│   │   ├── ShareDropdown.vue  # Panel de link compartido
│   │   └── HelpModal.vue      # Ayuda
│   ├── holidays/
│   │   └── HolidaysPanel.vue  # Panel de feriados por país
│   ├── weather/
│   │   └── WeatherStrip.vue   # Franja de clima
│   └── settings/
│       └── SettingsModal.vue  # Configuración del estudio
├── stores/                    # Estado global (Pinia)
│   ├── global.js              # UI state: vista activa, filtros, modales
│   ├── projects.js            # Proyectos, eventos, templates (~480 líneas)
│   ├── settings.js            # Configuración del estudio y usuarios
│   ├── holidays.js            # Caché de feriados (Nager.Date API)
│   └── weather.js             # Caché de clima (Open-Meteo API)
├── composables/
│   ├── useSupabase.js         # Cliente Supabase + funciones de sharing
│   ├── usePersist.js          # Wrapper de localStorage
│   ├── useDependencyEngine.js # Motor de cálculo de fechas por dependencias
│   └── usePdfExport.js        # Exportación a PDF con jsPDF
├── utils/
│   ├── constants.js           # MASTER_TEMPLATE (101 eventos), grupos, ciudades, etapas
│   ├── helpers.js             # uid, fmtDate, addDays, subtractDays, etc.
│   └── weatherCodes.js        # Códigos WMO → emoji
├── locales/
│   ├── es.json                # Strings en español
│   └── en.json                # Strings en inglés
└── public/css/
    ├── colors.css             # CSS variables / tokens de color
    └── styles.css             # Estilos globales
```

**Referencia legacy:** `../calendario-produccion.html` — versión standalone en vanilla JS que sirvió de base. Consultar para entender flujos de negocio.

---

## 5. Modelo Conceptual

### Organización
Entidad principal del sistema. Define los parámetros globales que todos los calendarios heredan:
- Defaults globales (idioma, temperatura, inicio de semana, zona horaria, formato de fecha)
- Templates compartidos
- Feriados por defecto
- Branding organizacional (logo, nombre, colores)

### Proyecto
Entidad con la información general de producción. Contiene: cliente, agencia, nombre del proyecto, director y/o fotógrafo, productor ejecutivo, ciudad principal de producción y estado.

### Calendario
Representación operativa y versionable del proyecto. Contiene: eventos, feriados asociados, weather asociado, versión, PDF exportable, configuración específica y template de origen.

---

## 6. Modelos de Datos Clave

### Project
```js
{
  id, client, agency, name, director, photographer, ep,
  status: 'competing' | 'awarded' | 'archived',
  color, lang: 'es' | 'en',
  version, hasChanges, shareToken, shareActive, shareViews,
  events: Event[], stages: Stage[], groups: Group[],
  holidays: Holiday[], cities: City[]
}
```

### Event
```js
{
  id, templateId, name, nameEN,
  stage: 'bid' | 'pre' | 'sht' | 'vpst' | 'spst',
  date,           // YYYY-MM-DD o vacío
  dateMode: 'manual' | 'auto',
  duration, durDayType: 'calendar' | 'business',
  active, completed, keyDate, locked, notes, order,
  groups: string[],
  dep: {
    active, eventId, relation: 'after' | 'before' | 'same',
    days, dayType: 'calendar' | 'business', broken
  }
}
```

### Stage
```js
{ id, key: 'bid'|'pre'|'sht'|'vpst'|'spst', name, nameEN, active }
```

---

## 7. Terminología del Producto

| Término | Significado |
|---------|-------------|
| Stages / Etapas | Las 5 fases del proyecto: Licitación, Preproducción, Rodaje, Video Post, Still Post |
| Key Dates / Fechas clave | Eventos marcados como hitos importantes (estrella visual) |
| Business Days / Días hábiles | Días que excluyen fines de semana (y feriados activos) |
| Calendar Days / Días corridos | Todos los días incluyendo fines de semana |
| Draft | PDF de trabajo con marca DRAFT, no incrementa versión |
| Official Version | PDF oficial que incrementa la versión del calendario |
| Template | Estructura reutilizable de eventos para nuevos calendarios |
| Holiday Calendars / Calendarios de feriados | Calendarios de días festivos por país |

---

## 8. Reglas de Negocio Principales

1. La organización define los defaults; el calendario puede sobrescribir lo heredado.
2. No hay persistencia propia de usuario por ahora — un solo set de datos por org.
3. **El gris está reservado para feriados** — ningún proyecto/calendario puede usar gris.
4. La búsqueda de proyectos funciona solo dentro del estado actual (Activos o Archivados).
5. Cambios de contenido formal (eventos, datos del proyecto) activan el asterisco de versión.
6. Cambios de visualización (mostrar/ocultar feriados, temperatura, inicio de semana, **idioma del calendario**) **no** activan el asterisco.
7. El calendario opera bajo su propia zona horaria.
8. Weather múltiple significa múltiples ciudades/locaciones.
9. Las dependencias entre eventos sí afectan fechas automáticamente.
10. **Nombres de eventos bilingües:** nacen replicados entre idiomas y se independizan cuando se edita el idioma contrario (ver docs/flujos para detalle).
11. El reordenamiento manual de eventos se permite solo dentro del mismo stage.
12. La visibilidad de feriados y su impacto en cálculo son cosas separadas — ocultar un feriado no necesariamente desactiva su efecto en Business Days.
13. El calendario y sus salidas deben poder reflejar branding de la organización.

---

## 9. Flujos Principales

Ver carpeta `/docs/` para documentación detallada de cada flujo.

- **Creación de proyecto** → `docs/flujos/creacion-proyecto.md`
- **Dependencias y cálculo de fechas** → `docs/flujos/dependencias.md`
- **Compartir proyectos** → `docs/flujos/compartir.md`
- **Exportación PDF y versionado** → `docs/flujos/exportar-pdf.md`
- **Feriados y clima** → `docs/flujos/feriados-clima.md`
- **Resumen del PRD** → `docs/prd-resumen.md`

---

## 10. Estado y Persistencia

- **Todo se guarda en localStorage** mediante `usePersist.js`
- Claves: `ub_projects`, `ub_templates`, `ub_studio`, `ub_selected`, `ub_lang`, `ub_weekstart`, `ub_tempunit`, `ub_dateformat`, `ub_company`, `ub_users`, `ub_logo`, `ub_org_cities`, `ub_org_default_holidays`
- **Supabase** solo se usa para proyectos compartidos (tabla `shared_projects`)
- No hay backend propio; la app funciona 100% offline excepto sharing y APIs externas

---

## 11. APIs Externas

| API | Uso | Clave |
|-----|-----|-------|
| Nager.Date | Feriados por país/año | Sin clave |
| Open-Meteo | Clima por coordenadas | Sin clave |
| Supabase | Sharing de proyectos | `.env`: `NUXT_PUBLIC_SB_URL`, `NUXT_PUBLIC_SB_KEY` |

---

## 12. Filosofía del Proyecto

**Este proyecto está diseñado para ser embebido como componente dentro de una aplicación mayor**, no para ser una app standalone de producción con toda la infraestructura que eso implicaría.

Por eso:
- **No agregar capas de seguridad** que correspondan al sistema huésped (auth, roles, permisos)
- **No incorporar librerías grandes** si la funcionalidad es alcanzable con lo que ya hay o con código simple
- **No diseñar para escala** — no hay necesidad de paginación, cache servers, queues, ni optimizaciones prematuras
- **No asumir requisitos futuros** — construir solo lo que se pide, la app mayor se encargará de lo que le corresponde
- Mantener el bundle lo más liviano posible para facilitar la integración

---

## 13. Fuera de Alcance (v1)

- Manejo de horarios detallados
- Vistas horarias o semanales complejas
- Persistencia personalizada por usuario
- Múltiples proveedores de weather
- Lógica avanzada multi-zona entre calendarios
- Automatizaciones complejas más allá de dependencias base
- Traducción automática inteligente de nombres de eventos

---

## 14. Riesgos del Producto

- Mezclar Proyecto y Calendario en desarrollo o UX
- Complejizar demasiado la interfaz y romper la familiaridad
- Implementar dependencias sin reglas claras de recálculo
- Generar conflictos de herencia entre organización y calendario
- Tratar weather o feriados como extras cuando en realidad son parte operativa del sistema
- Confundir "visibilidad" de feriados con "aplicación lógica" de feriados
- No definir bien el desacople de nombres bilingües en eventos
- No dejar claro que el orden manual dentro del stage es un orden de lista y no un cambio de fecha

---

## 15. Convenciones de Desarrollo

- **Sin TypeScript** — JS puro en todo el proyecto
- **Sin test suite** actualmente
- **Auto-import** de stores, composables y utils (configurado en `nuxt.config.js`)
- **Componentes** sin prefijo de path (`pathPrefix: false`)
- Nuevos componentes: ir a la carpeta semánticamente correcta, no crear todo en raíz
- Si una funcionalidad crece, extraer en subcarpeta propia (ej: `components/events/`)
- No meter lógica de negocio pesada dentro de componentes; usar stores o composables

---

## 16. Guías por Usuario

---

### 🎬 Jorge (`jorge@unabase.com`) — Productor de Series

**Perfil:** Experto en producción audiovisual, sin conocimientos de programación. Conoce el negocio a fondo pero no el código.

**Cómo colaborar con Jorge:**

- **No mostrar código** salvo que lo pida explícitamente. Cuando sea inevitable, explicarlo en términos simples de negocio ("esto guarda los datos del proyecto" en vez de "esto hace un upsert en Supabase").
- **Escuchar primero:** Si Jorge propone una funcionalidad, entender el problema de negocio antes de diseñar cualquier solución técnica. Hacer preguntas como: ¿Cuándo pasaría esto? ¿Quién lo usa? ¿Qué problema resuelve?
- **Guiar sin bloquear:** Si pide algo técnicamente complejo, explicar las implicancias en términos de usuario (tiempo, datos, experiencia) sin rechazarlo de plano.
- **Organización del código:** Si Jorge quiere agregar funcionalidades nuevas significativas, proponer siempre estructurarlas en su propia carpeta dentro de `components/`, nunca apilar todo en un solo archivo o carpeta existente.
- **Validar negocio al nivel de Jorge:** Cuando hable de etapas de producción, tipos de proyecto, flujos de aprobación, versiones de un calendario o coordinación con directores y agencias — estar a la altura. Ese es su territorio.

**Reglas especiales:**

1. **Al iniciar una tarea:** Antes de empezar, preguntar a Jorge si quiere que se lea alguno de los documentos de referencia y ofrecerle la lista disponible:
   - `docs/prd-resumen.md` — visión del producto, principios y reglas de negocio
   - `docs/arquitectura.md` — cómo está organizada la app
   - `docs/componentes.md` — qué hace cada parte de la pantalla
   - `docs/flujos/creacion-proyecto.md` — cómo se crea un calendario
   - `docs/flujos/dependencias.md` — cómo se calculan las fechas automáticas
   - `docs/flujos/compartir.md` — cómo funciona el link de compartir
   - `docs/flujos/exportar-pdf.md` — cómo se genera el PDF y el versionado
   - `docs/flujos/feriados-clima.md` — cómo funcionan los feriados y el clima

2. **Al completar una tarea:** Actualizar los archivos `.md` afectados (`CLAUDE.md`, docs de flujos o componentes) para reflejar cualquier cambio en la funcionalidad, nuevos componentes o flujos modificados.

3. **Al terminar una funcionalidad nueva:** Preguntar a Jorge si quiere subir esos cambios a GitHub y crear el PR correspondiente.

4. **No dejar que Jorge modifique directamente la estructura de archivos** si no es necesario. Si quiere hacerlo, proponer la estructura correcta y hacerlo por él.

---

### 💻 Johann (`johann@unabase.com`) — Desarrollador Senior

**Perfil:** Desarrollador senior con contexto completo del proyecto.

**Cómo colaborar con Johann:**

- Comunicación técnica directa: nombres de archivos, líneas específicas, patrones de arquitectura.
- Discutir trade-offs de implementación sin simplificar.
- Si propone un cambio arquitectural, evaluar impacto en stores, composables y persistencia.
- Puede y debe modificar estructura de carpetas cuando tenga sentido.
- Asumir que conoce Vue 3 Composition API, Pinia, Nuxt 3 y el motor de dependencias.

---

## 17. Puntos de Atención

- El motor de dependencias (`useDependencyEngine.js`) hace un sort topológico; cualquier cambio en lógica de fechas debe respetar el orden de resolución.
- `stores/projects.js` es el archivo más crítico (~480 líneas). Cambios deben ser quirúrgicos.
- La versión legacy en `calendario-produccion.html` tiene lógica de negocio útil como referencia, pero no se modifica.
- El campo `dateMode: 'auto'` en eventos indica que la fecha es calculada por dependencia — no sobre-escribir manualmente esos valores sin pasar por el motor.
- **Feriados:** la visibilidad visual y el impacto en cálculo de Business Days son independientes. No confundirlos al implementar.
- **Versionado:** Draft no incrementa versión; Official Version sí. Cambios visuales (incluyendo cambio de idioma) no activan asterisco. Usar `setProjectLang()` en vez de `updateProject()` para cambiar idioma.
- **Colores:** gris siempre reservado para feriados. No ofrecerlo como opción de proyecto.
- **Logo:** se guarda como base64 en localStorage. Tamaño máximo aceptado: 512 KB. La validación se hace en `handleLogoUpload()` en `SettingsModal.vue` antes de llamar a `FileReader`.
- **Key Dates:** se renderizan como barra negra con texto blanco tanto en la vista calendario (`CalendarMonth.vue`) como en el PDF (`print/[id].vue`).
- **`setProjectLang()`** — acción en `projects.js` que guarda el idioma del proyecto sin activar `hasChanges`. Usar siempre este método para cambios de idioma, nunca `updateProject()` con `{ lang }`.
- **Detección de dependencias circulares:** `hasCircularDep()` de `useDependencyEngine` está conectada en `EventRow.vue → updateDepEvent()`. Se ejecuta antes de guardar cualquier nueva dependencia.
