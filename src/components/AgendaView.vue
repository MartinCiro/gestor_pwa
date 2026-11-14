<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  Sun,
  Moon,
  Upload,
  Download,
} from "lucide-vue-next";

import { useAgenda, type VistaAgenda } from "@composables/useAgenda";
import { useTheme } from "@composables/useTheme";
import { useAuth } from "@composables/useAuth";
import { useCSV } from "@composables/useCSV";
import { useToast } from '@composables/useToast';
import { agendaDB, type Agendamiento } from "@utils/db";
import ConfirmModal from "@ui/ConfirmModal.vue";
import Spinner from "@ui/Spinner.vue";
import { parseCSV } from '@utils/csv'; 

// ====== Composables ======
const {
  agendamientos,
  vistaActual,
  fechaReferencia,
  cargando,
  cargar,
  guardar,
  eliminar,
  eventosDelDia,
  diasMes,
  diasSemana,
  tituloVista,
  navegar,
  irAHoy,
  hoy,
  toISO,
  nombresDia,
  mismoDia,
} = useAgenda();

const { isDark, toggleTheme } = useTheme();
const { user, logout } = useAuth();ConfirmModal
const { toasts, push } = useToast();
const { isProcessing, exportData } = useCSV();

onMounted(cargar);

// ====== Modal de creación/edición ======
const showModal = ref(false);
const editando = ref<Agendamiento | null>(null);
const form = ref({
  fecha: hoy(),
  hora: "",
  contacto: "",
  servicio: "movil" as "fijo" | "movil",
  notas: "",
});

const abrirNuevo = (fecha?: string) => {
  editando.value = null;
  form.value = {
    fecha: fecha || hoy(),
    hora: "",
    contacto: "",
    servicio: "movil",
    notas: "",
  };
  showModal.value = true;
};

const abrirEdicion = (a: Agendamiento) => {
  editando.value = a;
  form.value = {
    fecha: a.fecha,
    hora: a.hora || "",
    contacto: a.contacto,
    servicio: a.servicio,
    notas: a.notas || "",
  };
  showModal.value = true;
};

const guardarForm = async () => {
  if (!form.value.contacto.trim()) return;
  const item: Agendamiento = {
    ...(editando.value?.id ? { id: editando.value.id } : {}),
    fecha: form.value.fecha,
    hora: form.value.hora || undefined,
    contacto: form.value.contacto.trim(),
    servicio: form.value.servicio,
    notas: form.value.notas.trim() || undefined,
  };
  await guardar(item);
  showModal.value = false;
};

// ====== Confirmación de eliminación ======
const showDelete = ref(false);
const itemToDelete = ref<number | null>(null);
const pedirEliminar = (id: number) => {
  itemToDelete.value = id;
  showDelete.value = true;
};
const confirmarEliminar = async () => {
  if (itemToDelete.value) await eliminar(itemToDelete.value);
  showDelete.value = false;
  itemToDelete.value = null;
};

const cambiarVista = (v: VistaAgenda) => {
  vistaActual.value = v;
};
const totalMes = computed(() => agendamientos.value.length);

// ====== Lógica de CSV (SRP: Delegada a useCSV) ======
const fileInput = ref<HTMLInputElement | null>(null);

const exportarCSV = () => {
  exportData(
    agendamientos.value,
    ["fecha", "hora", "contacto", "servicio", "notas"],
    `agenda_contactos_${new Date().toISOString().split("T")[0]}.csv`,
  );
};

const esDuplicado = (item: Agendamiento): boolean => {
  return agendamientos.value.some(existing => {
    // Comparación estricta de los 4 campos identificadores
    const mismaFecha = existing.fecha === item.fecha;
    const mismaHora = (existing.hora || '') === (item.hora || '');
    const mismoContacto = existing.contacto.trim().toLowerCase() === item.contacto.trim().toLowerCase();
    const mismoServicio = existing.servicio === item.servicio;
    
    return mismaFecha && mismaHora && mismoContacto && mismoServicio;
  });
};

const handleFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const { rows, mapped } = parseCSV(text);
    
    if (rows.length === 0) throw new Error('El archivo CSV está vacío.');

    const itemsNuevos: Agendamiento[] = [];
    const itemsDuplicados: Agendamiento[] = [];
    let skipped = 0;

    for (const row of rows) {
      const contacto = mapped.contacto ? row[mapped.contacto] : '';
      if (!contacto.trim()) { skipped++; continue; }

      const nuevoItem: Agendamiento = {
        fecha: (mapped.fecha ? row[mapped.fecha] : new Date().toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
        hora: (mapped.hora ? row[mapped.hora] : '') || undefined,
        contacto: contacto.trim(),
        servicio: (row[mapped.servicio || '']?.toLowerCase().includes('fijo') ? 'fijo' : 'movil') as 'fijo' | 'movil',
        notas: (mapped.notas ? row[mapped.notas] : '') || undefined
      };

      // ✅ VERIFICAR SI YA EXISTE UN AGENDAMIENTO IDÉNTICO
      if (esDuplicado(nuevoItem)) {
        itemsDuplicados.push(nuevoItem);
      } else {
        itemsNuevos.push(nuevoItem);
      }
    }

    if (itemsNuevos.length === 0 && itemsDuplicados.length === 0) {
      throw new Error('No se encontraron contactos válidos en el archivo.');
    }

    // Insertar solo los no duplicados
    for (const item of itemsNuevos) {
      await agendaDB.add(item);
    }
    
    await cargar(); // Recargar la agenda

    // 📊 Feedback detallado al usuario
    if (itemsNuevos.length > 0 && itemsDuplicados.length > 0) {
      push(`✅ ${itemsNuevos.length} importados. ⚠️ ${itemsDuplicados.length} duplicados omitidos.`, 'info', 5000);
    } else if (itemsNuevos.length > 0) {
      push(`${itemsNuevos.length} agendamientos importados correctamente`, 'success');
    } else {
      push(`⚠️ No se importó nada: ${itemsDuplicados.length} registros ya existían`, 'info', 5000);
    }
    
  } catch (err) {
    push(err instanceof Error ? err.message : 'Error al leer el archivo CSV', 'error');
  } finally {
    input.value = '';
  }
};

