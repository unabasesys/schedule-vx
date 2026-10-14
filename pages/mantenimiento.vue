<script setup>
// Pantalla fija de mantenimiento. Layout propio (sin sidebar) a propósito: se
// basa en la identidad visual de Vx (verde #20a789, Nunito), NO en la capa
// oscura que comparten Calendar y Relations (§3.2.2 CLAUDE.md) — es una
// pantalla de sistema, distinta a propósito de la app normal.
definePageMeta({ layout: false })

useHead({
  title: 'Calendar — en mantenimiento',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap' },
  ],
})
</script>

<template>
  <div class="maint-page">
    <main>
      <div class="card">
        <div class="brand">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /><circle cx="12" cy="12" r="2.6" fill="currentColor" /></svg>
          <span>unabase · Calendar</span>
        </div>

        <div class="icon-wrap">
          <svg class="gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4.5" width="18" height="16" rx="2.4" />
            <path d="M3 9.5h18" />
            <path d="M8 2.5v4M16 2.5v4" />
            <path d="M7.5 13.2h2.2M11.9 13.2h2.2M16.3 13.2h0.01M7.5 16.8h2.2M11.9 16.8h2.2" />
          </svg>
        </div>

        <h1>Calendar está en mantenimiento</h1>
        <p class="lead">Estamos haciendo mejoras para darte un mejor servicio. El acceso vuelve a abrirse en breve, sin que pierdas nada de lo que ya tenías cargado.</p>
        <p class="app-name">calendar.unabase.com</p>

        <div class="progress"><div /></div>

        <div class="meta">
          <span class="dot" />
          <span>En progreso — vuelve a intentarlo en unos minutos</span>
        </div>
      </div>
    </main>

    <footer>
      ¿Urgente? Escribe a <a href="mailto:soporte@unabase.com">soporte@unabase.com</a>
    </footer>
  </div>
</template>

<style scoped>
.maint-page {
  --bg: #f3f4f6;
  --surface: #ffffff;
  --border: #eaecf0;
  --text: #1c2126;
  --text-muted: #667085;
  --text-caption: #98a2b3;
  --accent: #20a789;
  --accent-dark: #19856d;
  --accent-soft: #ccf5ec;
  --ring: 32, 167, 137;

  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg);
  color: var(--text);
  font-family: 'Nunito', ui-sans-serif, system-ui, sans-serif;
  padding-inline: max(16px, env(safe-area-inset-left, 0px)) max(16px, env(safe-area-inset-right, 0px));
}

@media (prefers-color-scheme: dark) {
  .maint-page {
    --bg: #0f1214;
    --surface: #181c1f;
    --border: #262b2f;
    --text: #eef1f0;
    --text-muted: #9aa4a1;
    --text-caption: #7a847f;
    --accent: #3ac7a5;
    --accent-dark: #20a789;
    --accent-soft: #163a31;
    color-scheme: dark;
  }
}

main {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-block: 32px;
}

.card {
  width: 100%;
  max-width: 460px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 40px 36px 34px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(16, 24, 40, .04), 0 12px 32px -12px rgba(16, 24, 40, .12);
}

.brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-bottom: 28px;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 13.5px;
  letter-spacing: .02em;
  text-transform: uppercase;
}
.brand svg { width: 18px; height: 18px; flex: none; }

.icon-wrap {
  width: 84px;
  height: 84px;
  margin: 0 auto 22px;
  border-radius: 50%;
  background: var(--accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.icon-wrap::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1.5px dashed rgba(var(--ring), .35);
}
.icon-wrap svg { width: 38px; height: 38px; color: var(--accent-dark); }
@media (prefers-color-scheme: dark) { .icon-wrap svg { color: var(--accent); } }

.gear { transform-origin: 50% 50%; animation: spin 9s linear infinite; }
@media (prefers-reduced-motion: reduce) { .gear { animation: none; } }
@keyframes spin { to { transform: rotate(360deg); } }

h1 { font-size: 22px; font-weight: 800; margin: 0 0 10px; letter-spacing: -.01em; text-wrap: balance; }
.lead { margin: 0 0 6px; color: var(--text-muted); font-size: 15px; line-height: 1.55; text-wrap: balance; }
.app-name { margin: 0 0 24px; font-size: 13.5px; color: var(--text-caption); font-weight: 600; }

.progress { height: 6px; border-radius: 99px; background: var(--border); overflow: hidden; margin: 0 0 22px; }
.progress > div {
  height: 100%;
  width: 42%;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--accent-dark), var(--accent));
  animation: slide 2.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) { .progress > div { animation: none; width: 55%; } }
@keyframes slide {
  0% { transform: translateX(-60%); }
  50% { transform: translateX(70%); }
  100% { transform: translateX(-60%); }
}

.meta { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 12.5px; color: var(--text-caption); font-variant-numeric: tabular-nums; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex: none; }

footer { padding: 10px 0 max(22px, env(safe-area-inset-bottom, 0px)); font-size: 12px; color: var(--text-caption); text-align: center; }
footer a { color: var(--text-muted); }
</style>
