# Referencia de Componentes

## Páginas

### `pages/index.vue`
Redirect simple a `/schedule`.

### `pages/schedule/index.vue`
Página principal de la app. Gestiona:
- Las 3 vistas: Calendario, Lista de Eventos, Templates
- Header con info del proyecto activo
- Apertura de modales
- Inicialización de stores en `onMounted`

### `pages/share/index.vue`
Vista pública read-only. Carga el proyecto desde Supabase via token de URL, registra visita y muestra dos meses de calendario.

---

## Componentes de Calendario (`components/schedule/`)

### `CalendarView.vue`
Contenedor principal de la vista de calendario.
- Navegación de meses (prev/next/hoy)
- Selector de inicio de semana (Lun/Dom)
- Selector de unidad de temperatura (°C/°F)
- Botón PDF
- Panel de clima (`WeatherStrip`)
- Quick-add de eventos
- Muestra dos meses en paralelo (`CalendarMonth`)

### `CalendarMonth.vue`
Grid del mes.
- 7 columnas (días de semana)
- Cada celda: número de día, indicador de feriado, barras de eventos
- Multi-lane: los eventos que se superponen se ponen en carriles distintos
- Hoy resaltado
- Soporta modo read-only (para `/share`)

### `EventListView.vue`
Vista tabla de todos los eventos del proyecto.
- Tabs de filtro: Todos / Activos / Conflictos
- Toggle de Key Dates
- Botón de recalcular dependencias
- Encabezados de etapa
- Chips de filtro por grupo
- Cada evento en `EventRow`

### `EventRow.vue`
Fila de un evento en la tabla. Editor inline completo:
- Toggle activo/inactivo
- Checkbox de completado
- Selector de etapa
- Nombre del evento
- Fecha (manual o calculada)
- Duración y tipo de días
- Configuración de dependencia
- Key date toggle
- Dropdown de acciones (editar, duplicar, eliminar)
- Indicador visual de dependencia rota

---

## Layout (`components/layout/`)

### `AppSidebar.vue`
Sidebar izquierda (fondo oscuro).
- Logo e imagen del estudio (editable, con upload)
- Nombre del estudio (editable inline)
- Tabs de filtro: Activos / Archivados
- Búsqueda de proyectos
- Lista de proyectos (`ProjectItem`)
- Botón "+ Nuevo calendario"
- Botón de templates

### `ProjectItem.vue`
Tarjeta de proyecto en la sidebar.
- Punto de color del proyecto
- Nombre, cliente/agencia, equipo
- Badge de estado (Licitando/Adjudicado)
- Número de versión con indicador de cambios pendientes
- Acciones en hover: editar, copiar, archivar, eliminar, toggle visibilidad
- Badge de conflicto si hay eventos en conflicto

---

## Modales (`components/modals/`)

### `ProjectModal.vue`
Modal de creación y edición de proyectos.
- Campos: cliente, agencia, nombre, director, fotógrafo, EP
- Selector de color (12 opciones)
- Selector de estado
- Selector de template (solo en creación)
- Autocompletado de ciudad para clima

### `CopyModal.vue`
Modal para duplicar un proyecto.
- Modo "Solo estructura": copia eventos sin fechas
- Modo "Completo": copia todo incluyendo fechas
- Re-mapea dependencias al copiar

### `ShareDropdown.vue`
Dropdown flotante de sharing.
- Toggle activo/inactivo
- Muestra URL del share
- Botón de copiar al portapapeles
- Contador de visitas

### `HelpModal.vue`
Información general sobre la app.

### `SettingsModal.vue`
Configuración del estudio:
- Nombre del estudio
- Logo (upload de imagen)
- Gestión de usuarios

---

## Otros Componentes

### `components/holidays/HolidaysPanel.vue`
Panel deslizante desde la derecha para gestionar feriados.
- Búsqueda de países (Nager.Date API)
- Agregar/quitar países de feriados del proyecto
- Visualización de feriados por año
- Caché de resultados

### `components/weather/WeatherStrip.vue`
Franja horizontal con datos climáticos.
- Clima actual con emoji
- Temperatura min/max del día
- Hora de amanecer y atardecer
- Previsión de 15 días
- Fuente: Open-Meteo API

### `components/settings/SettingsModal.vue`
Configuración general del estudio y usuarios.

---

## Layouts

### `layouts/default.vue`
Layout principal: sidebar izquierda + área de contenido principal.

### `layouts/share.vue`
Layout para la vista pública: sin sidebar, sin controles de edición.
