import { ref, computed } from 'vue';
import { agendaDB, type Agendamiento } from '../utils/db';
import { useToast } from './useToast';

export type VistaAgenda = 'dia' | 'semana' | 'mes';

const agendamientos = ref<Agendamiento[]>([]);
const vistaActual = ref<VistaAgenda>('mes');
const fechaReferencia = ref(new Date());
const cargando = ref(true);

const { push } = useToast();

// ====== Utilidades de fecha ======
const toISO = (d: Date) => d.toISOString().split('T')[0];
const hoy = () => toISO(new Date());

const parseFecha = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const mismoDia = (a: string, b: Date) => a === toISO(b);

const sumarDias = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const inicioSemana = (d: Date) => {
  const r = new Date(d);
  const dia = r.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  r.setDate(r.getDate() + diff);
  return r;
};

const nombresMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const nombresDia = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export const useAgenda = () => {
  const cargar = async () => {
    cargando.value = true;
    try {
      const data = await agendaDB.getAll();
      // ✅ AUTO-ORDENAMIENTO por fecha y hora
      agendamientos.value = data.sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
        return (a.hora || '').localeCompare(b.hora || '');
      });
    } catch {
      push('Error al cargar agenda', 'error');
    } finally {
      cargando.value = false;
    }
  };

  const guardar = async (item: Agendamiento) => {
    try {
      if (item.id) await agendaDB.put(item);
      else await agendaDB.add(item);
      await cargar();
      push(item.id ? 'Agendamiento actualizado' : 'Agendamiento creado', 'success');
    } catch {
      push('Error al guardar', 'error');
    }
  };

  const eliminar = async (id: number) => {
    try {
      await agendaDB.delete(id);
      await cargar();
      push('Agendamiento eliminado', 'info');
    } catch {
      push('Error al eliminar', 'error');
    }
  };

  const eventosDelDia = (d: Date) =>
    agendamientos.value.filter(e => mismoDia(e.fecha, d));

  const diasMes = computed(() => {
    const año = fechaReferencia.value.getFullYear();
    const mes = fechaReferencia.value.getMonth();
    const primerDia = new Date(año, mes, 1);
    const offsetInicio = (primerDia.getDay() + 6) % 7;
    const inicio = sumarDias(primerDia, -offsetInicio);
    const dias: Date[] = [];
    for (let i = 0; i < 42; i++) dias.push(sumarDias(inicio, i));
    return dias;
  });

  const diasSemana = computed(() => {
    const lunes = inicioSemana(fechaReferencia.value);
    return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  });

  const tituloVista = computed(() => {
    const f = fechaReferencia.value;
    if (vistaActual.value === 'dia') {
      return `${nombresDia[f.getDay()]}, ${f.getDate()} de ${nombresMes[f.getMonth()]} ${f.getFullYear()}`;
    }
    if (vistaActual.value === 'semana') {
      const lunes = inicioSemana(f);
      const domingo = sumarDias(lunes, 6);
      return `${lunes.getDate()} ${nombresMes[lunes.getMonth()].slice(0,3)} - ${domingo.getDate()} ${nombresMes[domingo.getMonth()].slice(0,3)} ${domingo.getFullYear()}`;
    }
    return `${nombresMes[f.getMonth()]} ${f.getFullYear()}`;
  });

  const navegar = (dir: -1 | 1) => {
    const f = new Date(fechaReferencia.value);
    if (vistaActual.value === 'dia') f.setDate(f.getDate() + dir);
    else if (vistaActual.value === 'semana') f.setDate(f.getDate() + dir * 7);
    else f.setMonth(f.getMonth() + dir);
    fechaReferencia.value = f;
  };

  const irAHoy = () => { fechaReferencia.value = new Date(); };

  return {
    agendamientos, vistaActual, fechaReferencia, cargando,
    cargar, guardar, eliminar,
    eventosDelDia, diasMes, diasSemana, tituloVista,
    navegar, irAHoy, hoy, toISO, parseFecha,
    nombresMes, nombresDia, mismoDia
  };
};