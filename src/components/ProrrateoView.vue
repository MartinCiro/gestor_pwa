<script setup lang="ts">
import { ref, computed } from 'vue';
import { Calculator, Calendar, FileText, CreditCard, AlertCircle, Receipt, Info } from 'lucide-vue-next';

// ====== ESTADO DEL FORMULARIO ======
const planActual = ref<number | ''>('');
const esCambioPlan = ref(false);
const nuevoPlan = ref<number | ''>('');
const esRentaVencida = ref(true);
const cicloAnterior = ref<number | ''>('');
const cicloNuevo = ref<number | ''>('');
const fechaActualDia = ref(new Date().getDate());

// ====== CÁLCULOS BASE ======
const vDay = computed(() => {
  const plan = Number(planActual.value) || 0;
  return plan / 30;
});

const resCiclo = computed(() => {
  const ant = Number(cicloAnterior.value) || 0;
  const nue = Number(cicloNuevo.value) || 0;
  if (ant === 0 || nue === 0) return 0;
  return Math.abs(ant - nue);
});

const montoProrrateo = computed(() => vDay.value * resCiclo.value);

const diasNoUsados = computed(() => {
  const hoy = Number(fechaActualDia.value) || 0;
  const corteAnt = Number(cicloAnterior.value) || 0;
  if (hoy === 0 || corteAnt === 0) return 0;
  
  if (corteAnt > hoy) {
    return corteAnt - hoy;
  } else {
    return (30 - hoy) + corteAnt;
  }
});

const credito = computed(() => vDay.value * diasNoUsados.value);

// ====== REGLA DE APLICACIÓN COMPLETA ======
const resultado = computed(() => {
  const ant = Number(cicloAnterior.value) || 0;
  const nue = Number(cicloNuevo.value) || 0;
  const hoy = Number(fechaActualDia.value) || 0;
  const plan = Number(planActual.value) || 0;
  const monto = montoProrrateo.value;

  if (ant === 0 || nue === 0 || !planActual.value) {
    return { 
      tipo: 'pendiente', 
      titulo: 'Esperando datos', 
      mensaje: 'Complete los campos para ver el resultado.', 
      icono: AlertCircle,
      facturas: [],
      esDiaCorte: false
    };
  }

  const fechaMayorCorteAnterior = hoy > ant;
  const esDiaCorteExacto = hoy === ant;

  // ====== CASO 1: fecha actual > corte anterior ======
  if (fechaMayorCorteAnterior) {
    if (esRentaVencida.value) {
      return {
        tipo: 'doble-factura-vencida',
        titulo: 'Doble Facturación (Renta Vencida)',
        mensaje: `Se generan dos facturas en el mismo mes: la factura normal del ciclo anterior por el plan completo, y una nueva factura el día de corte nuevo por el prorrateo.`,
        icono: Receipt,
        facturas: [
          { fecha: ant, descripcion: `Ciclo anterior (corte día ${ant})`, valor: plan },
          { fecha: nue, descripcion: `Periodo parcial prorrateo (días ${resCiclo.value})`, valor: monto }
        ],
        esDiaCorte: false
      };
    } else {
      const valorSegundaFactura = plan - credito.value;
      return {
        tipo: 'doble-factura-anticipada',
        titulo: 'Doble Facturación con Crédito (Renta Anticipada)',
        mensaje: `Se generan dos facturas. La primera (ciclo anterior) ya fue pagada. La segunda aplica un crédito por los días no usados (${diasNoUsados.value} días).`,
        icono: Receipt,
        facturas: [
          { fecha: ant + 1 > 30 ? 1 : ant + 1, descripcion: `Ciclo anterior (ya pagada)`, valor: plan, pagada: true },
          { fecha: nue, descripcion: `Primer ciclo nuevo (plan − crédito)`, valor: Math.max(0, valorSegundaFactura) }
        ],
        esDiaCorte: false
      };
    }
  }

  // ====== CASO 2: fecha actual ≤ corte anterior ======
  // Incluye el caso especial: fecha === corte anterior (hoy es el día del corte)
  
  if (esRentaVencida.value) {
    if (esDiaCorteExacto) {
      return {
        tipo: 'factura-hoy',
        titulo: 'Factura del Ciclo Anterior (Hoy)',
        mensaje: `Hoy es el día del corte anterior. Se genera la factura normal del ciclo anterior por $${formatoMoneda(plan)}. No se genera factura extra. El prorrateo de $${formatoMoneda(monto)} se incluirá en la primera factura del nuevo ciclo (día ${nue}).`,
        icono: FileText,
        facturas: [
          { fecha: hoy, descripcion: `Factura ciclo anterior (hoy)`, valor: plan },
          { fecha: nue, descripcion: `Primer ciclo nuevo (prorrateo incluido)`, valor: plan }
        ],
        esDiaCorte: true
      };
    } else {
      return {
        tipo: 'sin-accion',
        titulo: 'Sin Acción Extra',
        mensaje: 'No se genera factura extra. La primera factura del nuevo ciclo ya incluye el prorrateo.',
        icono: AlertCircle,
        facturas: [],
        esDiaCorte: false
      };
    }
  } else {
    // Renta anticipada
    if (esDiaCorteExacto) {
      return {
        tipo: 'credito-dia-corte',
        titulo: 'Crédito por Cambio de Ciclo',
        mensaje: `Hoy es el día del corte anterior. El ciclo anterior ya fue pagado por $${formatoMoneda(plan)}. Se genera un crédito por $${formatoMoneda(monto)} que se descuenta de la siguiente factura (día ${nue}).`,
        icono: CreditCard,
        facturas: [
          { fecha: hoy, descripcion: `Ciclo anterior (ya pagado)`, valor: plan, pagada: true },
          { fecha: nue, descripcion: `Primer ciclo nuevo (con crédito)`, valor: Math.max(0, plan - monto) }
        ],
        esDiaCorte: true
      };
    } else {
      return {
        tipo: 'credito-simple',
        titulo: 'Crédito a Aplicar',
        mensaje: `Se genera un crédito por ${formatoMoneda(monto)} que se descuenta de la siguiente factura.`,
        icono: CreditCard,
        facturas: [],
        esDiaCorte: false
      };
    }
  }
});

