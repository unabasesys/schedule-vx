<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="!sending && globalStore.closeSuggest()">
      <div
        class="modal suggest-modal"
        :class="{ dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
      >
        <div class="sg-head">
          <span class="sg-icon">💡</span>
          <h2 class="sg-title">{{ lang === 'en' ? 'Suggest an idea' : 'Sugerir una idea' }}</h2>
        </div>
        <p class="sg-sub">
          {{ lang === 'en'
            ? 'Calendar grows with your ideas. Tell us what you’d love to see — every suggestion reaches our team.'
            : 'Calendar crece con tus ideas. Cuéntanos qué te encantaría ver — cada sugerencia llega a nuestro equipo.' }}
        </p>

        <textarea
          ref="ta"
          v-model="message"
          class="sg-textarea"
          :placeholder="lang === 'en' ? 'Your idea, suggestion or feedback…' : 'Tu idea, sugerencia o comentario…'"
          :disabled="sending"
          rows="5"
          @keydown.meta.enter="submit"
          @keydown.ctrl.enter="submit"
          @paste="onPaste"
        ></textarea>

        <!-- Capturas de pantalla. Gemelo del mismo bloque en Relations: la bandeja del
             equipo es UNA sola y la mitad de lo que llega son reportes de bugs, donde
             una imagen dice lo que un párrafo no alcanza a explicar. Se puede PEGAR
             (⌘V sobre el cuadro de texto), arrastrar o elegir. -->
        <div class="sg-imgs">
          <div v-if="images.length" class="sg-thumbs">
            <div v-for="(img, i) in images" :key="i" class="sg-thumb">
              <img :src="img.dataUrl" alt="" />
              <button
                type="button"
                class="sg-thumb-x"
                :disabled="sending"
                :title="lang === 'en' ? 'Remove' : 'Quitar'"
                @click="images.splice(i, 1)"
              >×</button>
              <span class="sg-thumb-size">{{ formatBytes(dataUrlBytes(img.dataUrl)) }}</span>
            </div>
          </div>

          <button
            v-if="images.length < MAX_IMAGES"
            type="button"
            class="sg-add"
            :disabled="sending || loadingImg"
            @click="fileRef?.click()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span v-if="loadingImg">{{ lang === 'en' ? 'Adding…' : 'Agregando…' }}</span>
            <span v-else-if="images.length">{{ lang === 'en' ? 'Add another image' : 'Agregar otra imagen' }}</span>
            <span v-else>{{ lang === 'en' ? 'Attach a screenshot' : 'Adjuntar una captura' }}</span>
          </button>

          <p v-if="imgError" class="sg-img-error">{{ imgError }}</p>
          <p v-else class="sg-img-hint">
            {{ lang === 'en'
              ? 'You can also paste (⌘V) or drag an image here.'
              : 'También puedes pegarla (⌘V) o arrastrarla aquí.' }}
          </p>

          <input ref="fileRef" type="file" accept="image/*" multiple class="sg-file" @change="onFile" />
        </div>

        <p class="sg-from">
          {{ lang === 'en' ? 'Sent as' : 'Se envía como' }}
          <b>{{ authStore.user?.email }}</b>
        </p>

        <div class="modal-actions sg-actions">
          <button class="btn-ghost" :disabled="sending" @click="globalStore.closeSuggest()">
            {{ lang === 'en' ? 'Cancel' : 'Cancelar' }}
          </button>
          <button class="btn-primary" :disabled="sending || !message.trim()" @click="submit">
            {{ sending ? (lang === 'en' ? 'Sending…' : 'Enviando…') : (lang === 'en' ? 'Send' : 'Enviar') }}
          </button>
        </div>

        <!-- El velo de arrastre cubre el modal entero: soltar en cualquier parte vale. -->
        <div v-if="dragging" class="sg-drop">
          {{ lang === 'en' ? 'Drop the image here' : 'Suelta la imagen aquí' }}
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const globalStore = useGlobalStore()
const authStore   = useAuthStore()
const { $toast }  = useNuxtApp()

const lang = computed(() => globalStore.lang)

const message = ref('')
const sending = ref(false)
const ta = ref(null)

// Cuatro es el tope del servidor. Nadie necesita más para explicar un problema, y cada
// una viaja dentro del documento de la sugerencia.
const MAX_IMAGES = 4
const images     = ref([])
const fileRef    = ref(null)
const loadingImg = ref(false)
const imgError   = ref('')
const dragging   = ref(false)

onMounted(() => nextTick(() => ta.value?.focus()))

// Agrega archivos de imagen, reduciéndolos en el navegador. Los motivos de rechazo se
// dicen en palabras: "no se pudo" a secas obliga a adivinar.
async function addFiles(files) {
  if (!files?.length || sending.value) return
  imgError.value = ''
  const room = MAX_IMAGES - images.value.length
  if (room <= 0) {
    imgError.value = lang.value === 'en' ? `Up to ${MAX_IMAGES} images.` : `Hasta ${MAX_IMAGES} imágenes.`
    return
  }
  loadingImg.value = true
  for (const file of Array.from(files).slice(0, room)) {
    try {
      images.value.push(await shrinkImageFile(file))
    } catch (e) {
      imgError.value = e?.message === 'muy-pesada'
        ? (lang.value === 'en' ? 'That image is too heavy (max 12 MB).' : 'Esa imagen pesa demasiado (máx. 12 MB).')
        : (lang.value === 'en' ? 'That file is not an image we can read.' : 'Ese archivo no es una imagen que podamos leer.')
    }
  }
  loadingImg.value = false
}

