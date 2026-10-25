<script setup lang="ts">
defineProps<{ isOpen: boolean; title: string; message: string; confirmText?: string; isDanger?: boolean }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm'): void }>();
</script>
<template>
  <Transition name="modal-fade">
    <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div class="absolute inset-0" @click="emit('close')"></div>
      <div class="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl transition-colors">
        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">{{ title }}</h3>
        <p class="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">{{ message }}</p>
        <div class="flex gap-3 justify-end">
          <button @click="emit('close')" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-sm font-medium transition-colors">Cancelar</button>
          <button @click="emit('confirm')" :class="['px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors', isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-cyan-600 hover:bg-cyan-700']">{{ confirmText || 'Confirmar' }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>