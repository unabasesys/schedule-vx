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
        <input v-model.trim="form.role"  :placeholder="isEN ? 'Role' : 'Cargo'" @keydown.enter="add" />
        <input v-model.trim="form.email" placeholder="Email" @keydown.enter="add" />
        <input v-model.trim="form.phone" :placeholder="isEN ? 'Phone' : 'Teléfono'" @keydown.enter="add" />
        <button class="cm-add-btn" :disabled="!canAdd || saving" @click="add">
          {{ isEN ? '+ Add' : '+ Agregar' }}
        </button>
      </div>

      <!-- List -->
      <div class="cm-list">
        <div v-if="store.loading" class="cm-empty">{{ isEN ? 'Loading…' : 'Cargando…' }}</div>
        <div v-else-if="!store.sorted.length" class="cm-empty">
          {{ isEN ? 'No contacts yet. Add your first one above.' : 'Aún no hay contactos. Agrega el primero arriba.' }}
        </div>
        <template v-else>
          <div class="cm-row cm-row-head">
            <span>{{ isEN ? 'Name' : 'Nombre' }}</span>
            <span>{{ isEN ? 'Role' : 'Cargo' }}</span>
            <span>Email</span>
            <span>{{ isEN ? 'Phone' : 'Teléfono' }}</span>
            <span></span>
          </div>
          <div v-for="c in store.sorted" :key="c.id" class="cm-row">
            <template v-if="editingId === c.id">
              <input v-model.trim="editForm.name" />
              <input v-model.trim="editForm.role" />
              <input v-model.trim="editForm.email" />
              <input v-model.trim="editForm.phone" />
              <div class="cm-acts">
                <button class="cm-icon cm-ok" @click="saveEdit(c.id)" :title="isEN ? 'Save' : 'Guardar'">✓</button>
                <button class="cm-icon" @click="editingId = null" :title="isEN ? 'Cancel' : 'Cancelar'">✕</button>
              </div>
            </template>
            <template v-else>
              <span class="cm-name">{{ c.name || '—' }}</span>
              <span>{{ c.role || '—' }}</span>
              <span class="cm-mail">{{ c.email || '—' }}</span>
              <span>{{ c.phone || '—' }}</span>
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

const form     = reactive({ name: '', role: '', email: '', phone: '' })
const editForm = reactive({ name: '', role: '', email: '', phone: '' })
const editingId = ref(null)
const saving    = ref(false)

const canAdd = computed(() => !!form.name?.trim())

function close() { globalStore.closeContacts() }

async function add() {
  if (!canAdd.value || saving.value) return
  saving.value = true
  try {
    await store.addContact({ name: form.name, role: form.role, email: form.email, phone: form.phone })
    form.name = form.role = form.email = form.phone = ''
  } catch (e) {
    $toast(isEN.value ? 'Could not save contact.' : 'No se pudo guardar el contacto.', { type: 'error' })
  } finally {
    saving.value = false
  }
}

function startEdit(c) {
  editingId.value = c.id
  editForm.name = c.name || ''
  editForm.role = c.role || ''
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

function onKeydown(e) { if (e.key === 'Escape') { e.stopPropagation(); close() } }

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
  display: grid; grid-template-columns: 1.3fr 1fr 1.3fr 1fr auto; gap: 6px;
  margin-bottom: 12px;
}
.cm-add input {
  padding: 6px 9px; border-radius: 6px; border: 1.5px solid var(--border);
  background: var(--surface); color: var(--text); font-size: .76rem; font-family: inherit; min-width: 0;
}
.cm-add input:focus { outline: none; border-color: var(--accent); }
.cm-add-btn {
  padding: 6px 12px; border: none; border-radius: 6px; background: var(--accent);
  color: #fff; font-size: .74rem; font-weight: 700; cursor: pointer; font-family: inherit; white-space: nowrap;
}
.cm-add-btn:disabled { opacity: .5; cursor: default; }

.cm-list { overflow-y: auto; border-top: 1px solid var(--border); }
.cm-empty { text-align: center; color: var(--muted); font-size: .78rem; padding: 22px 0; }

.cm-row {
  display: grid; grid-template-columns: 1.3fr 1fr 1.3fr 1fr auto; gap: 6px;
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
.cm-del:hover { color: #e53e3e; border-color: #e53e3e; }
</style>
