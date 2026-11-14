<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ShieldAlert } from 'lucide-vue-next';

const emit = defineEmits<{ (e: 'accepted'): void }>();
const isVisible = ref(false);
const hasAccepted = ref(false);

onMounted(() => {
  const accepted = localStorage.getItem('legal_disclaimer_accepted');
  if (!accepted) {
    isVisible.value = true;
  }
});

const acceptTerms = () => {
  localStorage.setItem('legal_disclaimer_accepted', 'true');
  isVisible.value = false;
  hasAccepted.value = true;
  emit('accepted');
};
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="isVisible" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div class="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        
        <!-- Header -->
        <div class="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-5 flex items-center gap-3 z-10">
          <div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <ShieldAlert class="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 dark:text-white">Aviso Legal y Términos de Uso</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Lectura obligatoria antes de acceder al sistema</p>
          </div>
        </div>

        <!-- Contenido Legal -->
        <div class="p-6 space-y-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          
          <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
            <p class="font-semibold text-amber-800 dark:text-amber-300 mb-1">⚠️ USO EXCLUSIVAMENTE INTERNO</p>
            <p>Esta herramienta es de propiedad exclusiva y su uso está restringido estrictamente a fines operativos internos autorizados. Queda terminantemente prohibida su reproducción, distribución, comercialización, ingeniería inversa o cesión a terceros no autorizados, conforme a la <strong>Ley 23 de 1982</strong> y la <strong>Decisión 351 de la Comunidad Andina</strong> sobre Derechos de Autor.</p>
          </div>

          <div>
            <h3 class="font-bold text-slate-900 dark:text-white mb-2">1. Privacidad y Habeas Data (Ley 1581 de 2012)</h3>
            <p>Esta aplicación funciona de manera <strong>100% local</strong> en el navegador de su dispositivo (tecnología IndexedDB). <strong>NO se realiza ninguna conexión, transmisión ni almacenamiento de datos en servidores externos, nubes o terceros.</strong> El usuario es el único responsable de la custodia, confidencialidad y respaldo de la información registrada en este equipo.</p>
          </div>

          <div>
            <h3 class="font-bold text-slate-900 dark:text-white mb-2">2. Limitación de Responsabilidad</h3>
            <p>La herramienta se proporciona "TAL CUAL" (AS IS), sin garantías de ningún tipo. El desarrollador y la organización no se hacen responsables por:</p>
            <ul class="list-disc list-inside mt-2 space-y-1 text-slate-600 dark:text-slate-400">
              <li>Pérdida, corrupción o robo de datos derivados de fallos del hardware o del navegador.</li>
              <li>Eliminación accidental de datos por limpieza de caché, cookies o historial del navegador.</li>
              <li>Accesos no autorizados al dispositivo físico donde se aloja la aplicación.</li>
            </ul>
            <p class="mt-2"><strong>Recomendación:</strong> Utilice la función "Exportar CSV" periódicamente para generar respaldos de seguridad.</p>
          </div>

          <div>
            <h3 class="font-bold text-slate-900 dark:text-white mb-2">3. Jurisdicción</h3>
            <p>Cualquier controversia derivada del uso indebido, malintencionado o no autorizado de esta herramienta se regirá por las leyes de la República de Colombia y se someterá a la jurisdicción de sus tribunales competentes.</p>
          </div>

        </div>

        <!-- Footer / Acción -->
        <div class="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-5 flex justify-end gap-3">
          <button @click="acceptTerms" class="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors shadow-sm">
            He leído y acepto los términos
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>