<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { Sun, Moon, Upload, Download, Database, Copy, ClipboardPaste } from 'lucide-vue-next';
import { useAuth } from '@composables/useAuth';
import { useToast } from '@composables/useToast';
import { useTheme } from '@composables/useTheme';
import { parseCSV, toCSV, downloadFile } from '@utils/csv';
import { db } from '@utils/db';
import ConfirmModal from '@ui/ConfirmModal.vue';

interface Caso { id?: number; tipificacion: string; descripcion: string; fecha: string; }

const { user, logout } = useAuth();
const { toasts, push } = useToast();
const { isDark, toggleTheme } = useTheme();

const DEFAULT_TEMPLATE = "Cliente NOM_CLI, doc, se contacta por # para cancelar movil debido a , se ofrece , cliente no acepta, cod: , radicado: ";
const getEmptyForm = () => ({ tipificacion: '', descripcion: DEFAULT_TEMPLATE });

const casos = ref<Caso[]>([]);
const isLoading = ref(true);
const busqueda = ref('');
const paginaActual = ref(1);
const casosPorPagina = 10;
const modoEdicion = ref(false);
const casoEditando = ref<Caso | null>(null);
const formData = ref(getEmptyForm());
const fileInput = ref<HTMLInputElement | null>(null);
const pendingImport = ref<{ items: any[]; skipped: number } | null>(null);

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const autoResize = () => {
  if (!textareaRef.value) return;
  textareaRef.value.style.height = 'auto';
  textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`;
};
watch(() => formData.value.descripcion, () => nextTick(autoResize));
onMounted(() => nextTick(autoResize));

onMounted(async () => {
  try { casos.value = await db.getAll(); } 
  catch { push('Error al cargar la base de datos', 'error'); }
  finally { isLoading.value = false; }
});

const refreshData = async () => { casos.value = await db.getAll(); };

const guardarCaso = async () => {
  if (formData.value.descripcion.trim() === DEFAULT_TEMPLATE.trim()) {
    push('Debes modificar la plantilla antes de guardar.', 'error');
    return;
  }
  if (!formData.value.descripcion.trim()) { push('La descripción no puede estar vacía', 'error'); return; }
  const fechaActual = new Date().toLocaleString('es-CO');
  try {
    if (modoEdicion.value && casoEditando.value?.id) {
      await db.put({ id: casoEditando.value.id, ...formData.value, fecha: fechaActual });
      push('Tipificación actualizada');
    } else {
      await db.add({ ...formData.value, fecha: fechaActual });
      push('Nueva tipificación guardada');
    }
    await refreshData();
    resetForm();
  } catch { push('Error al guardar en IndexedDB', 'error'); }
};

const prepararEdicion = (caso: Caso) => {
  modoEdicion.value = true;
  casoEditando.value = caso;
  formData.value = { tipificacion: caso.tipificacion, descripcion: caso.descripcion };
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const showDeleteModal = ref(false);
const itemToDelete = ref<number | null>(null);
const solicitarEliminacion = (id: number) => { itemToDelete.value = id; showDeleteModal.value = true; };
const confirmarEliminacion = async () => {
  if (!itemToDelete.value) return;
  try {
    await db.delete(itemToDelete.value);
    await refreshData();
    push('Tipificación eliminada', 'info');
    if (casosPagina.value.length === 0 && paginaActual.value > 1) paginaActual.value--;
  } catch { push('Error al eliminar', 'error'); }
  finally { showDeleteModal.value = false; itemToDelete.value = null; }
};

const resetForm = () => { modoEdicion.value = false; casoEditando.value = null; formData.value = getEmptyForm(); };

const openFilePicker = () => fileInput.value?.click();
const handleFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const { rows, mapped } = parseCSV(text);
    if (rows.length === 0) throw new Error('El archivo no contiene filas.');
    const items: any[] = []; let skipped = 0;
    for (const row of rows) {
      const desc = mapped.descripcion ? row[mapped.descripcion] : '';
      const tip = mapped.tipificacion ? row[mapped.tipificacion] : 'Importado';
      if (!desc.trim()) { skipped++; continue; }
      items.push({ tipificacion: tip, descripcion: desc, fecha: row[mapped.fecha || ''] || new Date().toLocaleString() });
    }
    if (items.length === 0) throw new Error('No se encontraron descripciones válidas.');
    pendingImport.value = { items, skipped };
  } catch (err) { push(err instanceof Error ? err.message : 'Error al leer CSV', 'error'); }
  finally { input.value = ''; }
};

const confirmImport = async (mode: 'append' | 'replace') => {
  if (!pendingImport.value) return;
  try {
    if (mode === 'replace') await db.clear();
    await db.bulkAdd(pendingImport.value.items);
    await refreshData();
    push(`${pendingImport.value.items.length} registros importados`);
    pendingImport.value = null;
  } catch { push('Error al importar', 'error'); }
};

const exportCSV = () => {
  const data = busqueda.value ? casosFiltrados.value : casos.value;
  if (data.length === 0) return push('No hay datos para exportar', 'error');
  const csv = toCSV(data.map(c => ({ tipificacion: c.tipificacion, descripcion: c.descripcion, fecha: c.fecha })), ['tipificacion', 'descripcion', 'fecha']);
  downloadFile(csv, `tipificaciones_${Date.now()}.csv`);
  push('Datos exportados');
};

const casosFiltrados = computed(() => {
  if (!busqueda.value) return casos.value;
  const q = busqueda.value.toLowerCase();
  return casos.value.filter(c => c.tipificacion.toLowerCase().includes(q) || c.descripcion.toLowerCase().includes(q));
});
const totalPaginas = computed(() => Math.max(1, Math.ceil(casosFiltrados.value.length / casosPorPagina)));
const casosPagina = computed(() => {
  const start = (paginaActual.value - 1) * casosPorPagina;
  return casosFiltrados.value.slice(start, start + casosPorPagina);
});
const cambiarPagina = (p: number) => { if (p >= 1 && p <= totalPaginas.value) paginaActual.value = p; };

const copiar = async (caso: Caso) => {
  const textoACopiar = `${caso.tipificacion ? `[${caso.tipificacion}]\n` : ''}${caso.descripcion}`;
  
  // Método 1: API moderna (funciona en HTTPS/localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(textoACopiar);
      push('Texto copiado al portapapeles', 'success');
      return;
    } catch (err) {
      console.warn('Clipboard API falló, usando fallback...', err);
    }
  }
  
  // Método 2: Fallback clásico (funciona en file://)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = textoACopiar;
    
    // Estilos para que el textarea sea invisible
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) {
      push('Texto copiado al portapapeles', 'success');
    } else {
      throw new Error('execCommand falló');
    }
  } catch (err) {
    console.error('Error al copiar:', err);
    push('Error al copiar el texto. Selecciona y copia manualmente.', 'error');
  }
};

// Copiar el contenido del textarea
const copiarDescripcion = async () => {
  const textoACopiar = formData.value.descripcion;
  if (!textoACopiar.trim()) {
    push('No hay texto para copiar', 'info');
    return;
  }
  
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(textoACopiar);
      push('Descripción copiada', 'success');
      return;
    } catch (err) {
      console.warn('Clipboard API falló, usando fallback...', err);
    }
  }
  
  // Fallback clásico
  try {
    const textArea = document.createElement('textarea');
    textArea.value = textoACopiar;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      push('Descripción copiada', 'success');
    } else {
      throw new Error('execCommand falló');
    }
  } catch (err) {
    push('Error al copiar', 'error');
  }
};

// Pegar desde el portapapeles al textarea
const pegarDescripcion = async () => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      const texto = await navigator.clipboard.readText();
      formData.value.descripcion = texto;
      push('Texto pegado', 'success');
      nextTick(autoResize);
      return;
    } catch (err) {
      console.warn('Clipboard read falló, usando fallback...', err);
    }
  }
  
  // Fallback: sugerir al usuario que use Ctrl+V
  push('Usa Ctrl+V (o Cmd+V) para pegar', 'info');
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
    <nav class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-40 transition-colors">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-xl font-bold text-cyan-600 dark:text-cyan-400">📝 Gestor de Tipificaciones</h1>
        <div class="flex items-center gap-3">
          <span class="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">{{ user?.email }} ({{ user?.nombreRol }})</span>
          <button @click="toggleTheme" class="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <Sun v-if="isDark" class="w-5 h-5 text-yellow-400" />
            <Moon v-else class="w-5 h-5 text-slate-600" />
          </button>
          <button @click="logout" class="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors">Cerrar Sesión</button>
        </div>
      </div>
    </nav>

    <main class="container mx-auto p-4 sm:p-6 max-w-5xl">
       <section class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 transition-colors">
        
        <!-- Grupo de Botones -->
        <div class="flex items-center gap-3">
          <button @click="openFilePicker" class="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors">
            <Upload class="w-4 h-4" />
            <span>Importar CSV</span>
          </button>
          
          <button @click="exportCSV" :disabled="casos.length === 0" class="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-colors">
            <Download class="w-4 h-4" />
            <span>Exportar Todo</span>
          </button>
          
          <input ref="fileInput" type="file" accept=".csv" class="hidden" @change="handleFile" />
        </div>
        
        <!-- Indicador de Base de Datos Local -->
        <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
          <Database class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Local: <strong class="text-cyan-600 dark:text-cyan-400">{{ casos.length }}</strong> registros</span>
        </div>

      </section>

      <div class="bg-white dark:bg-slate-800 border border-cyan-500/30 rounded-xl p-5 mb-6 shadow-sm transition-colors">
        <h2 class="text-lg font-semibold text-cyan-600 dark:text-cyan-400 mb-4">{{ modoEdicion ? `Editando #${casoEditando?.id}` : 'Nueva Tipificación' }}</h2>
        <div class="space-y-4">
            <input v-model="formData.tipificacion" placeholder="Título o Código (Opcional)" class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white focus:border-cyan-500 outline-none transition-colors" />
            
            <!-- Contenedor relativo para posicionar los botones flotantes -->
            <div class="relative">
            <textarea 
                ref="textareaRef" 
                v-model="formData.descripcion" 
                @input="autoResize" 
                rows="4" 
                class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 pr-20 text-slate-900 dark:text-white focus:border-cyan-500 outline-none resize-none font-mono text-sm overflow-hidden transition-colors" 
                :placeholder="DEFAULT_TEMPLATE"
            ></textarea>
            
            <!-- Botones flotantes en la esquina superior derecha -->
            <div class="absolute top-2 right-2 flex gap-1.5">
                <button 
                @click="copiarDescripcion" 
                class="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm transition-colors" 
                title="Copiar descripción"
                >
                <Copy class="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </button>
                <button 
                @click="pegarDescripcion" 
                class="p-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-md shadow-sm transition-colors" 
                title="Pegar desde portapapeles"
                >
                <ClipboardPaste class="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </button>
            </div>
            </div>
            
            <div class="flex gap-3">
            <button @click="guardarCaso" class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">{{ modoEdicion ? '💾 Actualizar' : '➕ Guardar en DB' }}</button>
            <button v-if="modoEdicion" @click="resetForm" class="border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg transition-colors">Cancelar</button>
            </div>
        </div>
    </div>

      <input v-model="busqueda" placeholder="🔎 Buscar en base de datos..." class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 mb-6 text-slate-900 dark:text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition-colors" />

      <div v-if="isLoading" class="text-center py-12 text-slate-500">Cargando base de datos...</div>
      <div v-else-if="casos.length === 0" class="text-center py-16 bg-white dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 transition-colors">
        <p class="text-slate-500 dark:text-slate-400 mb-2 text-lg">No hay tipificaciones guardadas.</p>
        <button @click="formData.descripcion = DEFAULT_TEMPLATE" class="text-cyan-600 dark:text-cyan-400 underline text-sm hover:text-cyan-500">Cargar plantilla en el formulario</button>
      </div>

      <div v-else class="space-y-3">
        <div v-for="caso in casosPagina" :key="caso.id" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 transition-colors group">
  
  <!-- Contenedor flexible responsivo -->
  <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
    
    <!-- 1. Contenido Principal (Ocupa todo el espacio disponible) -->
    <div class="flex-1 min-w-0 w-full">
      <!-- Encabezado de la tarjeta -->
      <div class="flex flex-wrap items-center gap-2 mb-2">
        <span class="text-xs font-mono bg-slate-100 dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded shrink-0">
          ID: {{ caso.id }}
        </span>
        <span class="text-xs text-slate-500 shrink-0">
          {{ caso.fecha }}
        </span>
        <span v-if="caso.tipificacion" class="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-full">
          • {{ caso.tipificacion }}
        </span>
      </div>
      
      <!-- Descripción con protección contra desbordamiento -->
      <p class="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap break-words font-mono bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
        {{ caso.descripcion }}
      </p>
    </div>

    <!-- 2. Botones de Acción (A la derecha en PC, abajo en móvil) -->
    <div class="flex sm:flex-col gap-2 w-full sm:w-auto justify-end sm:justify-start opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
      
      <!-- Botón Copiar -->
      <button 
        @click="copiar(caso)" 
        class="flex items-center justify-center gap-2 px-3 py-2 bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-600/40 rounded-lg transition-colors text-sm font-medium" 
        title="Copiar texto"
      >
        <Copy class="w-4 h-4" />
        <span class="sm:hidden">Copiar</span>
      </button>

      <!-- Botón Editar -->
      <button 
        @click="prepararEdicion(caso)" 
        class="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-600/40 rounded-lg transition-colors text-sm font-medium" 
        title="Editar"
      >
        ✏️
        <span class="sm:hidden">Editar</span>
      </button>

      <!-- Botón Eliminar -->
      <button 
        @click="solicitarEliminacion(caso.id!)" 
        class="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-600/40 rounded-lg transition-colors text-sm font-medium" 
        title="Eliminar"
      >
        🗑️
        <span class="sm:hidden">Eliminar</span>
      </button>

    </div>
  </div>
</div>
      </div>

      <div v-if="totalPaginas > 1" class="flex justify-center items-center gap-2 mt-8">
        <button @click="cambiarPagina(paginaActual - 1)" :disabled="paginaActual === 1" class="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">«</button>
        <button v-for="i in totalPaginas" :key="i" @click="cambiarPagina(i)" :class="['w-9 h-9 rounded-lg text-sm transition-colors', paginaActual === i ? 'bg-cyan-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700']">{{ i }}</button>
        <button @click="cambiarPagina(paginaActual + 1)" :disabled="paginaActual === totalPaginas" class="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">»</button>
      </div>
    </main>

    <ConfirmModal :is-open="showDeleteModal" title="Eliminar Tipificación" message="¿Estás seguro de eliminar esta tipificación de la base de datos? Esta acción no se puede deshacer." confirm-text="Sí, eliminar" :is-danger="true" @close="showDeleteModal = false" @confirm="confirmarEliminacion" />

    <Transition name="modal-fade">
      <div v-if="pendingImport" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="absolute inset-0" @click="pendingImport = null"></div>
        <div class="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl transition-colors">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Confirmar importación</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm mb-1">
            Se leyeron <strong class="text-slate-900 dark:text-white">{{ pendingImport.items.length }}</strong> registros válidos.
          </p>
          <p v-if="pendingImport.skipped > 0" class="text-yellow-600 dark:text-yellow-400 text-xs mb-4">
            ⚠️ Se omitieron {{ pendingImport.skipped }} filas vacías.
          </p>
          <p class="text-slate-500 dark:text-slate-400 text-xs mb-6">¿Deseas agregarlos a los {{ casos.length }} existentes o reemplazar todo?</p>
          
          <div class="grid grid-cols-1 gap-3">
            <button @click="confirmImport('append')" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition-colors">
              ➕ Agregar a los existentes
            </button>
            <button @click="confirmImport('replace')" class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors">
              🔄 Reemplazar todo
            </button>
            <button @click="pendingImport = null" class="w-full border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-3 rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </Transition>

    
    <div class="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div v-for="t in toasts" :key="t.id" :class="['pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl font-medium text-sm min-w-[240px] border backdrop-blur-md', t.type === 'success' ? 'bg-green-600/90 border-green-400 text-white' : t.type === 'error' ? 'bg-red-600/90 border-red-400 text-white' : 'bg-cyan-600/90 border-cyan-400 text-white']">
          <span>{{ t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️' }}</span>
          <span class="flex-1">{{ t.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>
<style scoped>
.toast-enter-active { transition: all .3s cubic-bezier(.2,.9,.3,1.2); }
.toast-leave-active { transition: all .25s ease-in; }
.toast-enter-from { transform: translateX(120%); opacity: 0; }
.toast-leave-to   { transform: translateX(120%); opacity: 0; }
</style>