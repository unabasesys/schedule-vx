<template>
  <div class="share-view">
    <!-- Header -->
    <div class="share-view-hdr">
      <div class="sv-brand-left">
        <div class="sv-powered">
          Powered by <a href="https://unabase.com" target="_blank">unabase.com</a>
        </div>
        <div class="sv-lang-toggle">
          <button class="sv-lang-btn" :class="{ active: svLang === 'es' }" @click="svLang = 'es'">ES</button>
          <button class="sv-lang-btn" :class="{ active: svLang === 'en' }" @click="svLang = 'en'">EN</button>
        </div>
      </div>

      <div class="share-view-proj" v-if="project">
        <div class="share-view-name">{{ project.name || project.client }}</div>
        <div class="sv-meta-line" v-if="clientAgency">{{ clientAgency }}</div>
        <div class="sv-meta-line" v-if="dirEp">{{ dirEp }}</div>
        <div style="display:flex;align-items:center;gap:8px;justify-content:center;flex-wrap:wrap;">
          <span class="sv-version-badge" :class="{ changed: project.hasChanges }">
            v{{ project.version ?? 0 }}
          </span>
          <span v-if="lastUpdatedStr" class="sv-last-updated">
            {{ svLang === 'en' ? 'Last updated:' : 'Última actualización:' }} {{ lastUpdatedStr }}
          </span>
        </div>
      </div>

      <div class="sv-company-side" v-if="project">
        <img
          v-if="companyLogo"
          :src="companyLogo"
          class="sv-company-logo"
          alt="studio"
        />
        <div class="sv-company-name-txt">{{ companyName }}</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="sv-loading">
      <div class="sv-loading-spinner">⏳</div>
      <div>{{ svLang === 'en' ? 'Loading…' : 'Cargando…' }}</div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="sv-error">
      <div class="sv-error-icon">🔒</div>
      <div class="sv-error-title">{{ error }}</div>
      <div class="sv-error-sub">{{ svLang === 'en' ? 'This link may be inactive or expired.' : 'Este link puede estar inactivo o haber expirado.' }}</div>
    </div>

    <!-- Calendar -->
    <template v-else-if="project">
      <div class="share-view-body">
        <div class="cal-nav" style="background:#fff;border-radius:10px;padding:10px 16px;flex-shrink:0;">
          <button class="cal-nav-btn" @click="svCalPrev">‹</button>
          <div class="cal-month-title">{{ calTitle }}</div>
          <button class="cal-nav-btn" @click="svCalNext">›</button>
        </div>
        <div class="sv-cal-grid">
          <div class="sv-two-months">
            <div class="sv-month-col">
              <div class="sv-month-label">{{ monthTitle(svCalYear, svCalMonth) }}</div>
              <CalendarMonth
                :year="svCalYear"
                :month="svCalMonth"
                :events="calEvents"
                :holidays="activeHolidays"
                :week-start="project.weekStart || 'sun'"
                :lang="svLang"
                :read-only="true"
              />
            </div>
            <div class="sv-month-col">
              <div class="sv-month-label">{{ monthTitle(svNextYear, svNextMonth) }}</div>
              <CalendarMonth
                :year="svNextYear"
                :month="svNextMonth"
                :events="calEvents"
                :holidays="activeHolidays"
                :week-start="project.weekStart || 'sun'"
                :lang="svLang"
                :read-only="true"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'share' })

const route  = useRoute()
const token  = route.query.token || route.query.t || ''

const loading = ref(true)
const error   = ref(null)
const project = ref(null)
const svLang  = ref('es')
const svCalYear  = ref(new Date().getFullYear())
const svCalMonth = ref(new Date().getMonth())

const { sbGetProject, sbRecordView } = useSupabase()

function t(en, es) { return svLang.value === 'en' ? en : es }

onMounted(async () => {
  if (!token) {
    error.value = t('No share token provided', 'No se proporcionó un token de acceso')
    loading.value = false
    return
  }
  try {
    const data = await sbGetProject(token)
    if (!data) {
      error.value = t('This calendar is not available', 'Este calendario no está disponible')
    } else {
      project.value = data
      svLang.value  = data.lang || 'es'
      // Navigate to first event month
      const dates = (data.events || []).map(e => e.date).filter(Boolean).sort()
      if (dates.length) {
        const d = new Date(dates[0] + 'T00:00:00')
        svCalYear.value  = d.getFullYear()
        svCalMonth.value = d.getMonth()
      }
      await sbRecordView(token)
    }
  } catch (e) {
    error.value = t('Failed to load calendar', 'No se pudo cargar el calendario')
  } finally {
    loading.value = false
  }
})

const calEvents = computed(() => {
  if (!project.value) return []
  const color = project.value.color || '#06CCB4'
  return (project.value.events || [])
    .filter(e => e.active && e.date && !e.internal)
    .map(e => ({ ...e, _projColor: color }))
})

const svNextMonth = computed(() => svCalMonth.value === 11 ? 0 : svCalMonth.value + 1)
const svNextYear  = computed(() => svCalMonth.value === 11 ? svCalYear.value + 1 : svCalYear.value)

const clientAgency = computed(() => {
  if (!project.value) return ''
  return [project.value.client, project.value.agency].filter(Boolean).join(' · ')
})

const dirEp = computed(() => {
  if (!project.value) return ''
  return [
    project.value.director ? (svLang.value === 'en' ? 'Dir: ' : 'Dir: ') + project.value.director : '',
    project.value.ep       ? 'EP: ' + project.value.ep : '',
  ].filter(Boolean).join(' · ')
})

const companyLogo = computed(() => project.value?.company?.logo || '')
const companyName = computed(() => project.value?.company?.name || '')

