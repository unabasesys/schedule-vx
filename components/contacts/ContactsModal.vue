<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal cm-modal">
      <div class="cm-head">
        <h2>{{ isEN ? 'Contacts' : 'Contactos' }}</h2>
        <button class="cm-close" @click="close" :title="isEN ? 'Close' : 'Cerrar'">✕</button>
      </div>
      <p class="cm-sub">
        {{ isEN
          ? 'Shared across all this studio’s calendars.'
          : 'Compartidos entre todos los calendarios de este estudio.' }}
      </p>

      <!-- Add row -->
      <div class="cm-add">
        <input v-model.trim="form.name"  :placeholder="isEN ? 'Name' : 'Nombre'" @keydown.enter="add" />
        <input v-model.trim="form.title"  :placeholder="isEN ? 'Role' : 'Cargo'" @keydown.enter="add" />
        <input v-model.trim="form.email" placeholder="Email" @keydown.enter="add" />
        <input v-model.trim="form.phone" :placeholder="isEN ? 'Phone' : 'Teléfono'" @keydown.enter="add" />
        <!-- Dónde guardarlo en Relations: Clientes o Crew (§9.1). Crew por defecto,
             que es lo que uno agrega desde acá el 95% de las veces. -->
        <select v-model="form.badge" class="cm-badge-sel" :title="isEN ? 'Save in' : 'Guardar en'">
          <option value="crew">Crew</option>
          <option value="clientes">{{ isEN ? 'Clients' : 'Clientes' }}</option>
        </select>
        <button class="cm-add-btn" :disabled="!canAdd || saving" @click="add">
          {{ isEN ? '+ Add' : '+ Agregar' }}
        </button>
      </div>

      <!-- Search -->
      <div class="cm-search">
        <div class="cm-search-wrap">
          <input
            ref="searchRef"
            v-model="query"
            class="cm-search-input"
            :placeholder="isEN ? 'Search by name, role, email or phone…' : 'Buscar por nombre, cargo, email o teléfono…'"
            @keydown.esc.stop.prevent="query = ''"
          />
          <button v-if="query" class="cm-search-x" @click="clearSearch" :title="isEN ? 'Clear' : 'Limpiar'">✕</button>
        </div>
        <span class="cm-count">
          {{ query
            ? `${filtered.length} / ${store.sorted.length}`
            : `${store.sorted.length} ${isEN ? 'contacts' : 'contactos'}` }}
        </span>
      </div>

      <!-- List -->
      <div class="cm-list">
        <div v-if="store.loading" class="cm-empty">{{ isEN ? 'Loading…' : 'Cargando…' }}</div>
        <div v-else-if="!store.sorted.length" class="cm-empty">
          {{ isEN ? 'No contacts yet. Add your first one above.' : 'Aún no hay contactos. Agrega el primero arriba.' }}
        </div>
        <div v-else-if="!filtered.length" class="cm-empty">
          {{ isEN ? 'Nobody matches that search.' : 'Nadie coincide con esa búsqueda.' }}
        </div>
        <template v-else>
          <div class="cm-row cm-row-head">
            <span>{{ isEN ? 'Name' : 'Nombre' }}</span>
            <span>{{ isEN ? 'Role' : 'Cargo' }}</span>
            <span>Email</span>
            <span>{{ isEN ? 'Phone' : 'Teléfono' }}</span>
            <span>{{ isEN ? 'In' : 'En' }}</span>
            <span></span>
          </div>
          <div v-for="c in filtered" :key="c.id" class="cm-row">
            <template v-if="editingId === c.id">
              <input v-model.trim="editForm.name" />
              <input v-model.trim="editForm.title" />
              <input v-model.trim="editForm.email" />
              <input v-model.trim="editForm.phone" />
              <span class="cm-badges">{{ etiquetasDe(c) }}</span>
              <div class="cm-acts">
                <button class="cm-icon cm-ok" @click="saveEdit(c.id)" :title="isEN ? 'Save' : 'Guardar'">✓</button>
                <button class="cm-icon" @click="editingId = null" :title="isEN ? 'Cancel' : 'Cancelar'">✕</button>
              </div>
            </template>
            <template v-else>
              <span class="cm-name">{{ c.name || '—' }}</span>
              <span>{{ c.title || '—' }}</span>
              <span class="cm-mail">{{ c.email || '—' }}</span>
              <span>{{ c.phone || '—' }}</span>
              <!-- En qué listas de Relations aparece. Se puede tener las dos: a la
                   misma persona le vendemos y le compramos. Un clic alterna, y
                   quitar NO elimina el contacto ni lo saca de Calendar. -->
              <span class="cm-badges">
                <button
                  v-for="b in BADGES"
                  :key="b.key"
                  class="cm-badge"
                  :class="{ on: tiene(c, b.key) }"
                  :disabled="badgeBusy === c.id"
                  :title="tiene(c, b.key)
                    ? (isEN ? 'Remove from this list — does NOT delete the contact' : 'Sacar de esta lista — NO elimina el contacto')
                    : (isEN ? 'Add to this list' : 'Agregar a esta lista')"
                  @click="alternar(c, b.key)"
                >{{ isEN ? b.en : b.es }}</button>
              </span>
              <div class="cm-acts">
                <button class="cm-icon" @click="startEdit(c)" :title="isEN ? 'Edit' : 'Editar'">✎</button>
                <button class="cm-icon cm-del" @click="remove(c)" :title="isEN ? 'Delete' : 'Eliminar'">✕</button>
              </div>
            </template>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'

