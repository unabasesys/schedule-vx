# Referencia de Componentes

## Páginas

### `pages/index.vue`
Redirect simple a `/schedule`.

### `pages/schedule/index.vue`
Página principal de la app. Gestiona:
- Las 3 vistas: Calendario, Lista de Eventos, Templates
- Header con info del proyecto activo (nombre, cliente/agencia, director, versión)
- Apertura de modales
- Inicialización de stores en `onMounted`

### `pages/share/index.vue`
Vista pública read-only. Carga el proyecto desde Supabase via token de URL, registra visita y muestra dos meses de calendario. No permite ninguna interacción ni edición.

---

## Componentes de Calendario (`components/schedule/`)

### `CalendarView.vue`
Contenedor principal de la vista de calendario. Superficie de trabajo principal del producto.

- Navegación de meses (prev/next/hoy)
- Alternancia entre 1 mes y 2 meses en pantalla
- Selector de inicio de semana (Lun/Dom)
- Selector de unidad de temperatura (°C/°F)
- Referencia de zona horaria del calendario
- Botón PDF (con opciones: Draft o Nueva Versión Oficial)
- Panel de clima (`WeatherStrip`)
- Quick-add de eventos (doble click en día vacío)
- Muestra uno o dos meses en paralelo (`CalendarMonth`)
- Botón de feriados → abre `HolidaysPanel`

**Nota PRD:** La vista mensual es la superficie principal de trabajo. Debe ser visualmente cercana a Apple Calendar. Los cambios de visualización desde aquí (temperatura, zoom, inicio de semana) **no** activan el asterisco de versión.

### `CalendarMonth.vue`
Grid del mes.

- 7 columnas (días de semana, ajustado al inicio de semana configurado)
- Cada celda: número de día, indicador de feriado (punto gris), barras de eventos
- Multi-lane: los eventos que se superponen se ponen en carriles distintos
- Hoy resaltado visualmente
- Key Dates marcados con estrella ★
- Soporta modo read-only (para `/share`)
- Los feriados se muestran en gris (no disponible como color de proyecto)

### `EventListView.vue`
Vista tabla de todos los eventos del proyecto. Alternativa a la vista de calendario para gestión detallada.

- Tabs de filtro: Todos / Activos / Conflictos
- Toggle de Key Dates
- Botón de recalcular dependencias
- Encabezados de etapa (bid → pre → sht → vpst → spst)
- Chips de filtro por grupo
- Reordenamiento drag-and-drop de eventos dentro del mismo stage
- Cada evento renderizado en `EventRow`

**Nota PRD:** El listado permite arrastrar eventos arriba/abajo solo dentro del mismo stage. Esto cambia el orden visual/listado, **no** el stage ni la fecha del evento.

### `EventRow.vue`
Fila de un evento en la tabla. Editor inline completo:

- Toggle activo/inactivo
- Checkbox de completado
- Selector de etapa
- Nombre del evento (en idioma activo; `name` o `nameEN`)
- Fecha (manual o calculada por dependencia — azul si es auto)
- Duración y tipo de días (Business Days o Calendar Days)
- Configuración de dependencia (evento padre, relación, desfase)
- Key date toggle (estrella)
- Notas del evento
- Dropdown de acciones (editar, duplicar, eliminar)
- Indicador visual de dependencia rota (badge rojo)
- Indicador de fecha bloqueada (candado)

---

## Layout (`components/layout/`)

### `AppSidebar.vue`
Sidebar izquierda (fondo oscuro). Centro de gestión de proyectos.

- Logo e imagen del estudio (editable, con upload)
- Nombre del estudio (editable inline)
- Tabs de filtro: **Activos** / **Archivados** (la búsqueda funciona solo dentro del estado activo)
- Búsqueda de proyectos (filtrada por estado actual)
- Lista de proyectos ordenada por último editado (`ProjectItem`)
- Botón "+ Nuevo calendario"
- Botón de templates

