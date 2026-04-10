<template>
  <div class="app-layout">
    <AppSidebar />
    <main class="main-area">
      <slot />
    </main>
  </div>
</template>

<script setup>
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
}

.main-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
</style>
