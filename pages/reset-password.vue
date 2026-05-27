<template>
  <div />
</template>

<script setup>
definePageMeta({ layout: false })

const route = useRoute()
const token = route.query.token

await navigateTo(token ? `/forgot-password?token=${token}` : '/forgot-password')
</script>