// ── Last updated ───────────────────────────────────────────────────────────────
// dateFormat was injected into the shared snapshot via orgDateFormat at push time
const svDateFormat = computed(() => project.value?.orgDateFormat || 'DD/MM/AA')

function fmtSharedDate(iso) {
  if (!iso) return ''
  try {
    const [y, m, d] = iso.split('T')[0].split('-')
    const dd = d.padStart(2, '0')
    const mm = m.padStart(2, '0')
    const yy = y.slice(2)
    return svDateFormat.value === 'MM/DD/AA' ? `${mm}/${dd}/${yy}` : `${dd}/${mm}/${yy}`
  } catch { return '' }
}

const lastUpdatedStr = computed(() => fmtSharedDate(project.value?.updatedAt))

// Holidays stored in the shared project snapshot, minus any the org disabled
const activeHolidays = computed(() => {
  if (!project.value) return []
  const disabled = new Set(project.value.disabledHolidays || [])
  return (project.value.holidays || []).filter(h => !disabled.has(h.date))
})

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

function monthTitle(y, m) {
  const months = svLang.value === 'en' ? MONTHS_EN : MONTHS_ES
  return `${months[m]} ${String(y).slice(-2)}`
}

const calTitle = computed(() => {
  const months = svLang.value === 'en' ? MONTHS_EN : MONTHS_ES
  return `${months[svCalMonth.value]} – ${months[svNextMonth.value]} ${String(svCalYear.value).slice(-2)}`
})

function svCalPrev() {
  if (svCalMonth.value === 0) { svCalMonth.value = 11; svCalYear.value-- }
  else svCalMonth.value--
}
function svCalNext() {
  if (svCalMonth.value === 11) { svCalMonth.value = 0; svCalYear.value++ }
  else svCalMonth.value++
}
</script>

<style scoped>
.share-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}

.share-view-hdr {
  position: relative;
  padding: 12px 24px;
  background: var(--navy);
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.sv-brand-left {
  display: flex; flex-direction: column; align-items: flex-start; gap: 5px;
  flex-shrink: 0; min-width: 110px;
}
.sv-powered { font-size: .58rem; color: rgba(255,255,255,.32); white-space: nowrap; line-height: 1; }
.sv-powered a { color: var(--accent); text-decoration: none; }
.sv-powered a:hover { text-decoration: underline; }

.sv-lang-toggle { display: flex; align-items: center; gap: 3px; margin-top: 4px; }
.sv-lang-btn {
  padding: 2px 8px; border: 1.5px solid rgba(255,255,255,.18); border-radius: 4px;
  background: transparent; color: rgba(255,255,255,.4); font-size: .62rem; font-weight: 700;
  cursor: pointer; font-family: inherit; transition: all .15s; letter-spacing: .3px;
}
.sv-lang-btn:hover { background: rgba(255,255,255,.1); color: #fff; }
.sv-lang-btn.active { background: var(--accent); border-color: var(--accent); color: var(--navy); }

.share-view-proj {
  position: absolute; left: 0; right: 0; text-align: center;
  pointer-events: none; padding: 0 260px;
}
.share-view-name {
  font-size: 1rem; font-weight: 800; color: #fff; font-family: 'Syne', sans-serif;
  letter-spacing: -.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sv-meta-line { font-size: .66rem; color: rgba(255,255,255,.45); margin-top: 3px; white-space: nowrap; }
.sv-version-badge {
  display: inline-block; margin-top: 4px; font-size: .58rem; font-weight: 800;
  letter-spacing: .5px; text-transform: uppercase; padding: 2px 7px; border-radius: 4px;
  background: rgba(255,255,255,.08); color: rgba(255,255,255,.5);
}
.sv-version-badge.changed { background: rgba(245,158,11,.18); color: var(--warning); }

.sv-last-updated {
  font-size: .55rem; color: rgba(255,255,255,.32); letter-spacing: .3px;
  white-space: nowrap; margin-top: 4px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.sv-company-side {
  display: flex; flex-direction: column; align-items: flex-end; justify-content: center;
  flex-shrink: 0; min-width: 80px; gap: 4px; margin-left: auto;
}
.sv-company-logo { max-height: 36px; max-width: 110px; width: auto; border-radius: 5px; object-fit: contain; }
.sv-company-name-txt { font-size: .65rem; color: rgba(255,255,255,.4); text-align: right; white-space: nowrap; }

.share-view-body {
  flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 16px 24px; gap: 12px;
}
.sv-cal-grid { flex: 1; overflow: auto; }
.sv-two-months {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-width: 700px;
}
.sv-month-col { display: flex; flex-direction: column; gap: 8px; }
.sv-month-label {
  font-family: 'Syne', sans-serif; font-size: .82rem; font-weight: 700;
  color: var(--navy); padding: 0 2px;
}

.cal-nav {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-shrink: 0;
}
.cal-nav-btn {
  background: none; border: 1.5px solid var(--border); border-radius: 6px;
  padding: 4px 10px; font-size: 1rem; cursor: pointer; color: var(--muted); line-height: 1;
}
.cal-nav-btn:hover { border-color: var(--accent); color: var(--accent); }
.cal-month-title { font-family: 'Syne', sans-serif; font-size: .95rem; font-weight: 700; color: var(--navy); }

/* Loading / Error */
.sv-loading, .sv-error {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; color: var(--muted); font-size: .85rem;
}
.sv-loading-spinner, .sv-error-icon { font-size: 2.5rem; }
.sv-error-title { font-size: 1rem; font-weight: 700; color: var(--navy); }
.sv-error-sub { font-size: .78rem; color: var(--muted); }
</style>
