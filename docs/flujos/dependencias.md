# Flujo: Dependencias, Stages y Grupos de Eventos

## Descripción

Este documento cubre la lógica avanzada de eventos: cálculo de fechas por dependencias, organización por stages (etapas) y agrupación de eventos. Estos tres mecanismos son el núcleo operativo del calendario de producción.

---

## Stages / Etapas

Los eventos pertenecen a una etapa. Las 5 etapas del sistema son:

| Clave | Nombre ES | Nombre EN | Color visual |
|-------|-----------|-----------|--------------|
| `bid` | Licitación | Bid | Azul |
| `pre` | Preproducción | Pre-Production | Verde |
| `sht` | Rodaje | Shoot | Naranja |
| `vpst` | Postproducción Video | Video Post | Violeta |
| `spst` | Postproducción Foto | Still Post | Rosa |

La etapa queda visible asociada al evento en el listado y en el calendario. El orden de etapas en el PDF es siempre: `bid → pre → sht → vpst → spst`.

El nombre de cada stage puede editarse haciendo **doble clic** sobre él en la vista de lista. El cambio activa el asterisco de versión. Si el calendario no tiene ninguna etapa al crear el primer evento, se crea automáticamente una etapa por defecto ("Nueva Etapa" / "New Stage").

---

## Grupos de Eventos

Los eventos pueden agruparse para organizarlos y controlarlos colectivamente (ej: Casting, Wardrobe, Locaciones).

### Acciones disponibles sobre grupos

| Acción | Resultado |
|--------|-----------|
| Crear grupo | Añade un grupo disponible al proyecto |
| Eliminar grupo | Elimina el grupo pero **no** elimina los eventos del grupo |
| Apagar grupo | Apaga (desactiva) todos los eventos del grupo |
| Prender grupo | Reactiva los eventos que estaban apagados por el grupo |

### Reglas de encendido

- Apagar un grupo apaga todos sus eventos.
- Pueden prenderse eventos individualmente aunque el grupo esté apagado.
- Al prender nuevamente el grupo, los eventos apagados se prenden y los ya prendidos individualmente siguen prendidos (la lógica individual se preserva).

---

## Dependencias entre Eventos

El motor de dependencias calcula automáticamente las fechas de eventos basándose en relaciones entre ellos. Si el evento B depende del evento A, cuando A cambia de fecha, B se recalcula automáticamente.

### Tipos de Relación

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `after` | X días después del evento padre | Fitting 3 días después de Casting |
| `before` | X días antes del evento padre | PPM 5 días antes del Rodaje |
| `same` | Mismo día que el evento padre | Confirmación coincide con Adjudicación |

### Tipo de Días

| Tipo | Descripción |
|------|-------------|
| `calendar` | Días corridos (incluye sábados y domingos) |
| `business` | Días hábiles (excluye fines de semana y feriados activos del calendario) |

**Nota importante:** Los feriados afectan el cálculo de Business Days solo cuando están activamente asociados al calendario, independientemente de si están visibles o no en la vista.

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

## Orden Manual de Eventos

En el listado de eventos, los eventos pueden arrastrarse hacia arriba o hacia abajo **dentro del mismo stage**.

**Reglas del reordenamiento:**
- Es manual y tiene efecto inmediato en la vista.
- Solo se permite dentro del mismo stage (no se puede mover un evento de Preproducción a Rodaje arrastrando).
- Mover un evento **no** cambia automáticamente su stage.
- Esta acción define el orden visual/listado de eventos dentro de ese stage — **no es un cambio de fecha**.
- El campo `order` del evento refleja la posición en el listado.
- En la **vista calendario**, arrastrar un evento sobre otro evento del mismo día reordena: el evento arrastrado pasa al tope (lane 0), desplazando los demás hacia abajo.

---

## `dateMode: 'manual'` vs `'auto'`

- `'auto'` → la fecha es controlada por el motor. No editar `event.date` directamente.
- `'manual'` → el usuario puso la fecha a mano. El motor la respeta aunque el padre cambie.

Al editar una fecha manualmente en la UI, se cambia `dateMode` a `'manual'` automáticamente.

---

## Indicadores Visuales

| Estado | Indicador UI |
|--------|-------------|
| Fecha calculada automáticamente | Texto en azul en la lista de eventos |
| Dependencia rota (padre sin fecha) | Badge rojo de advertencia en `EventRow.vue` |
| Conflicto de fechas | Badge amarillo en sidebar y filtro "Conflicts" |
| Fecha bloqueada (locked) | Icono de candado; no recalcular |
| Key Date | Estrella visible en el evento |
| Evento inactivo | Apagado / descolorado en la vista |

---

## Archivos Involucrados

| Archivo | Rol |
|---------|-----|
| `composables/useDependencyEngine.js` | Motor completo (sort topológico + cálculo) |
| `stores/projects.js` → `recalcAndSave()` | Orquestador |
| `components/schedule/EventRow.vue` | UI de configuración de dependencias, grupos y reordenamiento |
| `components/schedule/EventListView.vue` | Vista listado con drag-and-drop de orden |
| `utils/helpers.js` → `addDays()`, `subtractDays()` | Aritmética de fechas |
| `utils/constants.js` → `DEFAULT_STAGES`, `DEFAULT_GROUPS` | Valores iniciales |
