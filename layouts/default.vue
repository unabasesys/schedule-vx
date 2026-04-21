<template>
  <div class="app-layout" :class="{ 'sb-collapsed': globalStore.sidebarCollapsed }">
    <AppSidebar />
    <main class="main-area">
      <slot />
    </main>

    <!-- Reopen button — only shown when sidebar is fully collapsed -->
    <Transition name="sb-reopen">
      <button
        v-if="globalStore.sidebarCollapsed"
        class="sb-reopen-btn"
        title="Show sidebar"
        @click="globalStore.toggleSidebar()"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="6"  x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </Transition>
  </div>
</template>

<script setup>
const globalStore = useGlobalStore()
</script>

<style>
/* NOT scoped — must apply globally so #__nuxt fills viewport */
html, body, #__nuxt {
  height: 100%;
  margin: 0;
  padding: 0;
}

.app-layout {
  display: grid;
  grid-template-columns: 270px 1fr;
  height: 100vh;
  overflow: hidden;
  transition: grid-template-columns .22s ease;
}

.app-layout.sb-collapsed {
  grid-template-columns: 0px 1fr;
}

.main-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* ── Sidebar reopen button ── */
/* Anchored to vertical centre — completely outside the top header area */
.sb-reopen-btn {
  position: fixed;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  z-index: 300;
  width: 28px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--navy, #002C3E);
  color: rgba(255,255,255,.55);
  border: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  box-shadow: 3px 0 10px rgba(0,0,0,.2);
  transition: background .15s, color .15s, width .15s;
}
.sb-reopen-btn:hover {
  width: 34px;
  background: var(--accent, #06CCB4);
  color: #002C3E;
}

/* Fade-in transition for the reopen button */
.sb-reopen-enter-active,
.sb-reopen-leave-active { transition: opacity .15s; }
.sb-reopen-enter-from,
.sb-reopen-leave-to    { opacity: 0; }
</style>