**Nota PRD:** La vista abre por defecto en Activos. El orden del listado es último editado arriba.

### `ProjectItem.vue`
Tarjeta de proyecto en la sidebar.

- Punto de color del proyecto (nunca gris — reservado para feriados)
- Nombre, cliente/agencia, equipo
- Badge de estado (Compitiendo / Ganado / Draft)
- Número de versión con asterisco si hay cambios pendientes (`hasChanges`)
- Acciones en hover: editar, copiar, archivar/activar, eliminar, toggle visibilidad
- Badge de conflicto si hay eventos en conflicto de fechas

---

## Modales (`components/modals/`)

### `ProjectModal.vue`
Modal de creación y edición de proyectos/calendarios.

- Campos: cliente, agencia, nombre, director, fotógrafo, EP
- Ciudad principal de producción (con autocompletado)
- Selector de color (opciones de `PALETTE` — sin gris)
- Selector de estado (Compitiendo, Ganado, Draft)
- Selector de template (solo en creación)
- En edición: actualiza datos pero no cambia template de origen

**Interacción:** Enter confirma, Esc cancela sin guardar.

### `CopyModal.vue`
Modal para duplicar un proyecto.

- Modo **"Solo estructura":** copia eventos sin fechas
- Modo **"Completo":** copia todo incluyendo fechas
- Re-mapea dependencias al copiar (preserva relaciones entre eventos)
- La copia comienza con versión 0

### `ShareDropdown.vue`
Dropdown flotante de sharing.

- Toggle activo/inactivo del link público
- Muestra URL del share completa
- Botón de copiar al portapapeles
- Contador de visitas al link compartido

### `HelpModal.vue`
Información general sobre la app y atajos de teclado.

### `SettingsModal.vue`
Configuración de la organización (equivalente a "Estudio"):

- Nombre del estudio/organización
- Logo (upload de imagen — se guarda como base64)
- Idioma por defecto
- Unidad de temperatura por defecto
- Inicio de semana por defecto
- Zona horaria por defecto
- Formato de fecha (DD/MM/AA o MM/DD/AA)
- Feriados por defecto de la organización
- Templates disponibles
- Gestión de usuarios

---

## Otros Componentes

### `components/holidays/HolidaysPanel.vue`
Panel deslizante desde la derecha para gestionar feriados.

- Búsqueda de países (Nager.Date API)
- Agregar/quitar países de feriados del proyecto
- Visualización de feriados por año
- Toggle de visibilidad de feriados en la vista y en PDF
- Caché de resultados en memoria

**Nota PRD:** Los feriados tienen dos dimensiones independientes: visibilidad (afecta la vista) y activación lógica (afecta cálculo de Business Days). El color de feriados es siempre gris.

### `components/weather/WeatherStrip.vue`
Franja horizontal con datos climáticos.

- Clima actual con emoji (via `weatherCodes.js`)
- Temperatura min/max del día
- Hora de amanecer y atardecer
- Previsión de 15 días
- Soporte para múltiples ciudades/locaciones
- Si no hay datos, informa claramente ("sin información")
- Fuente: Open-Meteo API

### `components/settings/SettingsModal.vue`
Ver descripción en sección Modales arriba.

---

## Layouts

### `layouts/default.vue`
Layout principal: sidebar izquierda + área de contenido principal.

### `layouts/share.vue`
Layout para la vista pública compartida: sin sidebar, sin controles de edición, sin header interno. Solo muestra el calendario en modo lectura.

---

## Patrones de Interacción (consistentes en toda la app)

Según PRD sección 8.13, todos los modales deben seguir este patrón:

| Acción | Tecla / Control |
|--------|----------------|
| Confirmar acción principal | Enter |
| Cancelar / cerrar sin guardar | Esc |
| Acción alternativa | Botón OK / Guardar |

Esto aplica a: creación de eventos, edición de eventos, edición de proyecto/calendario, selección de templates, configuraciones y cualquier otra acción modal.
