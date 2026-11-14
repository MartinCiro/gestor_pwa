<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@composables/useAuth';
import LoginView from '@components/LoginView.vue';
import CasosManager from '@components/CasosManager.vue';
import AgendaView from '@components/AgendaView.vue';

const { isAuthenticated } = useAuth();
const moduloActivo = ref<'tipificaciones' | 'agenda'>('tipificaciones');
</script>

<template>
  <LoginView v-if="!isAuthenticated" />
  
  <!-- Contenedor principal con fondo dinámico nativo de Tailwind -->
  <div v-else class="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
    
    <!-- Selector de módulo usando dark: directamente -->
    <div class="sticky top-0 z-50 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <div class="container mx-auto flex gap-1 p-2">
        
        <button @click="moduloActivo = 'tipificaciones'" 
                :class="[
                  'px-4 py-2 rounded-lg text-sm font-semibold transition-colors', 
                  moduloActivo === 'tipificaciones' 
                    ? 'bg-cyan-600 text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                ]">
          📝 Tipificaciones
        </button>
        
        <button @click="moduloActivo = 'agenda'" 
                :class="[
                  'px-4 py-2 rounded-lg text-sm font-semibold transition-colors', 
                  moduloActivo === 'agenda' 
                    ? 'bg-cyan-600 text-white' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                ]">
          📅 Agenda
        </button>
        
      </div>
    </div>
    
    <CasosManager v-if="moduloActivo === 'tipificaciones'" />
    <AgendaView v-else />
    
  </div>
</template>