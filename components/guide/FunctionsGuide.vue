<template>
  <div class="fg">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="fg-head">
      <div class="fg-head-copy">
        <div class="fg-eyebrow">{{ L.eyebrow }}</div>
        <h2 class="fg-title">{{ L.title }}</h2>
        <p class="fg-sub">{{ L.sub }}</p>
      </div>

      <div class="fg-head-actions">
        <div class="fg-head-btns">
          <button class="fg-pill" @click="toggleView">{{ isGuided ? L.viewAll : L.viewStepped }}</button>
          <button v-if="!skipped" class="fg-pill fg-pill--ghost" @click="skip">{{ L.skipGuide }}</button>
        </div>
        <button class="fg-never" :class="{ on: never }" @click="toggleNever">
          <span class="fg-never-box">{{ never ? '✓' : '' }}</span>
          {{ L.never }}
        </button>
      </div>
    </div>

    <div class="fg-rule"></div>

    <!-- ── Guided: rail + panel ───────────────────────────────────────────── -->
    <div v-if="isGuided" class="fg-guided">

      <div class="fg-rail">
        <button
          v-for="(s, i) in STEPS"
          :key="s.key"
          class="fg-rail-item"
          :class="{ on: step === i + 1 }"
          @click="step = i + 1"
        >
          <span class="fg-rail-num">{{ i + 1 }}</span>
          <span class="fg-rail-txt">{{ L.steps[s.key].name }}</span>
        </button>

        <div class="fg-rail-cta">
          <p class="fg-rail-cta-txt">{{ L.railCta }}</p>
          <button class="fg-btn-primary" @click="$emit('add-stage')">{{ L.addStage }}</button>
        </div>
      </div>

      <div class="fg-panel">

        <!-- 1 · Events -->
        <div v-if="step === 1" class="fg-step">
          <div class="fg-chip fg-chip--accent">{{ L.addEvent }}</div>
          <h3 class="fg-step-title">{{ L.steps.events.name }}</h3>
          <p class="fg-body">{{ L.steps.events.p1 }}</p>
          <p class="fg-body">{{ L.steps.events.p2 }}</p>
          <div class="fg-mock fg-mock--rows">
            <div class="fg-mock-row">
              <span class="fg-mock-bar" :style="{ background: 'var(--stage-pre)' }"></span>
              <span class="fg-mock-name">{{ L.steps.events.mock1 }}</span>
              <span class="fg-mock-date">{{ L.steps.events.mock1Date }}</span>
            </div>
            <div class="fg-mock-row is-dim">
              <span class="fg-mock-bar"></span>
              <span class="fg-mock-name">{{ L.steps.events.mock2 }}</span>
              <span class="fg-mock-date">{{ L.steps.events.mock2Date }}</span>
            </div>
          </div>
        </div>

        <!-- 2 · Stages -->
        <div v-if="step === 2" class="fg-step">
          <div class="fg-chip fg-chip--accent">{{ L.addStage }}</div>
          <h3 class="fg-step-title">{{ L.steps.stages.name }}</h3>
          <p class="fg-body">{{ L.steps.stages.p1 }}</p>
          <p class="fg-body">{{ L.steps.stages.p2 }}</p>
          <div class="fg-mock fg-mock--cards">
            <div v-for="s in L.steps.stages.mock" :key="s.name" class="fg-mock-card">
              <span class="fg-dot" :style="{ background: s.color }"></span>
              <span class="fg-mock-card-name">{{ s.name }}</span>
              <span class="fg-mock-card-meta">{{ s.count }}</span>
            </div>
          </div>
        </div>

        <!-- 3 · Departments -->
        <div v-if="step === 3" class="fg-step">
          <div class="fg-chip-row">
            <span class="fg-mini-label">{{ L.departmentsLabel }}</span>
            <span class="fg-tag">{{ L.steps.departments.tag1 }} ×</span>
            <span class="fg-tag">{{ L.steps.departments.tag2 }} ×</span>
            <span class="fg-tag fg-tag--add">＋</span>
          </div>
          <h3 class="fg-step-title">{{ L.steps.departments.name }}</h3>
          <p class="fg-body">{{ L.steps.departments.p1 }}</p>
          <p class="fg-body">{{ L.steps.departments.p2 }}</p>
          <p class="fg-body">{{ L.steps.departments.p3 }}</p>
          <div class="fg-mock fg-mock--cards">
            <div v-for="r in L.steps.departments.mock" :key="r.label" class="fg-mock-card">
              <span class="fg-dot" :style="{ background: r.color }"></span>
              <span class="fg-mock-card-name is-muted">{{ r.label }}</span>
              <span class="fg-badge">{{ r.dept }}</span>
            </div>
          </div>
        </div>

        <!-- 4 · Filters -->
        <div v-if="step === 4" class="fg-step">
          <div class="fg-chip-row fg-chip-row--wrap">
            <span
              v-for="(f, i) in L.steps.filters.rows"
              :key="f.name"
              class="fg-filter-chip"
              :class="{ on: i === 0 }"
            >{{ f.name }}</span>
          </div>
          <h3 class="fg-step-title">{{ L.steps.filters.name }}</h3>
          <p class="fg-body fg-body--tight">{{ L.steps.filters.p1 }}</p>
          <dl class="fg-defs">
            <template v-for="(f, i) in L.steps.filters.rows" :key="f.name">
              <div v-if="i" class="fg-defs-rule"></div>
              <div class="fg-def">
                <dt>{{ f.name }}</dt>
                <dd>{{ f.desc }}</dd>
              </div>
            </template>
          </dl>
        </div>

        <!-- 5 · Move calendar -->
        <div v-if="step === 5" class="fg-step">
          <div class="fg-chip">{{ L.steps.move.name }}</div>
          <h3 class="fg-step-title">{{ L.steps.move.name }}</h3>
          <p class="fg-body">{{ L.steps.move.p1 }}</p>
          <p class="fg-body">{{ L.steps.move.p2 }}</p>
          <div class="fg-mock fg-mock--shift">
            <div class="fg-mini-label">{{ L.steps.move.shiftLabel }}</div>
            <div class="fg-stepper">
              <span class="fg-stepper-btn">−</span>
              <span class="fg-stepper-val">{{ L.steps.move.days }}</span>
              <span class="fg-stepper-btn is-accent">＋</span>
            </div>
            <div class="fg-shift-dates">
              <span class="fg-strike">{{ L.steps.move.from }}</span>
              <span class="fg-arrow">→</span>
              <span class="fg-to">{{ L.steps.move.to }}</span>
              <span class="fg-shift-note">{{ L.steps.move.note }}</span>
            </div>
          </div>
        </div>

        <!-- 6 · Dependencies -->
        <div v-if="step === 6" class="fg-step">
          <div class="fg-chip">{{ L.steps.deps.name }}</div>
          <h3 class="fg-step-title">{{ L.steps.deps.name }}</h3>
          <p class="fg-body">{{ L.steps.deps.p1 }}</p>
          <p class="fg-body">{{ L.steps.deps.p2 }}</p>
          <div class="fg-mock fg-mock--deps">
            <div class="fg-mock-card">
              <span class="fg-mock-card-name">{{ L.steps.deps.mockA }}</span>
              <span class="fg-mock-card-meta">{{ L.steps.deps.mockADate }}</span>
            </div>
            <div class="fg-dep-line"></div>
            <div class="fg-mock-card is-linked">
              <span class="fg-mock-card-name">{{ L.steps.deps.mockB }}</span>
              <span class="fg-badge">{{ L.steps.deps.mockBOffset }}</span>
            </div>
          </div>
        </div>

        <div class="fg-panel-foot">
          <button class="fg-btn-ghost" :disabled="step === 1" @click="step = Math.max(1, step - 1)">
            {{ L.prev }}
          </button>
          <button class="fg-btn-primary" @click="next">
            {{ step === STEPS.length ? L.start : L.next }}
          </button>
          <span class="fg-counter">{{ step }} {{ L.of }} {{ STEPS.length }}</span>
        </div>
      </div>
    </div>

    <!-- ── All at once ────────────────────────────────────────────────────── -->
    <div v-else-if="!skipped" class="fg-all">
      <div v-for="s in STEPS" :key="s.key" class="fg-card">
        <div class="fg-card-visual">
          <template v-if="s.key === 'events'">
            <span class="fg-chip fg-chip--accent">{{ L.addEvent }}</span>
          </template>
          <template v-else-if="s.key === 'stages'">
            <span class="fg-chip fg-chip--accent">{{ L.addStage }}</span>
          </template>
          <template v-else-if="s.key === 'departments'">
            <span class="fg-tag">{{ L.steps.departments.tag1 }} ×</span>
            <span class="fg-tag">{{ L.steps.departments.tag2 }} ×</span>
          </template>
          <template v-else-if="s.key === 'filters'">
            <span
              v-for="(f, i) in L.steps.filters.rows.slice(0, 3)"
              :key="f.name"
              class="fg-filter-chip"
              :class="{ on: i === 0 }"
            >{{ f.name }}</span>
          </template>
          <template v-else>
            <span class="fg-chip">{{ L.steps[s.key].name }}</span>
          </template>
        </div>
        <h3 class="fg-card-title">{{ L.steps[s.key].name }}</h3>
        <p class="fg-card-body">{{ L.steps[s.key].summary }}</p>
      </div>
    </div>

    <!-- ── Skipped ────────────────────────────────────────────────────────── -->
    <div v-else class="fg-skipped">
      <div class="fg-skipped-copy">
        <div class="fg-skipped-title">{{ L.skippedTitle }}</div>
        <p class="fg-skipped-body">{{ L.skippedBody }}</p>
      </div>
      <div class="fg-skipped-actions">
        <button class="fg-btn-ghost" @click="skipped = false">{{ L.backToGuide }}</button>
        <button class="fg-btn-primary" @click="$emit('add-stage')">{{ L.addStage }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// The screen a calendar shows when it was started WITHOUT a template: nothing to look
// at, and every feature of the toolbar still unexplained. It replaces a wall of text
// that said roughly the same thing but gave the reader no way in.
//
// Three views on purpose: stepped for someone willing to be walked through it, all-at-
// once for someone who just wants to scan, and a dismissed state that still keeps the
// one action that matters (create the first Stage) on screen.
const props = defineProps({
  lang: { type: String, default: 'es' },
})

defineEmits(['add-stage'])

const globalStore = useGlobalStore()

const STEPS = [
  { key: 'events' },
  { key: 'stages' },
  { key: 'departments' },
  { key: 'filters' },
  { key: 'move' },
  { key: 'deps' },
]

const step    = ref(1)
const view    = ref('guided')   // 'guided' | 'all'
const skipped = ref(false)

// Ticking the box does not dismiss the screen — it decides what happens NEXT time, which
// is why it reflects the stored value instead of assuming false.
const never = computed(() => globalStore.guideHidden)

const isGuided = computed(() => !skipped.value && view.value === 'guided')

function toggleView() {
  view.value = view.value === 'guided' ? 'all' : 'guided'
  skipped.value = false
}

function skip() {
  skipped.value = true
}

// Reaching the end is the same outcome as skipping: the guide steps aside and leaves the
// "create your first Stage" card, which is the only thing the user needs next.
function next() {
  if (step.value === STEPS.length) skipped.value = true
  else step.value += 1
}

// The checkbox is the only thing here that outlives the session. It's written the moment
// it's ticked rather than on unmount, so closing the tab can't lose the choice — and
// unticking it puts the guide back. The screen stays up either way: this decides what
// happens the next time a calendar lands here, not right now.
function toggleNever() {
  globalStore.setGuideHidden(!never.value)
}

const LABELS = {
  es: {
    eyebrow: 'GUÍA RÁPIDA · CALENDARIO SIN TEMPLATE',
    title: '¿Partiste sin template? Perfecto.',
    sub: 'Este calendario lo armas 100% a tu manera. Acá está para qué sirve cada función de la barra de arriba, una por una. Toma dos minutos.',
    viewAll: 'Ver todo de una',
    viewStepped: 'Ver paso a paso',
    skipGuide: 'Omitir guía',
    never: 'No volver a mostrar esta guía',
    railCta: 'Cuando quieras, empieza por acá. Lo primero es una Etapa: ahí es donde viven los eventos.',
    addStage: '＋ Etapa',
    addEvent: '＋ Evento',
    departmentsLabel: 'DEPARTAMENTOS',
    prev: 'Anterior',
    next: 'Siguiente',
    start: 'Empezar',
    of: 'de',
    skippedTitle: 'Listo, guía omitida.',
    skippedBody: 'Empieza creando tu primera Etapa: ahí es donde viven los eventos. Si la necesitas de nuevo, la encuentras en el menú de ayuda.',
    backToGuide: 'Volver a la guía',
    steps: {
      events: {
        name: 'Crear eventos',
        p1: 'Un evento es la unidad más simple del calendario: una fecha, un nombre y listo. No depende de nada ni de nadie.',
        p2: 'Úsalo cuando solo necesitas dejar algo marcado en el tiempo. Después, si quieres, lo ordenas dentro de una etapa, le asignas un departamento o lo conectas con otros eventos.',
        summary: 'Una fecha, un nombre y listo. Un evento suelto no depende de nada; después lo puedes ordenar en una etapa o conectarlo con otros.',
        mock1: 'Kickoff con cliente',
        mock1Date: 'Mar 04 ago',
        mock2: 'Envío de referencias',
        mock2Date: 'Jue 06 ago',
      },
      stages: {
        name: 'Etapas',
        p1: 'Las etapas son los grandes bloques de tu proyecto: preproducción, producción, postproducción. O negociación y realización, si trabajas así.',
        p2: 'Dentro de cada etapa viven sus eventos. Cada etapa lleva el color que tú le des, para que el calendario se lea de una sola pasada.',
        summary: 'Los grandes bloques del proyecto: preproducción, producción, postproducción, o negociación y realización. Ahí viven los eventos, cada etapa con su color.',
        mock: [
          { name: 'Preproducción',   count: '6 eventos', color: 'var(--stage-pre)' },
          { name: 'Producción',      count: '3 eventos', color: 'var(--stage-sht)' },
          { name: 'Postproducción',  count: '9 eventos', color: 'var(--stage-pst)' },
        ],
      },
      departments: {
        name: 'Departamentos',
        p1: 'Si prefieres dividir el trabajo por equipo, crea departamentos: casting, locaciones, arte, edición, post.',
        p2: 'Los eventos siguen viviendo en la etapa que les corresponde, pero quedan marcados con su departamento. Así un mismo departamento puede aparecer en varias etapas: en una casa de post, Edición juega un rol tanto en producción como en postproducción.',
        p3: 'Prende o apaga un departamento arriba y todos sus eventos se muestran u ocultan contigo.',
        summary: 'Divide los eventos por equipo. Siguen viviendo en su etapa, pero marcados: así Edición puede aparecer en producción y en post. Prende o apaga uno y sus eventos se muestran u ocultan.',
        tag1: 'Edición',
        tag2: 'Arte',
        mock: [
          { label: 'Producción · Rodaje día 2',        dept: 'Edición', color: 'var(--stage-sht)' },
          { label: 'Postproducción · Corte offline',   dept: 'Edición', color: 'var(--stage-pst)' },
        ],
      },
      filters: {
        name: 'Filtros de tareas',
        p1: 'Cuando el calendario crece, estos cinco botones te dejan ver solo lo que importa en ese momento.',
        summary: 'Todos, fechas clave (los hitos), solo activos, solo internos (no salen en el PDF del cliente) y no completadas, para seguir el pendiente.',
        rows: [
          { name: 'Todos',           desc: 'El calendario completo, sin filtrar. Es la vista por defecto.' },
          { name: '★ Fechas clave',  desc: 'Marca los hitos que no se pueden mover y míralos solos: entregas, rodaje, aprobación del cliente.' },
          { name: 'Solo activos',    desc: 'Esconde todo lo que ya no está en juego. Ideal cuando tienes muchas tareas y solo quieres ver lo vivo.' },
          { name: 'Solo internos',   desc: 'Marca tareas como internas y quedan fuera del PDF que le mandas al cliente. Acá las revisas todas juntas.' },
          { name: 'No completadas',  desc: 'Ve marcando cada tarea como completada y usa este filtro para tener el pendiente a la vista.' },
        ],
      },
      move: {
        name: 'Mover calendario',
        p1: 'Pasa siempre: armas el calendario perfecto y te piden correrlo dos semanas. En vez de mover evento por evento, mueves todo de una.',
        p2: 'Indicas cuántos días quieres avanzar o retroceder y el calendario completo se desplaza desde el primer evento creado, manteniendo las distancias entre todo.',
        summary: 'Indica cuántos días avanzar o retroceder y todo el calendario se desplaza desde el primer evento, manteniendo las distancias.',
        shiftLabel: 'DESPLAZAR',
        days: '14 días',
        from: '04 ago',
        to: '18 ago',
        note: 'y todo lo demás se corre igual',
      },
      deps: {
        name: 'Dependencias',
        p1: 'Acá está lo bueno: puedes configurar tareas que dependan de otras. Si la primera se mueve, las que vienen después se acomodan solas.',
        p2: 'Suena técnico, pero en la práctica es simple, y es lo que hace que mover el calendario sea inteligente en vez de manual. Es un capítulo aparte: pruébalo cuando ya tengas tus etapas y eventos armados.',
        summary: 'Tareas que dependen de otras: si una se mueve, las siguientes se acomodan solas. Un capítulo aparte, para cuando ya tengas tus etapas armadas.',
        mockA: 'Aprobación de casting',
        mockADate: '11 ago',
        mockB: 'Rodaje día 1',
        mockBOffset: '+2 días después',
      },
    },
  },
  en: {
    eyebrow: 'QUICK GUIDE · CALENDAR WITHOUT A TEMPLATE',
    title: 'Starting without a template? Perfect.',
    sub: 'This calendar is yours to build your own way. Here is what every function in the toolbar above does, one by one. Takes two minutes.',
    viewAll: 'See it all at once',
    viewStepped: 'See it step by step',
    skipGuide: 'Skip guide',
    never: "Don't show this guide again",
    railCta: 'Start here whenever you like. A Stage comes first: that is where events live.',
    addStage: '＋ Stage',
    addEvent: '＋ Event',
    departmentsLabel: 'DEPARTMENTS',
    prev: 'Back',
    next: 'Next',
    start: 'Get started',
    of: 'of',
    skippedTitle: 'Guide skipped.',
    skippedBody: 'Start by creating your first Stage: that is where events live. If you need the guide again, it is in the help menu.',
    backToGuide: 'Back to the guide',
    steps: {
      events: {
        name: 'Create events',
        p1: 'An event is the calendar\'s simplest unit: a date, a name, done. It depends on nothing and nobody.',
        p2: 'Use it when you just need something marked in time. Later, if you want, you can file it under a stage, assign it a department, or connect it to other events.',
        summary: 'A date, a name, done. A loose event depends on nothing; later you can file it under a stage or connect it to others.',
        mock1: 'Client kickoff',
        mock1Date: 'Tue Aug 04',
        mock2: 'References sent',
        mock2Date: 'Thu Aug 06',
      },
      stages: {
        name: 'Stages',
        p1: 'Stages are your project\'s big blocks: pre-production, production, post-production. Or bidding and delivery, if that is how you work.',
        p2: 'Each stage holds its own events. Every stage carries the color you give it, so the calendar reads in a single pass.',
        summary: 'The project\'s big blocks: pre-production, production, post-production, or bidding and delivery. Events live inside them, each stage with its color.',
        mock: [
          { name: 'Pre-production',  count: '6 events', color: 'var(--stage-pre)' },
          { name: 'Production',      count: '3 events', color: 'var(--stage-sht)' },
          { name: 'Post-production', count: '9 events', color: 'var(--stage-pst)' },
        ],
      },
      departments: {
        name: 'Departments',
        p1: 'If you would rather split the work by team, create departments: casting, locations, art, editing, post.',
        p2: 'Events still live in the stage they belong to, but they carry their department. That way one department can appear across several stages: in a post house, Editing plays a part in both production and post.',
        p3: 'Turn a department on or off up top and all of its events show or hide with you.',
        summary: 'Split events by team. They still live in their stage, but tagged: so Editing can appear in production and in post. Turn one off and its events hide.',
        tag1: 'Editing',
        tag2: 'Art',
        mock: [
          { label: 'Production · Shoot day 2',      dept: 'Editing', color: 'var(--stage-sht)' },
          { label: 'Post-production · Offline cut', dept: 'Editing', color: 'var(--stage-pst)' },
        ],
      },
      filters: {
        name: 'Task filters',
        p1: 'As the calendar grows, these five buttons let you see only what matters right now.',
        summary: 'All, key dates (the milestones), active only, internal only (kept out of the client PDF) and not completed, to track what is left.',
        rows: [
          { name: 'All',            desc: 'The whole calendar, unfiltered. This is the default view.' },
          { name: '★ Key dates',    desc: 'Flag the milestones that cannot move and look at them alone: deliveries, the shoot, client approval.' },
          { name: 'Active only',    desc: 'Hides everything no longer in play. Ideal when you have many tasks and only want what is live.' },
          { name: 'Internal only',  desc: 'Mark tasks as internal and they stay out of the PDF you send the client. Here you review them together.' },
          { name: 'Not completed',  desc: 'Tick tasks off as you go and use this filter to keep what is pending in sight.' },
        ],
      },
      move: {
        name: 'Move calendar',
        p1: 'It always happens: you build the perfect calendar and they ask you to push it two weeks. Instead of moving event by event, you move everything at once.',
        p2: 'You say how many days forward or back, and the whole calendar shifts from the first event created, keeping every distance intact.',
        summary: 'Say how many days forward or back and the whole calendar shifts from the first event, keeping the distances.',
        shiftLabel: 'SHIFT BY',
        days: '14 days',
        from: 'Aug 04',
        to: 'Aug 18',
        note: 'and everything else shifts with it',
      },
      deps: {
        name: 'Dependencies',
        p1: 'Here is the good part: you can set up tasks that depend on others. Move the first one and everything after it falls into place on its own.',
        p2: 'It sounds technical, but in practice it is simple, and it is what makes moving the calendar smart instead of manual. A chapter of its own: try it once your stages and events are in place.',
        summary: 'Tasks that depend on others: move one and the rest follow. A chapter of its own, for once your stages are in place.',
        mockA: 'Casting approval',
        mockADate: 'Aug 11',
        mockB: 'Shoot day 1',
        mockBOffset: '+2 days after',
      },
    },
  },
}

const L = computed(() => LABELS[props.lang] ?? LABELS.es)
</script>

<style scoped>
/* The design's own palette is this app's palette one step darker, so it maps onto the
   existing tokens: page --bg, cards --surface, inset mocks back to --bg. Stage dots use
   the real --stage-* colors instead of the mockup's, so the guide teaches the color
   language the user is about to see. Type stays inherited (Plus Jakarta Sans) — the mock's Poppins
   would be the only other font in the product. */
.fg {
  padding: 34px 40px 48px;
  color: var(--text);
  font-family: inherit;
}

/* ── Header ── */
.fg-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 32px; max-width: 1180px; flex-wrap: wrap;
}
.fg-head-copy { max-width: 640px; }
.fg-eyebrow {
  font-size: .68rem; letter-spacing: .14em; color: var(--muted);
  font-weight: 600; margin-bottom: 12px; opacity: .8;
}
.fg-title {
  font-size: 1.7rem; font-weight: 700; line-height: 1.25;
  margin: 0 0 10px; color: var(--text-title);
}
.fg-sub { font-size: .9rem; line-height: 1.65; color: var(--muted); margin: 0; }