const store       = useContactsStore()
const globalStore = useGlobalStore()
const { $toast }  = useNuxtApp()

const isEN = computed(() => globalStore.lang === 'en')

// ETIQUETAS de Relations (§9.1): en qué lista aparece esta persona.
//
// Este directorio es de Calendar, pero la tabla `contacts` es UNA sola y la
// comparte con Relations. Marcar acá es lo que evita que cada persona tipeada en
// una jornada caiga en la bandeja comercial de Relations a esperar que alguien la
// clasifique de a una — son ~250 por organización (ARQUITECTURA-DECISION §9.2.1).
const BADGES = [
  { key: 'crew',     es: 'Crew',     en: 'Crew' },
  { key: 'clientes', es: 'Clientes', en: 'Clients' },
]

// Crew por defecto: es lo que uno agrega desde el directorio de Calendar casi
// siempre, y el valor por defecto tiene que ser el caso común, no el neutro.
const form     = reactive({ name: '', title: '', email: '', phone: '', badge: 'crew' })
const editForm = reactive({ name: '', title: '', email: '', phone: '' })
const editingId = ref(null)
const saving    = ref(false)
const query     = ref('')
const searchRef = ref(null)

const canAdd = computed(() => !!form.name?.trim())

const badgeBusy = ref(null)

const tiene = (c, key) => (c?.badges || []).some(b => b?.key === key)
const etiquetasDe = (c) => (c?.badges || []).map(b => b?.key).filter(Boolean).join(', ') || '—'

// Alterna una etiqueta. Nunca reemplaza: alguien puede estar en las dos listas.
// `badgeBusy` evita el doble clic — el backend ya es idempotente, pero sin esto la
// pastilla parpadea de ida y vuelta mientras vuelan dos requests cruzados.
async function alternar(c, key) {
  // Por FILA, no global: el guard estaba en `badgeBusy.value` a secas mientras el
  // `:disabled` era por fila, así que las pastillas de las demás filas se veían
  // habilitadas, respondían al hover y al hacer clic no pasaba nada. Con red lenta
  // eso se lee como "el botón no funciona".
  if (badgeBusy.value === c.id) return
  badgeBusy.value = c.id
  try {
    if (tiene(c, key)) await store.removeBadge(c.id, key)
    else               await store.addBadge(c.id, key)
  } catch (e) {
    $toast(isEN.value ? 'Could not update the list.' : 'No se pudo actualizar la lista.', { type: 'error' })
  } finally {
    badgeBusy.value = null
  }
}

// Free-text search across every field. Email and phone are in there on purpose: a
// contact that arrived from an import often has nothing but an email address.
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return store.sorted
  const terms = q.split(/\s+/)
  return store.sorted.filter((c) => {
    const hay = [c.name, c.title, c.email, c.phone].filter(Boolean).join(' ').toLowerCase()
    return terms.every(t => hay.includes(t))
  })
})

function clearSearch() {
  query.value = ''
  searchRef.value?.focus()
}

function close() { globalStore.closeContacts() }

async function add() {
  if (!canAdd.value || saving.value) return
  saving.value = true
  try {
    await store.addContact({
      name: form.name, title: form.title, email: form.email, phone: form.phone,
      badge: form.badge,
    })
    form.name = form.title = form.email = form.phone = ''
    // La etiqueta NO se resetea: quien está cargando crew carga varios seguidos, y
    // volver a "Crew" cada vez lo obligaría a reelegir en cada fila.
    query.value = ''   // otherwise the contact just added can sit outside the filter
  } catch (e) {
    $toast(isEN.value ? 'Could not save contact.' : 'No se pudo guardar el contacto.', { type: 'error' })
  } finally {
    saving.value = false
  }
}

function startEdit(c) {
  editingId.value = c.id
  editForm.name = c.name || ''
  editForm.title = c.title || ''
  editForm.email = c.email || ''
  editForm.phone = c.phone || ''
}

async function saveEdit(id) {
  try {
    await store.updateContact(id, { ...editForm })
    editingId.value = null
  } catch (e) {
    $toast(isEN.value ? 'Could not update contact.' : 'No se pudo actualizar el contacto.', { type: 'error' })
  }
}

