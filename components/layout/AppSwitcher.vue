<template>
  <!-- Lanzador de apps del ecosistema unabase, el gemelo del que vive en el front de
       Relations. Muestra TODAS las apps, no solo las que se pueden abrir: las cerradas
       van en gris con candado, que es el mensaje de venta de §8.1 —no se vende algo que
       el cliente no sabe que existe—. El caso que esa decisión tenía en mente es
       justamente este: quien solo compró Calendar tiene que ver que Relations existe.
       Lo que de verdad cierra es `hasApp` en el backend; esto solo invita. -->
  <div v-if="apps.length" class="apps-group">
    <div class="apps-label">Apps</div>
    <button
      v-for="a in apps"
      :key="a.key"
      class="apps-item"
      :class="{ active: a.key === 'calendar', locked: a.state !== 'open' }"
      :title="hint(a)"
      @click="go(a)"
    >
      <span class="apps-icon" v-html="a.icon"></span>
      <span class="apps-label-text">{{ a.label }}</span>
      <span v-if="a.state !== 'open'" class="apps-lock" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
      </span>
      <span v-if="a.state !== 'open'" class="sr-only">{{ hint(a) }}</span>
    </button>
  </div>
</template>

<script setup>
const authStore   = useAuthStore()
const globalStore = useGlobalStore()
const config      = useRuntimeConfig()

// Todas las apps, cada una con su estado. Ver `appsWithState` para los tres casos.
const apps = computed(() => appsWithState(authStore.organization, authStore.user?._id))

// La app activa es siempre Calendar: este front no sirve ninguna otra, así que no hay
// ruta que interrogar (a diferencia del switcher de Relations, que comparte front con
// Leads y tiene que mirar el path).
const es = computed(() => globalStore.lang !== 'en')

// El texto del candado dice qué HACER, no solo que está cerrado. Los dos motivos tienen
// salidas distintas: uno se resuelve comprando y el otro pidiendo.
function hint(a) {
  if (a.state === 'locked-org') {
    return es.value
      ? `${a.label} todavía no está en tu plan. Escríbenos para activarlo.`
      : `${a.label} isn't in your plan yet. Get in touch to enable it.`
  }
  if (a.state === 'locked-seat') {
    return es.value
      ? `Tu organización tiene ${a.label}, pero no te lo asignaron. Pídeselo al dueño.`
      : `Your organization has ${a.label}, but it isn't assigned to you. Ask the owner.`
  }
  return a.label
}

function go(a) {
  // Una app cerrada NO navega. Mandarla igual al subdominio para que rebote contra el
  // 403 sería usar una pantalla de error como folleto de venta, y encima le haría perder
  // el lugar donde estaba. El candado ya explica qué hacer.
  if (a.state !== 'open') return
  if (a.key === 'calendar') return

  // Externa: se sale de este front (§8.1, cada app enlaza a los subdominios de las
  // otras). Misma pestaña, porque es cambiar de app y no abrir un anexo. La llave la
  // declara el registro (`urlKey`), así que la próxima app externa se agrega en un solo
  // lugar; `path` es para Leads, que comparte host con Relations.
  const host = config.public[a.urlKey]
  if (host) window.location.assign(`${host}${a.path || ''}`)
}
</script>

<style scoped>
.apps-group { padding: 4px 12px 8px; }
.apps-label {
  font-size: .58rem; font-weight: 800; text-transform: uppercase; letter-spacing: .8px;
  color: var(--dim); padding: 0 2px 6px;
}
.apps-item {
  display: flex; align-items: center; gap: 9px; width: 100%; padding: 7px 8px;
  background: none; border: none; border-radius: 8px; cursor: pointer;
  font-family: inherit; text-align: left; color: var(--text-2);
  transition: background .14s, color .14s;
}
.apps-item + .apps-item { margin-top: 2px; }
.apps-icon { display: flex; align-items: center; color: var(--muted); flex-shrink: 0; transition: color .14s; }
.apps-label-text { flex: 1; font-size: .74rem; font-weight: 600; }
.apps-item:hover { background: var(--wash-1); color: var(--text); }
.apps-item:hover .apps-icon { color: var(--text-2); }

/* La app de casa, con el mismo verde plano que el resto del menú. */
.apps-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  cursor: default;
}
.apps-item.active .apps-icon { color: var(--accent); }
.apps-item.active:hover { background: var(--accent-soft); color: var(--accent); }
.apps-item.active:hover .apps-icon { color: var(--accent); }

/* ── Candado (§8.1) ──
   Visible pero apagada: se lee que existe, se lee que no está abierta. No usa
   `disabled` a propósito — un botón deshabilitado no recibe foco ni muestra su
   `title`, así que el motivo del candado quedaría fuera del alcance del teclado y de
   quien navega con lector de pantalla. El clic se ignora en `go()`. */
.apps-item.locked { opacity: .45; cursor: default; }
.apps-item.locked:hover { background: none; color: var(--text-2); }
.apps-item.locked:hover .apps-icon { color: var(--muted); }
/* El candado sí se aviva al pasar por encima: confirma que el gris es intencional y no
   la app a medio cargar. */
.apps-item.locked:hover .apps-lock { color: var(--text-2); }
.apps-lock { display: flex; align-items: center; color: var(--muted); flex-shrink: 0; transition: color .14s; }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
</style>
