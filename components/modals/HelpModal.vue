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
          <p>Your data is <span class="highlight">saved to the cloud</span> and synced to your account. Sign in from any device to access your calendars.</p>
          <p><span class="highlight">How to use:</span></p>
          <ul style="padding-left:18px;margin-top:4px;line-height:1.9;">
            <li>Create a new calendar from the sidebar</li>
            <li>Switch between Calendar, Events and Daily views</li>
            <li>Set event dates manually or use dependencies to auto-calculate</li>
            <li>Mark key dates with ★</li>
            <li>Save templates from your best calendars</li>
            <li>Export to PDF for clients and agencies</li>
          </ul>
        </template>
        <template v-else>
          <p>Este es un <span class="highlight">calendario de producción</span> diseñado para equipos de cine y fotografía. Te ayuda a gestionar eventos, dependencias, etapas y fechas clave en múltiples proyectos.</p>
          <p>Tus datos se <span class="highlight">guardan en la nube</span> y están vinculados a tu cuenta. Inicia sesión desde cualquier dispositivo para acceder a tus calendarios.</p>
          <p><span class="highlight">Cómo usar:</span></p>
          <ul style="padding-left:18px;margin-top:4px;line-height:1.9;">
            <li>Crea un nuevo calendario desde la barra lateral</li>
            <li>Alterna entre las vistas Calendario, Eventos y Daily</li>
            <li>Fija fechas manualmente o usa dependencias para calcularlas automáticamente</li>
            <li>Marca fechas clave con ★</li>
            <li>Guarda templates de tus mejores calendarios</li>
            <li>Exporta a PDF para clientes y agencias</li>
          </ul>
        </template>
      </div>

      <!-- The no-template guide tells the user it lives "in the help menu" when they
           dismiss it. This is that menu, so this is where it has to be findable. -->
      <div v-if="globalStore.guideHidden" class="help-restore-guide">
        <span>{{ lang === 'en'
          ? 'The functions guide is hidden on empty calendars.'
          : 'La guía de funciones está oculta en los calendarios vacíos.' }}</span>
        <button class="help-restore-btn" @click="globalStore.setGuideHidden(false)">
          {{ lang === 'en' ? 'Show it again' : 'Volver a mostrarla' }}
        </button>
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
  /* El encabezado se queda OSCURO también en modo claro: es una pieza de marca,
     igual que el panel de la pantalla de acceso. Por eso redefine acá los tokens
     de texto y de acento: dentro de este bloque la tinta es clara aunque la app
     esté en claro. Mismo bloque que en el front de Relations. */
  --text:          #eef2f0;
  --text-title:    #f4f8f6;
  --text-2:        #a9b4b0;
  --muted:         #8c9a95;
  --accent:        #2fe08a;
  --accent-bright: #4beba0;
  --accent-soft:   rgba(47,224,138,.12);
  --accent-line:   #2a5a44;
  background: linear-gradient(135deg, #080a0a 0%, #0d2a40 70%, #0a3a3a 100%);
  border-radius: 11px 11px 0 0; padding: 28px 28px 22px; position: relative; overflow: hidden;
}
.about-modal-hdr::after {
  content: ''; position: absolute; right: -30px; top: -30px; width: 160px; height: 160px;
  border-radius: 50%; background: radial-gradient(circle,var(--accent-soft) 0%,transparent 70%);
  pointer-events: none;
}
.about-modal-badge {
  display: inline-flex; align-items: center; gap: 5px;
  background: var(--accent-soft); border: 1px solid var(--accent-line);
  border-radius: 12px; padding: 3px 10px; margin-bottom: 12px;
}
.about-modal-badge-dot {
  width: 5px; height: 5px; background: var(--accent); border-radius: 50%;
  animation: pulso 2.2s ease-in-out infinite;
}
.about-modal-badge-txt {
  font-size: .58rem; font-weight: 800;
  letter-spacing: .8px; color: var(--accent); text-transform: uppercase;
}
.about-modal-title {
  font-size: 1.4rem; font-weight: 800;
  color: var(--text-title); line-height: 1.2; margin-bottom: 6px;
}
.about-modal-title span { color: var(--accent); }

.help-restore-guide {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-top: 18px;
  padding: 12px 14px; border-radius: 9px;
  background: var(--surface-2); border: 1.5px solid var(--border);
  font-size: .78rem; color: var(--muted);
}
.help-restore-btn {
  padding: 6px 14px; border-radius: 7px; border: 1.5px solid var(--accent);
  background: transparent; color: var(--accent);
  font-size: .74rem; font-weight: 700; cursor: pointer; font-family: inherit;
  transition: background .13s;
}
.help-restore-btn:hover { background: var(--accent-soft); }
.about-modal-sub { font-size: .75rem; color: var(--text-2); line-height: 1.5; }

.about-modal-body { font-size: .82rem; line-height: 1.75; color: var(--text); }
.about-modal-body p { margin-bottom: 14px; }
.about-modal-body p:last-child { margin-bottom: 0; }
.about-modal-body .highlight { font-weight: 700; color: var(--text); }

.about-modal-email {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 14px; background: var(--accent-soft); border: 1.5px solid var(--accent-line);
  border-radius: 8px; font-size: .77rem; font-weight: 700; color: var(--text);
  text-decoration: none; transition: all .18s;
}
.about-modal-email:hover { background: var(--green-soft); border-color: var(--accent); }
</style>
