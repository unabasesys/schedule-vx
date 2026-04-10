<template>
  <div class="share-layout">
    <slot />
  </div>
</template>

<script setup>
</script>

<style scoped>
.share-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}
</style>