function onFile(e) {
  addFiles(e.target.files)
  e.target.value = ''   // permite volver a elegir el mismo archivo
}

// Pegar la captura recién tomada: es el gesto natural después de ⌘⇧4. Solo se
// intercepta cuando el portapapeles trae una imagen — pegar texto sigue igual.
function onPaste(e) {
  const files = imagesFromTransfer(e.clipboardData)
  if (!files.length) return
  e.preventDefault()
  addFiles(files)
}

// Salir hacia un hijo del modal NO es salir del modal: sin esta comprobación el velo
// parpadea al pasar por encima de la caja de texto o de una miniatura.
function onDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) dragging.value = false
}

function onDrop(e) {
  dragging.value = false
  addFiles(imagesFromTransfer(e.dataTransfer))
}

async function submit() {
  const text = message.value.trim()
  if (!text || sending.value) return
  sending.value = true
  try {
    // De qué app viene: la bandeja del equipo es UNA para todo el ecosistema
    // (Relations, Leads y Calendar escriben en la misma colección), así que sin esto
    // un "no funciona la fecha" llega sin decir de qué app habla.
    await useApi().post('/feedback', { message: text, app: 'calendar', images: images.value })
    $toast(lang.value === 'en' ? 'Thanks! Your idea was sent. 🙌' : '¡Gracias! Tu idea fue enviada. 🙌', { type: 'success' })
    globalStore.closeSuggest()
  } catch (e) {
    // El motivo del servidor cuando lo hay (una imagen rechazada, por ejemplo): decir
    // "intenta de nuevo" ante un límite hace que la persona reintente lo mismo.
    $toast(e?.message || (lang.value === 'en' ? 'Could not send. Try again.' : 'No se pudo enviar. Intenta de nuevo.'), { type: 'error' })
    sending.value = false
  }
}
</script>

<style scoped>
.suggest-modal { width: min(480px, 94vw); position: relative; }
.sg-head { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.sg-icon { font-size: 1.15rem; }
.sg-title { margin: 0; font-size: 1.1rem; font-weight: 800; color: var(--text); }
.sg-sub { margin: 0 0 14px; font-size: .82rem; line-height: 1.6; color: var(--muted); }
.sg-textarea {
  width: 100%; box-sizing: border-box; padding: 11px 12px; border-radius: 10px;
  border: 1.5px solid var(--border); background: var(--bg); color: var(--text);
  font-size: .88rem; font-family: inherit; line-height: 1.55; resize: vertical; outline: none;
}
.sg-textarea:focus { border-color: var(--accent); }
/* Capturas */
.sg-imgs { margin-top: 10px; }
.sg-thumbs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 9px; }
.sg-thumb {
  position: relative; width: 84px; height: 64px; border-radius: 9px; overflow: hidden;
  border: 1px solid var(--border-strong); background: var(--surface-2);
}
.sg-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sg-thumb-x {
  position: absolute; top: 3px; right: 3px; width: 19px; height: 19px; border-radius: 50%;
  border: none; background: var(--overlay); color: #fff; font-size: .85rem; line-height: 1;
  font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.sg-thumb-x:hover { background: var(--danger); }
.sg-thumb-size {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 1px 5px;
  background: var(--overlay); color: #fff; font-size: .6rem; font-weight: 700; text-align: right;
}
.sg-add {
  display: inline-flex; align-items: center; gap: 7px; padding: 7px 11px; border-radius: 9px;
  border: 1px dashed var(--border-strong); background: transparent; color: var(--muted);
  font-family: inherit; font-size: .74rem; font-weight: 700; cursor: pointer; transition: all .12s;
}
.sg-add:hover:not(:disabled) { color: var(--accent); border-color: var(--accent-deep); }
.sg-add:disabled { opacity: .55; cursor: default; }
.sg-add svg { width: 15px; height: 15px; }
.sg-img-hint  { margin: 7px 0 0; font-size: .68rem; color: var(--muted); }
.sg-img-error { margin: 7px 0 0; font-size: .7rem; color: var(--danger); font-weight: 600; }
.sg-file { display: none; }

/* Arrastrar y soltar */
.suggest-modal.dragging { border-color: var(--accent); }
.sg-drop {
  position: absolute; inset: 0; z-index: 5; border-radius: inherit; pointer-events: none;
  display: flex; align-items: center; justify-content: center;
  background: var(--accent-panel); border: 2px dashed var(--accent);
  color: var(--accent); font-size: .86rem; font-weight: 800;
}

.sg-from { margin: 12px 0 0; font-size: .73rem; color: var(--muted); }
.sg-from b { color: var(--text); font-weight: 700; }
.sg-actions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
</style>
