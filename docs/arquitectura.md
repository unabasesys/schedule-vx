# Arquitectura — Schedule Nuxt

> **Corregido parcialmente el 2-sep-2026.** Este documento describía Supabase como backend
> y `localStorage` como la persistencia — las dos cosas dejaron de ser verdad en mayo. Se
> corrigieron **las partes verificadas contra el código**: el backend, el almacenamiento, la
> lista de composables, las páginas y las stores. El resto (capas 1, 2, 5 y lo que sigue) NO
> se volvió a verificar: leelo como una referencia útil, no como una garantía.

## Visión General

Calendar es una **SPA client-only** (SSR desactivado) contra un backend propio: la API de
`scheduleBack` (Express + Mongo), que comparte la base de datos con Relations — de ahí que
los contactos sean los mismos en las dos apps.

Pinia es el estado reactivo en memoria y **la fuente de verdad es Mongo**, vía la API.
`localStorage` quedó como **respaldo local** de cada calendario editado, para no perder
trabajo si una escritura falla; no es la persistencia.

```
┌─────────────────────────────────────────────────────────────┐
│                        NAVEGADOR                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Nuxt 3 (SSR: false)               │   │
│  │                                                     │   │
│  │  Pages          Components          Stores           │   │
│  │  ──────         ──────────          ──────           │   │
│  │  /calendar  →   CalendarView    ←→  projects.js      │   │
│  │  /print     →   CalendarMonth   ←→  global.js        │   │
│  │  /print-daily   DailyEventRow   ←→  settings.js      │   │
│  │  /login …   →   AppSidebar      ←→  holidays.js      │   │
│  │                 ...modals...    ←→  weather.js       │   │
│  │                                 ←→  contacts.js      │   │
│  │                                 ←→  auth.js          │   │
│  │  Composables                                         │   │
│  │  ────────────                                        │   │
│  │  useApi               ←── Llamadas a la API          │   │
│  │  useDependencyEngine  ←── Motor de fechas            │   │
│  │  useDialog            ←── Diálogos compartidos       │   │
│  │  usePersist           ←── Respaldo en localStorage   │   │
│  │  useAppBlock          ←── Candado por app            │   │
│  │  useSnapNotice        ←── Avisos de arrastre         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  localStorage: respaldo por calendario + tema + sesión      │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
      scheduleBack      Nager.Date      Open-Meteo
    (API + Mongo,       (feriados)        (clima)
   compartida con
      Relations)
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
| `projects.js` | CRUD de calendarios, eventos, daily y templates; versionado; sincronización |
| `settings.js` | Nombre y logo de la organización, usuarios |
| `auth.js` | Sesión, organización activa, invitaciones |
| `contacts.js` | Directorio de contactos (colección COMPARTIDA con Relations) |
| `holidays.js` | Caché de feriados y llamadas a Nager.Date |
| `weather.js` | Caché de clima y llamadas a Open-Meteo |

### 4. Composables (`composables/`)
Lógica reutilizable desacoplada de la UI.

| Composable | Responsabilidad |
|------------|----------------|
| `useApi` | Todas las llamadas a la API (JWT + cabecera Organization) |
| `useDependencyEngine` | Sort topológico + cálculo de fechas |
| `useDialog` | Los diálogos compartidos con Relations (confirmar, alertar) |
| `usePersist` | Respaldo en localStorage |
| `useAppBlock` | El candado cuando la organización no tiene la app |
| `useSnapNotice` | Los avisos al arrastrar eventos |

El PDF **no tiene composable**: lo generan las páginas `print/` y `print-daily/`
fotografiando la pantalla con html2canvas. Ver [flujos/exportar-pdf.md](flujos/exportar-pdf.md).

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
