# Flujo: Creación de Proyecto y Calendario

## Descripción

Un usuario crea un nuevo calendario de producción desde la sidebar izquierda. Todo proyecto tiene asociado un calendario operativo y versionable.

---

## Pasos

### 1. Trigger
- El usuario hace clic en **"+ Nuevo calendario"** en `AppSidebar.vue`
- Se llama `globalStore.openProjectModal(null)` → abre `ProjectModal.vue` en modo creación

### 2. Formulario (`ProjectModal.vue`)
El usuario completa:

| Campo | Descripción | Requerido |
|-------|-------------|-----------|
| **Cliente** | Nombre del cliente | Sí |
| **Agencia** | Agencia que contrata | Sí |
| **Nombre del proyecto** | Identificador interno | Sí |
| **Director** | Director de la producción | Sí |
| **Fotógrafo** | DOP o fotógrafo principal | Sí |
| **EP** | Executive Producer | Sí |
| **Ciudad** | Ciudad principal para clima (con autocompletado) | Sí |
| **Estado** | `competing` (Compitiendo), `awarded` (Ganado) o `draft` | Sí |
| **Color** | Uno de los colores de `PALETTE` en `constants.js` | Sí |
| **Template** | Plantilla base opcional (solo en creación) | No |

**Regla de color:** El gris está reservado exclusivamente para feriados. No debe aparecer como opción al crear o editar un proyecto.

### 3. Estados del Proyecto

| Estado | Clave | Descripción |
|--------|-------|-------------|
| Compitiendo | `competing` | Proyecto en licitación |
| Ganado | `awarded` | Proyecto adjudicado |
| Draft | `draft` | Borrador en preparación |
| Archivado | `archived` | Proyecto fuera de la vista activa |

### 4. Acción al confirmar
Se llama `projectsStore.createProject(data)` en `stores/projects.js`:

```
createProject(data)
  ├── Genera ID único con uid()
  ├── Stages: [] vacío por defecto (sin template) ó heredados del template seleccionado
  ├── Groups: DEFAULT_GROUPS por defecto ó heredados del template seleccionado
  ├── Si template seleccionada → copia eventos, stages y groups de esa template
  ├── Si no → stages [], grupos por defecto, eventos []
  ├── Versión inicial: 1
  ├── hasChanges: false
  ├── Agrega proyecto a projects[]
  ├── Llama selectProject(newId)
  └── Llama save() → usePersist().persist() → localStorage
```

### 5. Herencia de Defaults de Organización
Al crear un calendario nuevo, se cargan los defaults de la organización (desde `stores/settings.js`):
- Idioma por defecto
- Unidad de temperatura (°C / °F)
- Inicio de semana (lunes o domingo)
- Zona horaria
- Formato de fecha (DD/MM/AA o MM/DD/AA)
- Feriados por defecto

El calendario puede sobrescribir cualquier valor heredado sin afectar los defaults de la organización.

### 6. Persistencia
`usePersist.persist()` serializa el estado completo a `localStorage['ub_projects']`.

### 7. Resultado en UI
- La app redirige automáticamente al nuevo proyecto (vista calendario)
- El proyecto aparece en la sidebar con su color y estado
- La metadata del proyecto es visible en el header del calendario
- Si no hay eventos, se muestra el estado vacío con sugerencia de agregar eventos
- Versión aparece como "0"

---

## Datos Iniciales por Defecto

| Campo | Valor |
|-------|-------|
| Etapas | Vacío (se crean con "+ Stage") — o heredadas del template si se seleccionó uno |
| Grupos | 7 grupos de `DEFAULT_GROUPS` (Casting, Wardrobe, etc.) — o heredados del template |
| Eventos | Vacío, o copiados del template seleccionado |
| Ciudades | Vacío, o ciudad elegida en formulario |
| Lang | `'es'` por defecto (o default de organización) |
| Version | `0` |
| hasChanges | `false` |

---

## Información Visible en el Calendario

Una vez creado, el calendario muestra:
- Nombre del proyecto
- Cliente y agencia
- Director y/o fotógrafo
- Productor ejecutivo
- Ciudad principal de producción
- Estado (Compitiendo / Ganado / Draft)
- Número de versión

---

## Branding Organizacional

El calendario y sus salidas exportables deben poder reflejar el branding de la organización (logo, nombre, colores). Esto es una base funcional del producto — su profundidad visual puede crecer en versiones posteriores.

---

## Flujo de Copia de Proyecto (`CopyModal.vue`)

Para duplicar un proyecto existente:

- **Modo "Solo estructura":** copia eventos sin fechas
- **Modo "Completo":** copia todo incluyendo fechas
- Re-mapea dependencias al copiar (preserva relaciones entre eventos)
- La copia comienza con versión 0

---

## Archivos Involucrados

| Archivo | Rol |
|---------|-----|
| `components/layout/AppSidebar.vue` | Botón trigger |
| `components/modals/ProjectModal.vue` | Formulario UI |
| `stores/projects.js` → `createProject()` | Lógica de creación |
| `stores/global.js` → `openProjectModal()` | Control de modal |
| `stores/settings.js` | Defaults de organización |
| `composables/usePersist.js` → `persist()` | Guardado |
| `utils/constants.js` | `DEFAULT_GROUPS`, `PALETTE` (DEFAULT_STAGES solo se usa en template IPS built-in) |