.fg-head-actions {
  display: flex; flex-direction: column; gap: 10px;
  align-items: flex-end; flex-shrink: 0;
}
.fg-head-btns { display: flex; gap: 8px; }
.fg-pill {
  font-size: .76rem; padding: 7px 14px; border-radius: 999px;
  border: 1.5px solid var(--border); color: var(--text); background: var(--surface);
  cursor: pointer; font-family: inherit; transition: border-color .15s, color .15s;
}
.fg-pill--ghost { background: transparent; color: var(--muted); }
.fg-pill:hover { border-color: var(--accent); color: var(--text); }

.fg-never {
  display: flex; align-items: center; gap: 9px;
  font-size: .74rem; color: var(--muted); background: none; border: none;
  padding: 4px 2px; cursor: pointer; font-family: inherit; transition: color .15s;
}
.fg-never:hover { color: var(--text); }
.fg-never-box {
  width: 15px; height: 15px; border-radius: 4px; border: 1.5px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-size: .6rem; color: var(--navy); flex-shrink: 0;
}
.fg-never.on .fg-never-box { background: var(--accent); border-color: var(--accent); }

.fg-rule { height: 1px; background: var(--border); margin: 30px 0 28px; max-width: 1180px; opacity: .6; }

/* ── Guided ── */
.fg-guided {
  display: grid; grid-template-columns: 300px minmax(0, 1fr);
  gap: 34px; max-width: 1180px; align-items: start;
}
.fg-rail { display: flex; flex-direction: column; gap: 5px; }
.fg-rail-item {
  display: flex; gap: 12px; align-items: center; text-align: left;
  padding: 11px 14px; border-radius: 10px; background: transparent;
  border: none; border-left: 3px solid transparent;
  cursor: pointer; font-family: inherit; transition: background .13s, border-color .13s;
}
.fg-rail-item:hover { background: var(--wash-1); }
.fg-rail-item.on { background: var(--surface); border-left-color: var(--accent); }
.fg-rail-num {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  background: var(--surface-2); color: var(--muted);
  font-size: .68rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.fg-rail-item.on .fg-rail-num { background: var(--accent); color: var(--navy); }
.fg-rail-txt { font-size: .84rem; color: var(--muted); }
.fg-rail-item.on .fg-rail-txt { color: var(--text); font-weight: 600; }

.fg-rail-cta {
  margin-top: 20px; padding: 16px; border-radius: 12px;
  background: var(--surface); border: 1.5px solid var(--border);
}
.fg-rail-cta-txt { font-size: .74rem; color: var(--muted); line-height: 1.55; margin: 0 0 12px; }

/* ── Panel ── */
.fg-panel {
  background: var(--surface); border: 1.5px solid var(--border); border-radius: 14px;
  padding: 30px 32px 24px; min-height: 470px;
  display: flex; flex-direction: column;
}
.fg-step-title { font-size: 1.25rem; font-weight: 700; margin: 0 0 12px; color: var(--text-title); }
.fg-body {
  font-size: .89rem; line-height: 1.7; color: var(--muted);
  max-width: 640px; margin: 0 0 12px;
}
.fg-body--tight { margin-bottom: 20px; }

.fg-chip {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: .76rem; padding: 7px 15px; border-radius: 7px;
  border: 1.5px solid var(--border); color: var(--muted);
  margin-bottom: 20px; font-weight: 600;
}
.fg-chip--accent { background: var(--accent); border-color: var(--accent); color: var(--navy); }
.fg-chip-row { display: flex; align-items: center; gap: 9px; margin-bottom: 20px; }
.fg-chip-row--wrap { flex-wrap: wrap; gap: 8px; }
.fg-mini-label { font-size: .64rem; letter-spacing: .12em; color: var(--muted); font-weight: 700; }

.fg-tag {
  font-size: .72rem; padding: 5px 12px; border-radius: 999px;
  background: var(--surface-2); color: var(--text);
}
.fg-tag--add { background: transparent; border: 1px dashed var(--border); color: var(--muted); }

.fg-filter-chip {
  font-size: .72rem; padding: 6px 14px; border-radius: 7px;
  border: 1.5px solid var(--border); color: var(--muted); white-space: nowrap;
}
.fg-filter-chip.on { border-color: var(--accent); color: var(--accent); }

/* ── Mocks: illustrations, never interactive ── */
.fg-mock { margin-top: 26px; max-width: 560px; }
.fg-mock--rows {
  background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px;
  padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
}
.fg-mock-row { display: flex; align-items: center; gap: 14px; }
.fg-mock-row.is-dim { opacity: .55; }
.fg-mock-bar { width: 6px; height: 32px; border-radius: 3px; background: var(--muted); flex-shrink: 0; }
.fg-mock-name { flex: 1; font-size: .84rem; }
.fg-mock-date { font-size: .74rem; color: var(--muted); }

.fg-mock--cards { display: flex; flex-direction: column; gap: 10px; }
.fg-mock-card {
  border-radius: 10px; background: var(--bg); border: 1.5px solid var(--border);
  padding: 13px 16px; display: flex; align-items: center; gap: 12px;
}
.fg-mock-card.is-linked { border-color: var(--accent); }
.fg-mock-card-name { font-size: .82rem; flex: 1; }
.fg-mock-card-name.is-muted { color: var(--muted); }
.fg-mock-card-meta { font-size: .72rem; color: var(--muted); }
.fg-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.fg-badge {
  font-size: .68rem; padding: 4px 10px; border-radius: 999px;
  background: var(--green-soft); color: var(--accent); white-space: nowrap;
}

.fg-mock--deps { display: flex; flex-direction: column; }
.fg-dep-line { height: 24px; width: 1.5px; background: var(--accent); margin-left: 26px; }

.fg-mock--shift {
  background: var(--bg); border: 1.5px solid var(--border); border-radius: 10px;
  padding: 18px; max-width: 520px;
}
.fg-stepper { display: flex; align-items: center; gap: 12px; margin: 12px 0 18px; }
.fg-stepper-btn {
  width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid var(--border);
  color: var(--muted); display: flex; align-items: center; justify-content: center; font-size: .9rem;
}
.fg-stepper-btn.is-accent { border-color: var(--accent); color: var(--accent); }
.fg-stepper-val { flex: 1; text-align: center; font-size: 1.15rem; font-weight: 600; }
.fg-shift-dates { display: flex; align-items: center; gap: 14px; font-size: .8rem; flex-wrap: wrap; }
.fg-strike { color: var(--muted); text-decoration: line-through; }
.fg-arrow { color: var(--muted); }
.fg-to { color: var(--accent); font-weight: 600; }
.fg-shift-note { color: var(--muted); margin-left: auto; font-size: .72rem; }

/* ── Definition list (filters) ── */
.fg-defs { margin: 0; display: flex; flex-direction: column; gap: 11px; max-width: 660px; }
.fg-defs-rule { height: 1px; background: var(--border); opacity: .6; }
.fg-def { display: grid; grid-template-columns: 150px 1fr; gap: 16px; align-items: baseline; }
.fg-def dt { font-size: .78rem; color: var(--text); font-weight: 700; }
.fg-def dd { font-size: .84rem; line-height: 1.6; color: var(--muted); margin: 0; }

/* ── Buttons / footer ── */
.fg-btn-primary {
  display: inline-flex; align-items: center; gap: 7px;
  background: var(--accent); color: var(--navy); border: none;
  font-size: .82rem; font-weight: 700; padding: 9px 18px; border-radius: 8px;
  cursor: pointer; font-family: inherit; transition: background .13s;
}
.fg-btn-primary:hover { background: var(--accent-dark); color: var(--white); }
.fg-btn-ghost {
  font-size: .8rem; padding: 8px 17px; border-radius: 8px;
  border: 1.5px solid var(--border); color: var(--muted); background: transparent;
  cursor: pointer; font-family: inherit; transition: border-color .13s, color .13s;
}
.fg-btn-ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--text); }
.fg-btn-ghost:disabled { opacity: .4; cursor: default; }

