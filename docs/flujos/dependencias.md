# Flujo: Dependencias y Cálculo de Fechas

## Descripción

El motor de dependencias calcula automáticamente las fechas de eventos basándose en relaciones entre ellos. Si el evento B depende del evento A, cuando A cambia de fecha, B se recalcula automáticamente.

---

## Tipos de Relación

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `after` | X días después del evento padre | Fitting 3 días después de Casting |
| `before` | X días antes del evento padre | PPM 5 días antes del Rodaje |
| `same` | Mismo día que el evento padre | Confirmación coincide con Adjudicación |

## Tipo de Días

| Tipo | Descripción |
|------|-------------|
| `calendar` | Días corridos (incluye sábados y domingos) |
| `business` | Días hábiles (excluye fines de semana) |

---

## Flujo de Recálculo

### Trigger
Cualquier cambio en un evento con dependencias activas llama:
```
projectsStore.recalcAndSave(projId)
```

### Motor: `useDependencyEngine.recalcProject(proj)`

```
recalcProject(proj)
  │
  ├── 1. Construye grafo de dependencias (mapa eventId → eventId padre)
  │
  ├── 2. Sort topológico (Kahn's algorithm)
  │      Ordena eventos de forma que siempre se procese primero el padre
  │      antes que sus dependientes
  │
  ├── 3. Para cada evento en orden topológico:
  │      ├── Si dateMode === 'manual' → respeta fecha manual, no tocar
  │      ├── Si dep.active === false → no calcular
  │      ├── Si dep.eventId no existe o padre no tiene fecha:
  │      │     → marcar dep.broken = true
  │      └── Si padre tiene fecha válida:
  │            ├── relation 'after'  → addDays(parentDate, dep.days, dep.dayType)
  │            ├── relation 'before' → subtractDays(parentDate, dep.days, dep.dayType)
  │            └── relation 'same'   → fecha = parentDate
  │
  └── 4. Retorna proyecto con fechas actualizadas
```

### Después del recálculo
```
projectsStore.recalcAndSave(projId)
  ├── useDependencyEngine.recalcProject(proj) → proyecto actualizado
  ├── Reemplaza proj en projects[]
  └── save() → localStorage
```

---

## Detección de Ciclos

Antes de guardar una nueva dependencia:
```
hasCircularDep(proj, evId, newDepId)
  ├── DFS desde newDepId siguiendo dependencias
  ├── Si alcanza evId → circular → retorna true
  └── Si no → retorna false → dependencia permitida
```

Si es circular, la UI muestra un error y no guarda la dependencia.

---

## Indicadores Visuales

| Estado | Indicador UI |
|--------|-------------|
| Fecha calculada automáticamente | Texto en azul en la lista de eventos |
| Dependencia rota (padre sin fecha) | Badge rojo de advertencia en `EventRow.vue` |
| Conflicto de fechas | Badge amarillo en sidebar y filtro "Conflicts" |
| Fecha bloqueada (locked) | Icono de candado; no recalcular |

---

## `dateMode: 'manual'` vs `'auto'`

- `'auto'` → la fecha es controlada por el motor. No editar `event.date` directamente.
- `'manual'` → el usuario puso la fecha a mano. El motor la respeta aunque el padre cambie.

Al editar una fecha manualmente en la UI, se cambia `dateMode` a `'manual'` automáticamente.

---

## Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `composables/useDependencyEngine.js` | Motor completo (sort topológico + cálculo) |
| `stores/projects.js` → `recalcAndSave()` | Orquestador |
| `components/schedule/EventRow.vue` | UI de configuración de dependencias |
| `utils/helpers.js` → `addDays()`, `subtractDays()` | Aritmética de fechas |
