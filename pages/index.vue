<script setup>
const authStore = useAuthStore()
authStore.init()
navigateTo(authStore.isLoggedIn ? '/calendar' : '/login')
</script>