const openFilePicker = () => fileInput.value?.click();
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300"
  >
    <!-- NAVBAR -->
    <nav
      class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 sm:p-4 sticky top-0 z-40 transition-colors"
    >
      <div
        class="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-3"
      >
        <h1 class="text-xl font-bold text-cyan-600 dark:text-cyan-400">
          📅 Agenda de Contactos
        </h1>
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <!-- Botón de Tema -->
          <button
            @click="toggleTheme"
            class="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Sun v-if="isDark" class="w-5 h-5 text-yellow-400" />
            <Moon v-else class="w-5 h-5 text-slate-600" />
          </button>

          <!-- Contador -->
          <div
            class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700"
          >
            <CalendarIcon
              class="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400"
            />
            <span
              >Total:
              <strong class="text-cyan-600 dark:text-cyan-400">{{
                totalMes
              }}</strong></span
            >
          </div>

          <!-- IMPORTAR -->
          <button
            @click="openFilePicker"
            :disabled="isProcessing"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
            title="Importar"
          >
            <Spinner v-if="isProcessing" size="sm" />
            <Upload v-else class="w-4 h-4" />
          </button>

          <!-- 👉 BOTÓN EXPORTAR con spinner -->
          <button
            @click="exportarCSV"
            :disabled="agendamientos.length === 0 || isProcessing"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs sm:text-sm font-semibold text-white transition-colors"
            title="Exportar Todo"
          >
            <Spinner v-if="isProcessing" size="sm" />
            <Download v-else class="w-4 h-4" />
          </button>

          <!-- Input oculto para el archivo -->
          <input
            ref="fileInput"
            type="file"
            accept=".csv"
            class="hidden"
            @change="handleFile"
          />

          <!-- Separador visual (solo desktop) -->
          <div
            class="hidden sm:block w-px h-6 bg-slate-300 dark:bg-slate-600"
          ></div>

          <!-- Botón Nuevo (ya existente) -->
          <button
            @click="abrirNuevo()"
            class="flex items-center gap-1.5 p-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs sm:text-sm font-semibold text-white transition-colors"
            title="Agregar"
          >
            <Plus class="w-4 h-4" />
          </button>

          <!-- Info Usuario y Salir -->
          <span
            class="text-xs text-slate-500 dark:text-slate-400 hidden lg:inline truncate max-w-[120px]"
            >{{ user?.email }}</span
          >
          <button
            @click="logout"
            class="px-3 py-1.5 text-xs sm:text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-600/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>

    <main class="container mx-auto p-4 sm:p-6 max-w-6xl">
      <!-- Controles -->
      <div
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2">
          <button
            @click="navegar(-1)"
            class="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            @click="irAHoy"
            class="px-3 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg"
          >
            Hoy
          </button>
          <button
            @click="navegar(1)"
            class="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
          <h2 class="text-base sm:text-lg font-semibold ml-2 capitalize">
            {{ tituloVista }}
          </h2>
        </div>

        <div class="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          <button
            @click="cambiarVista('dia')"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5',
              vistaActual === 'dia'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300',
            ]"
          >
            <List class="w-3.5 h-3.5" /> Día
          </button>
          <button
            @click="cambiarVista('semana')"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5',
              vistaActual === 'semana'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300',
            ]"
          >
            <LayoutGrid class="w-3.5 h-3.5" /> Semana
          </button>
          <button
            @click="cambiarVista('mes')"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5',
              vistaActual === 'mes'
                ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300',
            ]"
          >
            <CalendarIcon class="w-3.5 h-3.5" /> Mes
          </button>
        </div>
      </div>

      <div v-if="cargando" class="text-center py-12 text-slate-500">
        Cargando agenda...
      </div>

      <!-- ====== VISTA DÍA ====== -->
      <div
        v-else-if="vistaActual === 'dia'"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5"
      >
        <div
          v-if="eventosDelDia(fechaReferencia).length === 0"
          class="text-center py-12 text-slate-500"
        >
          <p class="mb-3">No hay agendamientos para este día</p>
          <button
            @click="abrirNuevo(toISO(fechaReferencia))"
            class="text-cyan-600 dark:text-cyan-400 underline text-sm"
          >
            + Agendar uno nuevo
          </button>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="ev in eventosDelDia(fechaReferencia)"
            :key="ev.id"
            class="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-cyan-500/50 group"
          >
            <div class="text-center min-w-[60px]">
              <div class="text-xs text-slate-500">Hora</div>
              <div class="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                {{ ev.hora || "--:--" }}
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold truncate">{{ ev.contacto }}</span>
                <span
                  :class="[
                    'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                    ev.servicio === 'fijo'
                      ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400'
                      : 'bg-purple-100 dark:bg-purple-600/20 text-purple-700 dark:text-purple-400',
                  ]"
                >
                  {{ ev.servicio }}
                </span>
              </div>
              <p v-if="ev.notas" class="text-xs text-slate-500 truncate">
                {{ ev.notas }}
              </p>
            </div>
            <div
              class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <button
                @click="abrirEdicion(ev)"
                class="p-1.5 bg-yellow-100 dark:bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 rounded hover:bg-yellow-200"
              >
                ✏️
              </button>
              <button
                @click="pedirEliminar(ev.id!)"
                class="p-1.5 bg-red-100 dark:bg-red-600/20 text-red-600 dark:text-red-400 rounded hover:bg-red-200"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== VISTA SEMANA ====== -->
      <div
        v-else-if="vistaActual === 'semana'"
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 overflow-x-auto"
      >
        <div class="grid grid-cols-7 gap-2 min-w-[700px]">
          <div
            v-for="d in diasSemana"
            :key="toISO(d)"
            :class="[
              'border border-slate-200 dark:border-slate-700 rounded-lg p-2 min-h-[180px]',
              mismoDia(toISO(d), new Date())
                ? 'border-cyan-500 bg-cyan-50/30 dark:bg-cyan-900/10'
                : '',
            ]"
          >
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-[10px] uppercase text-slate-500">
                  {{ nombresDia[d.getDay()] }}
                </div>
                <div
                  :class="[
                    'text-lg font-bold',
                    mismoDia(toISO(d), new Date())
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : '',
                  ]"
                >
                  {{ d.getDate() }}
                </div>
              </div>
              <button
                @click="abrirNuevo(toISO(d))"
                class="p-1 text-slate-400 hover:text-cyan-600"
              >
                <Plus class="w-3.5 h-3.5" />
              </button>
            </div>
            <div class="space-y-1">
              <div
                v-for="ev in eventosDelDia(d)"
                :key="ev.id"
                @click="abrirEdicion(ev)"
                :class="[
                  'text-xs p-1.5 rounded cursor-pointer truncate border-l-2',
                  ev.servicio === 'fijo'
                    ? 'bg-blue-100/50 dark:bg-blue-600/10 border-blue-500'
                    : 'bg-purple-100/50 dark:bg-purple-600/10 border-purple-500',
                ]"
                :title="`${ev.hora || ''} ${ev.contacto}`"
              >
                <span class="font-mono">{{ ev.hora || "--:--" }}</span>
                {{ ev.contacto }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ====== VISTA MES ====== -->
      <div
        v-else
        class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
      >
        <div class="grid grid-cols-7 gap-1 mb-2">
          <div
            v-for="n in ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']"
            :key="n"
            class="text-center text-xs font-semibold text-slate-500 py-1"
          >
            {{ n }}
          </div>
        </div>
        <div class="grid grid-cols-7 gap-1">
          <div
            v-for="d in diasMes"
            :key="toISO(d)"
            @click="abrirNuevo(toISO(d))"
            :class="[
              'border border-slate-200 dark:border-slate-700 rounded-lg p-2 min-h-[90px] cursor-pointer hover:border-cyan-500/50 transition-colors',
              mismoDia(toISO(d), new Date())
                ? 'bg-cyan-50/50 dark:bg-cyan-900/10 border-cyan-500'
                : '',
              d.getMonth() !== fechaReferencia.getMonth() ? 'opacity-40' : '',
            ]"
          >
            <div
              :class="[
                'text-sm font-semibold mb-1',
                mismoDia(toISO(d), new Date())
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : '',
              ]"
            >
              {{ d.getDate() }}
            </div>
            <div class="space-y-0.5">
              <div
                v-for="ev in eventosDelDia(d).slice(0, 3)"
                :key="ev.id"
                @click.stop="abrirEdicion(ev)"
                :class="[
                  'text-[10px] px-1 py-0.5 rounded truncate',
                  ev.servicio === 'fijo'
                    ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-800 dark:text-blue-200'
                    : 'bg-purple-100 dark:bg-purple-600/20 text-purple-800 dark:text-purple-200',
                ]"
              >
                {{ ev.hora || "" }} {{ ev.contacto }}
              </div>
              <div
                v-if="eventosDelDia(d).length > 3"
                class="text-[10px] text-slate-500"
              >
                +{{ eventosDelDia(d).length - 3 }} más
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ====== MODAL CREAR/EDITAR ====== -->
    <Transition name="modal-fade">
      <div
        v-if="showModal"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      >
        <div class="absolute inset-0" @click="showModal = false"></div>
        <div
          class="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        >
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-bold">
              {{ editando ? "Editar agendamiento" : "Nuevo agendamiento" }}
            </h3>
            <button
              @click="showModal = false"
              class="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
          <form @submit.prevent="guardarForm" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label
                  class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block"
                  >Fecha *</label
                >
                <input
                  v-model="form.fecha"
                  type="date"
                  required
                  class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label
                  class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block"
                  >Hora</label
                >
                <input
                  v-model="form.hora"
                  type="time"
                  class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label
                class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block"
                >Contacto *</label
              >
              <input
                v-model="form.contacto"
                type="text"
                required
                placeholder="Nombre del cliente"
                class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <label
                class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block"
                >Tipo de servicio *</label
              >
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="form.servicio = 'fijo'"
                  :class="[
                    'p-2.5 rounded-lg border-2 text-sm font-semibold',
                    form.servicio === 'fijo'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300'
                      : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400',
                  ]"
                >
                  📞 Fijo
                </button>
                <button
                  type="button"
                  @click="form.servicio = 'movil'"
                  :class="[
                    'p-2.5 rounded-lg border-2 text-sm font-semibold',
                    form.servicio === 'movil'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300'
                      : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400',
                  ]"
                >
                  📱 Móvil
                </button>
              </div>
            </div>
            <div>
              <label
                class="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block"
                >Notas</label
              >
              <textarea
                v-model="form.notas"
                rows="2"
                placeholder="Observaciones opcionales"
                class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:border-cyan-500 outline-none resize-none"
              ></textarea>
            </div>
            <div class="flex gap-3 pt-2">
              <button
                type="submit"
                class="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2.5 rounded-lg"
              >
                {{ editando ? "Actualizar" : "Guardar" }}
              </button>
              <button
                type="button"
                @click="showModal = false"
                class="px-4 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <ConfirmModal
      :is-open="showDelete"
      title="Eliminar agendamiento"
      message="¿Estás seguro de eliminar este agendamiento?"
      confirm-text="Sí, eliminar"
      :is-danger="true"
      @close="showDelete = false"
      @confirm="confirmarEliminar"
    />
    <!-- ====== TOASTS ====== -->
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
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.toast-enter-active { transition: all .3s cubic-bezier(.2,.9,.3,1.2); }
.toast-leave-active { transition: all .25s ease-in; }
.toast-enter-from { transform: translateX(120%); opacity: 0; }
.toast-leave-to   { transform: translateX(120%); opacity: 0; }
</style>
