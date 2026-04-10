# CLAUDE.md — Schedule Nuxt

> Guía de colaboración para Claude Code en este proyecto.

---

## 1. Descripción del Proyecto

**Schedule Nuxt** es una aplicación de calendario de producción para agencias y productoras audiovisuales. Permite planificar proyectos de rodaje organizando eventos en 5 etapas (Licitación, Preproducción, Rodaje, Postproducción Video, Postproducción Foto), con fechas automáticas por dependencias, clima, feriados y exportación a PDF.

**Stack:** Nuxt 3 · Vue 3 · Pinia · Supabase · dayjs · jsPDF · i18n (es/en)  
**Modo:** Client-only (SSR desactivado) · localStorage-first · Supabase solo para sharing

---

## 2. Arquitectura General

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

> Si alguien pregunta por qué el código "no se parece" al original: es intencional. `calendario-produccion.html` es el prototipo de una sola página en HTML/JS puro con el que se diseñó y validó la lógica de negocio. La versión actual en Nuxt es una reescritura estructurada en componentes, stores y composables — misma funcionalidad, distinta arquitectura.

---

## 3. Modelos de Datos Clave

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

## 4. Flujos Principales

Ver carpeta `/docs/` para documentación detallada de cada flujo.

- **Creación de proyecto** → `docs/flujos/creacion-proyecto.md`
- **Dependencias y cálculo de fechas** → `docs/flujos/dependencias.md`
- **Compartir proyectos** → `docs/flujos/compartir.md`
- **Exportación PDF** → `docs/flujos/exportar-pdf.md`
- **Feriados y clima** → `docs/flujos/feriados-clima.md`

---

## 5. Estado y Persistencia

- **Todo se guarda en localStorage** mediante `usePersist.js`
- Claves: `ub_projects`, `ub_templates`, `ub_studio`, `ub_selected`, `ub_lang`, `ub_weekstart`, `ub_tempunit`, `ub_logo`
- **Supabase** solo se usa para proyectos compartidos (tabla `shared_projects`)
- No hay backend propio; la app funciona 100% offline excepto sharing y APIs externas

---

## 6. APIs Externas

| API | Uso | Clave |
|-----|-----|-------|
| Nager.Date | Feriados por país/año | Sin clave |
| Open-Meteo | Clima por coordenadas | Sin clave |
| Supabase | Sharing de proyectos | `.env`: `NUXT_PUBLIC_SB_URL`, `NUXT_PUBLIC_SB_KEY` |

---

## 7. Filosofía del Proyecto

**Este proyecto está diseñado para ser embebido como componente dentro de una aplicación mayor**, no para ser una app standalone de producción con toda la infraestructura que eso implicaría.

Por eso:
- **No agregar capas de seguridad** que correspondan al sistema huésped (auth, roles, permisos)
- **No incorporar librerías grandes** si la funcionalidad es alcanzable con lo que ya hay o con código simple
- **No diseñar para escala** — no hay necesidad de paginación, cache servers, queues, ni optimizaciones prematuras
- **No asumir requisitos futuros** — construir solo lo que se pide, la app mayor se encargará de lo que le corresponde
- Mantener el bundle lo más liviano posible para facilitar la integración

---

## 8. Convenciones de Desarrollo

- **Sin TypeScript** — JS puro en todo el proyecto
- **Sin test suite** actualmente
- **Auto-import** de stores, composables y utils (configurado en `nuxt.config.js`)
- **Componentes** sin prefijo de path (`pathPrefix: false`)
- Nuevos componentes: ir a la carpeta semánticamente correcta, no crear todo en raíz
- Si una funcionalidad crece, extraer en subcarpeta propia (ej: `components/events/`)
- No meter lógica de negocio pesada dentro de componentes; usar stores o composables

---

## 8. Guías por Usuario

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

1. **Primera vez que Jorge hable en una nueva sesión:** Pedirle que explique el proyecto detalladamente. Guardar esa información en CLAUDE.md (actualizar la sección de descripción con contexto de negocio que él aporte). Luego, **eliminar esta instrucción de la regla** (punto 1 de esta sección) para que no se repita.

2. **Al iniciar una tarea:** Antes de empezar, preguntarle a Jorge si quiere que se lea alguno de los documentos de referencia y ofrecerle la lista disponible:
   - `docs/arquitectura.md` — cómo está organizada la app
   - `docs/componentes.md` — qué hace cada parte de la pantalla
   - `docs/flujos/creacion-proyecto.md` — cómo se crea un calendario
   - `docs/flujos/dependencias.md` — cómo se calculan las fechas automáticas
   - `docs/flujos/compartir.md` — cómo funciona el link de compartir
   - `docs/flujos/exportar-pdf.md` — cómo se genera el PDF
   - `docs/flujos/feriados-clima.md` — cómo funcionan los feriados y el clima

3. **Al completar una tarea:** Actualizar los archivos `.md` afectados (`CLAUDE.md`, docs de flujos o componentes) para reflejar cualquier cambio en la funcionalidad, nuevos componentes o flujos modificados.

4. **Al terminar una funcionalidad nueva:** Preguntar a Jorge si quiere subir esos cambios a GitHub y crear el PR correspondiente. (El repositorio remoto aún no está conectado — registrar el PR localmente o indicar que está pendiente de conexión remota.)

5. **No dejar que Jorge modifique directamente la estructura de archivos** si no es necesario. Si quiere hacerlo, proponer la estructura correcta y hacerlo por él.

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

## 9. Puntos de Atención

- El motor de dependencias (`useDependencyEngine.js`) hace un sort topológico; cualquier cambio en lógica de fechas debe respetar el orden de resolución.
- `stores/projects.js` es el archivo más crítico (~480 líneas). Cambios deben ser quirúrgicos.
- La versión legacy en `calendario-produccion.html` tiene lógica de negocio útil como referencia, pero no se modifica.
- El campo `dateMode: 'auto'` en eventos indica que la fecha es calculada por dependencia — no sobre-escribir manualmente esos valores sin pasar por el motor.