// ====== UTILIDADES ======
const formatoMoneda = (valor: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);
};

const colorResultado = computed(() => {
  switch (resultado.value.tipo) {
    case 'doble-factura-vencida':
    case 'doble-factura-anticipada':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/10',
        border: 'border-amber-200 dark:border-amber-800',
        title: 'text-amber-800 dark:text-amber-300',
        icon: 'text-amber-600 dark:text-amber-400'
      };
    case 'factura-hoy':
    case 'credito-dia-corte':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/10',
        border: 'border-blue-200 dark:border-blue-800',
        title: 'text-blue-800 dark:text-blue-300',
        icon: 'text-blue-600 dark:text-blue-400'
      };
    case 'credito-simple':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/10',
        border: 'border-emerald-200 dark:border-emerald-800',
        title: 'text-emerald-800 dark:text-emerald-300',
        icon: 'text-emerald-600 dark:text-emerald-400'
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-800/50',
        border: 'border-slate-200 dark:border-slate-700',
        title: 'text-slate-700 dark:text-slate-300',
        icon: 'text-slate-500'
      };
  }
});

const resetForm = () => {
  planActual.value = '';
  esCambioPlan.value = false;
  nuevoPlan.value = '';
  esRentaVencida.value = true;
  cicloAnterior.value = '';
  cicloNuevo.value = '';
  fechaActualDia.value = new Date().getDate();
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-300">
    
    <!-- NAVBAR -->
    <nav class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 sticky top-0 z-40 transition-colors">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-xl font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
          <Calculator class="w-6 h-6" /> Calculadora de Prorrateo
        </h1>
        <button @click="resetForm" class="text-sm text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
          Limpiar formulario
        </button>
      </div>
    </nav>

    <main class="container mx-auto p-4 sm:p-6 max-w-5xl">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- COLUMNA IZQUIERDA: FORMULARIO -->
        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm space-y-6">
          <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Calendar class="w-5 h-5 text-cyan-600" /> Datos del Ciclo
          </h2>

          <!-- Plan Actual -->
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plan Actual (Valor mensual)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input v-model.number="planActual" type="number" min="0" placeholder="Ej: 50000" 
                class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-8 pr-3 py-2.5 text-slate-900 dark:text-white focus:border-cyan-500 outline-none transition-colors" />
            </div>
          </div>

          <!-- Check Cambio de Plan -->
          <div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <input v-model="esCambioPlan" type="checkbox" id="cambioPlan" class="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500" />
            <label for="cambioPlan" class="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              ¿Hay cambio de plan?
            </label>
          </div>

          <!-- Nuevo Plan (Condicional) -->
          <div v-if="esCambioPlan" class="animate-fade-in">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nuevo Plan (Valor mensual)</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input v-model.number="nuevoPlan" type="number" min="0" placeholder="Ej: 70000" 
                class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-8 pr-3 py-2.5 text-slate-900 dark:text-white focus:border-cyan-500 outline-none transition-colors" />
            </div>
            <p class="text-xs text-slate-500 mt-1">* El cálculo de prorrateo se basa en el valor del plan actual.</p>
          </div>

          <!-- Tipo de Renta -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de Renta</label>
            <div class="grid grid-cols-2 gap-3">
              <button @click="esRentaVencida = true" 
                :class="['p-3 rounded-lg border-2 text-sm font-semibold transition-all', esRentaVencida ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300']">
                Renta Vencida
              </button>
              <button @click="esRentaVencida = false" 
                :class="['p-3 rounded-lg border-2 text-sm font-semibold transition-all', !esRentaVencida ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300']">
                Renta Anticipada
              </button>
            </div>
          </div>

          <!-- Días del Ciclo -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Día corte anterior</label>
              <input v-model.number="cicloAnterior" type="number" min="1" max="31" placeholder="Ej: 23" 
                class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-cyan-500 outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Día corte nuevo</label>
              <input v-model.number="cicloNuevo" type="number" min="1" max="31" placeholder="Ej: 18" 
                class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-cyan-500 outline-none transition-colors" />
            </div>
          </div>

          <!-- Fecha de cálculo -->
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Fecha actual (Día del mes)
              <span class="text-xs font-normal text-slate-500 ml-1">(Hoy es {{ new Date().getDate() }})</span>
            </label>
            <input v-model.number="fechaActualDia" type="number" min="1" max="31" 
              class="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2.5 text-slate-900 dark:text-white focus:border-cyan-500 outline-none transition-colors" />
          </div>
        </div>

        <!-- COLUMNA DERECHA: RESULTADOS -->
        <div class="space-y-6">
          <!-- Tarjeta de Desglose -->
          <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Desglose del Cálculo</h2>
            <div class="space-y-3">
              <div class="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">Valor día (Plan / 30)</span>
                <span class="font-mono font-semibold">{{ formatoMoneda(vDay) }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                <span class="text-slate-600 dark:text-slate-400">Días de diferencia (|Ant − Nuevo|)</span>
                <span class="font-mono font-semibold">{{ resCiclo }} días</span>
              </div>
              <div class="flex justify-between items-center py-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg px-3">
                <span class="text-cyan-800 dark:text-cyan-200 font-semibold">Monto Prorrateo</span>
                <span class="font-mono font-bold text-cyan-700 dark:text-cyan-300 text-xl">{{ formatoMoneda(montoProrrateo) }}</span>
              </div>
              
              <!-- Solo mostrar días no usados y crédito si aplica renta anticipada y fecha > corte anterior -->
              <template v-if="!esRentaVencida && fechaActualDia > cicloAnterior">
                <div class="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700">
                  <span class="text-slate-600 dark:text-slate-400">Días no usados</span>
                  <span class="font-mono font-semibold">{{ diasNoUsados }} días</span>
                </div>
                <div class="flex justify-between items-center py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3">
                  <span class="text-emerald-800 dark:text-emerald-200 font-semibold">Crédito</span>
                  <span class="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-xl">{{ formatoMoneda(credito) }}</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Indicador especial: Hoy es el día del corte -->
          <div v-if="resultado.esDiaCorte" class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
            <Info class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p class="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Hoy es el día del corte anterior</p>
              <p class="text-xs text-blue-700 dark:text-blue-400">Esto significa que el ciclo anterior está terminando exactamente hoy. Las reglas de facturación aplican de forma especial.</p>
            </div>
          </div>

          <!-- Tarjeta de Regla de Aplicación -->
          <div :class="['border rounded-xl p-6 shadow-sm transition-colors', colorResultado.bg, colorResultado.border]">
            <div class="flex items-start gap-3">
              <component :is="resultado.icono" :class="['w-6 h-6 mt-0.5 shrink-0', colorResultado.icon]" />
              <div class="flex-1">
                <h3 :class="['text-lg font-bold mb-2', colorResultado.title]">
                  {{ resultado.titulo }}
                </h3>
                <p class="text-slate-700 dark:text-slate-300 leading-relaxed text-sm mb-4">
                  {{ resultado.mensaje }}
                </p>

                <!-- Tabla de Facturas -->
                <div v-if="resultado.facturas.length > 0" class="mt-4 bg-white/60 dark:bg-slate-900/40 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <table class="w-full text-sm">
                    <thead class="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <tr>
                        <th class="px-3 py-2 text-left font-semibold">Día</th>
                        <th class="px-3 py-2 text-left font-semibold">Concepto</th>
                        <th class="px-3 py-2 text-right font-semibold">Valor</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                      <tr v-for="(f, i) in resultado.facturas" :key="i" class="text-slate-700 dark:text-slate-300">
                        <td class="px-3 py-2 font-mono font-semibold">{{ f.fecha }}</td>
                        <td class="px-3 py-2">
                          {{ f.descripcion }}
                          <span v-if="f.pagada" class="ml-1 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">PAGADA</span>
                        </td>
                        <td class="px-3 py-2 text-right font-mono font-bold">{{ formatoMoneda(f.valor) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>