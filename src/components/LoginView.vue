<script setup lang="ts">
import { ref } from 'vue';
import { Sun, Moon } from 'lucide-vue-next';
import { useAuth } from '@composables/useAuth';
import { useTheme } from '@composables/useTheme';

const { login } = useAuth();
const { isDark, toggleTheme } = useTheme();
const email = ref('');
const error = ref('');
const loading = ref(false);

const handleLogin = () => {
  loading.value = true; error.value = '';
  setTimeout(() => {
    const success = login(email.value);
    loading.value = false;
    if (!success) error.value = 'Credenciales no válidas. Contacte al administrador.';
  }, 500);
};
</script>
<template>
  <div class="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
    <button @click="toggleTheme" class="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm" :title="isDark ? 'Modo claro' : 'Modo oscuro'">
      <Sun v-if="isDark" class="w-5 h-5 text-yellow-400" />
      <Moon v-else class="w-5 h-5 text-slate-600" />
    </button>
    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-2xl shadow-xl max-w-md w-full text-center transition-colors duration-300">
      <h1 class="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">Gestor de Tipificaciones</h1>
      <p class="text-slate-500 dark:text-slate-400 mb-6">Ingresa tus credenciales para continuar</p>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <input v-model="email" type="email" placeholder="usuario@empresa.com" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none transition-colors" required autocomplete="username" />
        <p v-if="error" class="text-red-500 dark:text-red-400 text-sm text-left pl-1">{{ error }}</p>
        <button type="submit" :disabled="loading || !email.trim()" class="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors">
          {{ loading ? 'Validando...' : 'Iniciar Sesión' }}
        </button>
      </form>
      <p class="text-xs text-slate-400 dark:text-slate-600 mt-6">💡 Pista dev: usa <code class="bg-slate-200 dark:bg-slate-700 px-1 rounded">admin@test.com</code></p>
    </div>
  </div>
</template>