.fg-panel-foot {
  margin-top: auto; padding-top: 26px;
  display: flex; align-items: center; gap: 14px;
}
.fg-counter { margin-left: auto; font-size: .74rem; color: var(--muted); }

/* ── All at once ── */
.fg-all {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px; max-width: 1180px;
}
.fg-card {
  background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px;
  padding: 22px 24px;
}
.fg-card-visual { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
.fg-card-visual .fg-chip { margin-bottom: 0; }
.fg-card-title { font-size: 1rem; font-weight: 700; margin: 0 0 9px; color: var(--text-title); }
.fg-card-body { font-size: .82rem; line-height: 1.65; color: var(--muted); margin: 0; }

/* ── Skipped ── */
.fg-skipped {
  max-width: 1180px; background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 14px; padding: 26px 30px;
  display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
}
.fg-skipped-copy { flex: 1; min-width: 260px; }
.fg-skipped-title { font-size: 1.02rem; font-weight: 700; margin-bottom: 7px; color: var(--text-title); }
.fg-skipped-body { font-size: .84rem; line-height: 1.6; color: var(--muted); margin: 0; }
.fg-skipped-actions { display: flex; gap: 10px; flex-wrap: wrap; }

/* ── Narrow screens: the rail stacks above the panel ── */
@media (max-width: 900px) {
  .fg { padding: 24px 20px 36px; }
  .fg-guided { grid-template-columns: 1fr; gap: 22px; }
  .fg-head-actions { align-items: flex-start; }
  .fg-def { grid-template-columns: 1fr; gap: 4px; }
}
</style>
