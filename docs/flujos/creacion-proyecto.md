# Flujo: Creación de Proyecto

## Descripción

Un usuario crea un nuevo calendario de producción desde la sidebar izquierda.

---

## Pasos

### 1. Trigger
- El usuario hace clic en **"+ Nuevo calendario"** en `AppSidebar.vue`
- Se llama `globalStore.openProjectModal(null)` → abre `ProjectModal.vue` en modo creación

### 2. Formulario (`ProjectModal.vue`)
El usuario completa:
- **Cliente** — nombre del cliente
- **Agencia** — agencia que contrata
- **Nombre del proyecto** — identificador interno
- **Director** — director de la producción
- **Fotógrafo** — DOP o fotógrafo principal
- **EP** — Executive Producer
- **Color** — uno de los 12 colores de `PALETTE` en `constants.js`
- **Estado** — `competing` (licitando) o `awarded` (adjudicado)
- **Template** — plantilla base opcional (solo en creación)
- **Ciudad** — ciudad principal para clima (con autocompletado)

### 3. Acción al confirmar
Se llama `projectsStore.createProject(data)` en `stores/projects.js`:

```
createProject(data)
  ├── Genera ID único con uid()
  ├── Copia DEFAULT_STAGES desde constants.js
  ├── Copia DEFAULT_GROUPS desde constants.js
  ├── Si template seleccionada → copia eventos de esa template
  ├── Si no → array de eventos vacío []
  ├── Agrega proyecto a projects[]
  ├── Llama selectProject(newId)
  └── Llama save() → usePersist().persist() → localStorage
```

### 4. Persistencia
`usePersist.persist()` serializa el estado completo a `localStorage['ub_projects']`.

### 5. Resultado en UI
- La app redirige automáticamente al nuevo proyecto (vista calendario)
- El proyecto aparece en la sidebar
- Si no hay eventos, se muestra el estado vacío con sugerencia de agregar eventos

---

## Datos iniciales por defecto

| Campo | Valor |
|-------|-------|
| Etapas | 5 etapas de `DEFAULT_STAGES` (bid, pre, sht, vpst, spst) |
| Grupos | 7 grupos de `DEFAULT_GROUPS` (Casting, Wardrobe, etc.) |
| Eventos | Vacío, o copiados de template seleccionada |
| Ciudades | Vacío, o ciudad elegida en formulario |
| Lang | `'es'` por defecto |
| Version | `1` |

---

## Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `components/layout/AppSidebar.vue` | Botón trigger |
| `components/modals/ProjectModal.vue` | Formulario UI |
| `stores/projects.js` → `createProject()` | Lógica de creación |
| `stores/global.js` → `openProjectModal()` | Control de modal |
| `composables/usePersist.js` → `persist()` | Guardado |
| `utils/constants.js` | `DEFAULT_STAGES`, `DEFAULT_GROUPS`, `PALETTE` |
