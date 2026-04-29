<script setup>
const authStore = useAuthStore()
authStore.init()
navigateTo(authStore.isLoggedIn ? '/schedule' : '/login')
</script>
