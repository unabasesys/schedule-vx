# Arquitectura — Schedule Nuxt

## Visión General

Schedule Nuxt es una **SPA client-only** (SSR desactivado). Todo el estado vive en el cliente: `localStorage` para persistencia y Pinia para estado reactivo en memoria. El único backend externo usado de forma propia es Supabase, exclusivamente para la funcionalidad de sharing público.

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVEGADOR                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Nuxt 3 (SSR: false)               │   │
│  │                                                     │   │
│  │  Pages          Components          Stores           │   │
│  │  ──────         ──────────          ──────           │   │
│  │  /schedule  →   CalendarView    ←→  projects.js      │   │
│  │  /share     →   CalendarMonth   ←→  global.js        │   │
│  │                 EventListView   ←→  settings.js      │   │
│  │                 AppSidebar      ←→  holidays.js      │   │
│  │                 ...modals...    ←→  weather.js       │   │
│  │                                                     │   │
│  │  Composables                                         │   │
│  │  ────────────                                        │   │
│  │  useDependencyEngine  ←── Motor de fechas            │   │
│  │  usePersist           ←── Wrapper localStorage       │   │
│  │  useSupabase          ←── Cliente Supabase           │   │
│  │  usePdfExport         ←── Generación PDF             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  localStorage:  ub_projects, ub_templates, ub_studio, ...  │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         Supabase      Nager.Date      Open-Meteo
        (sharing)      (holidays)      (weather)
```

---

## Capas de la Aplicación

### 1. Páginas (`pages/`)
Punto de entrada del router de Nuxt. Mínima lógica; delegan en componentes y stores.

### 2. Componentes (`components/`)
UI reactiva. Se organizan por dominio:
- `schedule/` — vistas de calendario y eventos
- `layout/` — estructura de la app (sidebar)
- `modals/` — diálogos y paneles flotantes
- `holidays/` y `weather/` — integraciones específicas
- `settings/` — configuración del estudio

### 3. Stores Pinia (`stores/`)
Estado global de la aplicación. Son la fuente de verdad en memoria.

| Store | Responsabilidad |
|-------|----------------|
| `global.js` | Vista activa, filtros, estado de modales, lang |
| `projects.js` | CRUD de proyectos, eventos y templates |
| `settings.js` | Studio name, logo, usuarios |
| `holidays.js` | Caché de feriados y llamadas a Nager.Date |
| `weather.js` | Caché de clima y llamadas a Open-Meteo |

### 4. Composables (`composables/`)
Lógica reutilizable desacoplada de la UI.

| Composable | Responsabilidad |
|------------|----------------|
| `useDependencyEngine` | Sort topológico + cálculo de fechas |
| `usePersist` | Lee/escribe localStorage |
| `useSupabase` | Todas las operaciones con Supabase |
| `usePdfExport` | Genera y descarga el PDF |

### 5. Utils (`utils/`)
Funciones puras sin estado. Importadas automáticamente por Nuxt.

| Util | Contenido |
|------|-----------|
| `constants.js` | MASTER_TEMPLATE, DEFAULT_STAGES/GROUPS/CITIES, PALETTE |
| `helpers.js` | uid, fmtDate, addDays, subtractDays, etc. |
| `weatherCodes.js` | Mapa WMO code → emoji |

---

## Persistencia

```
Acción del usuario
      ↓
  Store Pinia (memoria)
      ↓
  usePersist.persist()
      ↓
  localStorage (persistente)
```

En el próximo arranque:
```
Nuxt mount
  → store.init()
  → usePersist.load()
  → localStorage → Pinia stores
```

La app funciona 100% offline. La única excepción es:
- Activar/ver un share → requiere Supabase
- Ver feriados → requiere Nager.Date API
- Ver clima → requiere Open-Meteo API

---

## Internacionalización

- `@nuxtjs/i18n` con estrategia `no_prefix` (sin `/es` o `/en` en la URL)
- Strings en `locales/es.json` y `locales/en.json`
- Idioma guardado en `localStorage['ub_lang']`
- Los eventos tienen `name` (español) y `nameEN` (inglés); se muestra según `lang`

---

## Convenciones Importantes

1. **Sin TypeScript** — JS puro. No agregar `.ts` ni interfaces TypeScript.
2. **Auto-imports** — stores, composables y utils no necesitan `import` explícito.
3. **Sin SSR** — no usar `process.server`, `$fetch` con SSR, ni cookies para estado.
4. **dateMode** — nunca modificar `event.date` directamente si `dateMode === 'auto'`; siempre pasar por `recalcAndSave()`.
5. **Motor de dependencias** — cambios en `useDependencyEngine.js` afectan todas las fechas automáticas; testear con proyectos que tengan cadenas largas de dependencias.