async function remove(c) {
  const ok = await useDialog().confirm({
    title: isEN.value ? 'Delete contact' : 'Eliminar contacto',
    body:  isEN.value ? `Delete “${c.name || 'this contact'}”?` : `¿Eliminar a “${c.name || 'este contacto'}”?`,
    confirmLabel: isEN.value ? 'Delete' : 'Eliminar',
    cancelLabel:  isEN.value ? 'Cancel' : 'Cancelar',
  })
  if (!ok) return
  try {
    await store.deleteContact(c.id)
  } catch (e) {
    $toast(isEN.value ? 'Could not delete contact.' : 'No se pudo eliminar el contacto.', { type: 'error' })
  }
}

function onKeydown(e) {
  if (e.key !== 'Escape') return
  e.stopPropagation()
  if (query.value) { query.value = ''; return }
  close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  store.loadContacts()
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.cm-modal { width: min(760px, 94vw); max-height: 86vh; display: flex; flex-direction: column; }
.cm-head { display: flex; align-items: center; justify-content: space-between; }
.cm-head h2 { margin: 0; }
.cm-close {
  background: none; border: none; color: var(--muted); font-size: 1rem;
  cursor: pointer; padding: 4px 6px; line-height: 1;
}
.cm-close:hover { color: var(--text); }
.cm-sub { font-size: .72rem; color: var(--muted); margin: 2px 0 12px; }

.cm-add {
  display: grid; grid-template-columns: 1.3fr 1fr 1.3fr 1fr auto auto; gap: 6px;
  margin-bottom: 12px;
}
.cm-add input {
  padding: 6px 9px; border-radius: 6px; border: 1.5px solid var(--border);
  background: var(--surface); color: var(--text); font-size: .76rem; font-family: inherit; min-width: 0;
}
.cm-add input:focus { outline: none; border-color: var(--accent); }
.cm-add-btn {
  padding: 6px 12px; border: none; border-radius: 6px; background: var(--accent);
  color: var(--accent-ink); font-size: .74rem; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap;
}
.cm-add-btn:disabled { opacity: .5; cursor: default; }

.cm-search { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.cm-search-wrap { position: relative; flex: 1; min-width: 0; display: flex; }
.cm-search-input {
  flex: 1; min-width: 0;
  padding: 6px 26px 6px 9px; border-radius: 6px; border: 1.5px solid var(--border);
  background: var(--surface); color: var(--text); font-size: .76rem; font-family: inherit;
}
.cm-search-input:focus { outline: none; border-color: var(--accent); }
.cm-search-x {
  position: absolute; right: 5px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--muted); cursor: pointer;
  font-size: .68rem; padding: 2px 3px; line-height: 1;
}
.cm-search-x:hover { color: var(--text); }
.cm-count { font-size: .68rem; color: var(--muted); white-space: nowrap; min-width: 78px; text-align: right; }

.cm-list { overflow-y: auto; border-top: 1px solid var(--border); }
.cm-empty { text-align: center; color: var(--muted); font-size: .78rem; padding: 22px 0; }

.cm-row {
  display: grid; grid-template-columns: 1.3fr 1fr 1.3fr 1fr auto auto; gap: 6px;
  align-items: center; padding: 7px 2px; border-bottom: 1px solid var(--border);
  font-size: .78rem; color: var(--text);
}
.cm-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cm-row-head {
  font-size: .62rem; text-transform: uppercase; letter-spacing: .5px;
  color: var(--muted); font-weight: 700;
}
.cm-name { font-weight: 600; }
.cm-mail { color: var(--muted); }
.cm-row input {
  padding: 4px 7px; border-radius: 5px; border: 1.5px solid var(--border);
  background: var(--surface); color: var(--text); font-size: .74rem; font-family: inherit; min-width: 0;
}
.cm-row input:focus { outline: none; border-color: var(--accent); }

.cm-acts { display: flex; gap: 4px; justify-content: flex-end; }
.cm-icon {
  background: none; border: 1.5px solid var(--border); border-radius: 5px;
  color: var(--muted); cursor: pointer; width: 24px; height: 24px; line-height: 1;
  font-size: .74rem; display: flex; align-items: center; justify-content: center;
}
.cm-icon:hover { color: var(--text); border-color: var(--text); }
.cm-ok:hover { color: var(--accent); border-color: var(--accent); }
.cm-del:hover { color: var(--danger); border-color: var(--danger); }

/* Etiquetas: en qué listas de Relations aparece la persona. Encendida = panel de
   acento con borde, el mismo lenguaje del resto de la app. */
.cm-badge-sel {
  border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2);
  color: var(--text); font-family: inherit; font-size: .74rem; padding: 0 6px; cursor: pointer;
}
.cm-badge-sel:focus { outline: none; border-color: var(--accent); }
.cm-badges { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.cm-badge {
  border: 1px solid var(--border); border-radius: 6px; background: none;
  color: var(--muted); font-family: inherit; font-size: .66rem; font-weight: 600;
  padding: 2px 7px; cursor: pointer; transition: background .16s, color .16s, border-color .16s;
}
.cm-badge:hover:not(:disabled) { color: var(--text); }
.cm-badge.on { background: var(--accent-panel); color: var(--accent); border-color: var(--accent); }
.cm-badge:disabled { opacity: .5; cursor: default; }
</style>
