<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@composables/useAuth';
import LoginView from '@components/LoginView.vue';
import CasosManager from '@components/CasosManager.vue';
import AgendaView from '@components/AgendaView.vue';
import ProrrateoView from '@components/ProrrateoView.vue'; // 👈 Importar nueva vista

const { isAuthenticated } = useAuth();
const moduloActivo = ref<'tipificaciones' | 'agenda' | 'prorrateo'>('tipificaciones');
</script>

<template>
  <LoginView v-if="!isAuthenticated" />
  
  <div v-else class="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
    
    <!-- Selector de módulo -->
    <div class="sticky top-0 z-50 border-b bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <div class="container mx-auto flex gap-1 p-2 overflow-x-auto">
        
        <button @click="moduloActivo = 'tipificaciones'" 
                :class="['px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap', 
                         moduloActivo === 'tipificaciones' ? 'bg-cyan-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800']">
          📝 Tipificaciones
        </button>
        
        <button @click="moduloActivo = 'agenda'" 
                :class="['px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap', 
                         moduloActivo === 'agenda' ? 'bg-cyan-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800']">
          📅 Agenda
        </button>

        <button @click="moduloActivo = 'prorrateo'" 
                :class="['px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap', 
                         moduloActivo === 'prorrateo' ? 'bg-cyan-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800']">
          🧮 Prorrateo
        </button>
        
      </div>
    </div>
    
    <CasosManager v-if="moduloActivo === 'tipificaciones'" />
    <AgendaView v-else-if="moduloActivo === 'agenda'" />
    <ProrrateoView v-else />
    
  </div>
</template>