# Flujo: Compartir Proyecto

## Descripción

Un usuario interno genera un link público para que un cliente externo (agencia, director, etc.) pueda ver el calendario de producción en modo lectura, sin necesidad de tener cuenta.

---

## Actores

- **Usuario interno:** productor, EP o coordinador con acceso a la app
- **Cliente externo:** agencia, director, cliente — solo ve el link compartido
- **Supabase:** backend que almacena el snapshot del proyecto

---

## Flujo: Activar Sharing

### 1. Trigger
- Usuario hace clic en **"Share"** en el header del proyecto
- Se abre `ShareDropdown.vue` como dropdown flotante

### 2. Activar el toggle
```
projectsStore.toggleShare(projId)
  ├── Si no tiene shareToken → genera uno con uid() (8 chars hex)
  ├── Pone shareActive = true
  ├── Llama useSupabase().sbPushShare(proj)
  │     └── Supabase upsert en tabla shared_projects:
  │           { token, project_data: proj, is_active: true }
  └── save() → localStorage
```

### 3. URL generada
```
https://[dominio]/share?token=XXXXXXXX
```
El token se copia al portapapeles con el botón "Copiar link".

---

## Flujo: Vista del Cliente (`/share`)

### 1. Acceso
Cliente abre el link en su navegador → `pages/share/index.vue`

### 2. Carga del proyecto
```
useSupabase().sbGetProject(token)
  └── SELECT * FROM shared_projects WHERE token = ? AND is_active = true
```

Si `is_active = false` o token inválido → mensaje de error.

### 3. Registro de visita
```
useSupabase().sbRecordView(token)
  └── RPC: record_share_view(p_token)
        → UPDATE shared_projects SET view_count = view_count + 1
```

### 4. Render
- Vista de solo lectura con `share.vue` layout
- Muestra dos meses del calendario con eventos del proyecto
- No permite edición ni interacción
- No muestra sidebar ni controles internos

---

## Flujo: Desactivar Sharing

```
projectsStore.toggleShare(projId)  [cuando shareActive = true]
  ├── Pone shareActive = false
  ├── sbPushShare(proj) → Supabase upsert con is_active: false
  └── save()
```

El link existente deja de funcionar. El token se preserva para re-activar si se quiere.

---

## Tabla Supabase: `shared_projects`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `token` | text (PK) | Token único del proyecto |
| `project_data` | json | Snapshot completo del proyecto |
| `is_active` | boolean | Si el link está activo |
| `view_count` | integer | Contador de visitas |
| `created_at` | timestamp | Fecha de creación |

**RPC:** `record_share_view(p_token)` — incremento atómico del contador.

---

## Consideraciones

- El snapshot en Supabase **no se actualiza automáticamente** cuando el proyecto cambia. Hay que volver a activar el share (o habrá que agregar un botón "Sync") para reflejar cambios.
- `shareViews` en el store local se sincroniza al abrir `ShareDropdown` vía `sbGetViews(token)`.
- Si Supabase no está configurado (`.env` vacío), el botón de share muestra un error o se deshabilita.

---

## Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `components/modals/ShareDropdown.vue` | UI del panel de sharing |
| `stores/projects.js` → `toggleShare()` | Lógica de activación |
| `composables/useSupabase.js` | Todas las llamadas a Supabase |
| `pages/share/index.vue` | Vista pública del cliente |
| `layouts/share.vue` | Layout sin sidebar para la vista pública |
