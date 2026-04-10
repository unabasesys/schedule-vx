<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal wide">
      <div class="about-modal-hdr">
        <div class="about-modal-badge">
          <span class="about-modal-badge-dot"></span>
          <span class="about-modal-badge-txt">unabase.com</span>
        </div>
        <div class="about-modal-title">Production <span>Calendar</span></div>
        <div class="about-modal-sub">
          {{ lang === 'en'
            ? 'More time for creativity. Less time for repetitive tasks.'
            : 'Más tiempo para la creatividad. Menos tiempo para las tareas repetitivas.' }}
        </div>
      </div>

      <div class="about-modal-body">
        <template v-if="lang === 'en'">
          <p>This is a <span class="highlight">production calendar</span> designed for film and photography production teams. It helps you manage events, dependencies, stages, and key dates across multiple projects.</p>
          <p>All your data is <span class="highlight">stored locally</span> in your browser — no account needed, completely private.</p>
          <p><span class="highlight">How to use:</span></p>
          <ul style="padding-left:18px;margin-top:4px;line-height:1.9;">
            <li>Create a new calendar from the sidebar</li>
            <li>Switch between Calendar and Events views</li>
            <li>Set event dates manually or use dependencies to auto-calculate</li>
            <li>Mark key dates with ★</li>
            <li>Save templates from your best calendars</li>
            <li>Share your calendar via a public link (requires Supabase)</li>
            <li>Export to PDF for clients and agencies</li>
          </ul>
        </template>
        <template v-else>
          <p>Este es un <span class="highlight">calendario de producción</span> diseñado para equipos de cine y fotografía. Te ayuda a gestionar eventos, dependencias, etapas y fechas clave en múltiples proyectos.</p>
          <p>Todos tus datos se <span class="highlight">guardan localmente</span> en tu navegador — sin cuenta, completamente privado.</p>
          <p><span class="highlight">Cómo usar:</span></p>
          <ul style="padding-left:18px;margin-top:4px;line-height:1.9;">
            <li>Crea un nuevo calendario desde la barra lateral</li>
            <li>Alterna entre las vistas Calendario y Eventos</li>
            <li>Fija fechas manualmente o usa dependencias para calcularlas automáticamente</li>
            <li>Marca fechas clave con ★</li>
            <li>Guarda templates de tus mejores calendarios</li>
            <li>Comparte tu calendario con un link público (requiere Supabase)</li>
            <li>Exporta a PDF para clientes y agencias</li>
          </ul>
        </template>
      </div>

      <div class="modal-actions" style="margin-top:20px;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <a href="https://unabase.com" target="_blank" class="about-modal-email">
          🌐 unabase.com
        </a>
        <button class="btn-primary" @click="$emit('close')">
          {{ lang === 'en' ? 'Close' : 'Cerrar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
const globalStore = useGlobalStore()
const lang = computed(() => globalStore.lang)
defineEmits(['close'])
</script>

<style scoped>
.about-modal-hdr {
  margin: -24px -24px 20px;
  background: linear-gradient(135deg, var(--navy) 0%, #0d2a40 70%, #0a3a3a 100%);
  border-radius: 11px 11px 0 0; padding: 28px 28px 22px; position: relative; overflow: hidden;
}
.about-modal-hdr::after {
  content: ''; position: absolute; right: -30px; top: -30px; width: 160px; height: 160px;
  border-radius: 50%; background: radial-gradient(circle,rgba(6,204,180,.18) 0%,transparent 70%);
  pointer-events: none;
}
.about-modal-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(6,204,180,.15); border: 1px solid rgba(6,204,180,.3);
  border-radius: 12px; padding: 3px 10px; margin-bottom: 12px;
}
.about-modal-badge-dot {
  width: 5px; height: 5px; background: var(--accent); border-radius: 50%;
  animation: pulso 2.2s ease-in-out infinite;
}
.about-modal-badge-txt {
  font-family: 'Syne', sans-serif; font-size: .58rem; font-weight: 800;
  letter-spacing: .8px; color: var(--accent); text-transform: uppercase;
}
.about-modal-title {
  font-family: 'Syne', sans-serif; font-size: 1.4rem; font-weight: 800;
  color: #fff; line-height: 1.2; margin-bottom: 6px;
}
.about-modal-title span { color: var(--accent); }
.about-modal-sub { font-size: .75rem; color: rgba(255,255,255,.55); line-height: 1.5; }

.about-modal-body { font-size: .82rem; line-height: 1.75; color: var(--text); }
.about-modal-body p { margin-bottom: 14px; }
.about-modal-body p:last-child { margin-bottom: 0; }
.about-modal-body .highlight { font-weight: 700; color: var(--navy); }

.about-modal-email {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 14px; background: rgba(6,204,180,.07); border: 1.5px solid rgba(6,204,180,.2);
  border-radius: 8px; font-size: .77rem; font-weight: 700; color: var(--navy);
  text-decoration: none; transition: all .18s;
}
.about-modal-email:hover { background: rgba(6,204,180,.14); border-color: var(--accent); }
</style>
