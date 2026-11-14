// src/composables/useCSV.ts
import { ref } from 'vue';
import { parseCSV, toCSV, downloadFile } from '@utils/csv';
import { useToast } from './useToast';

export const useCSV = () => {
  const { push } = useToast();
  const isProcessing = ref(false);

  const exportData = <T extends Record<string, any>>(
    data: T[],
    columns: (keyof T)[],
    filename: string
  ) => {
    if (!data || data.length === 0) {
      push('No hay datos para exportar', 'error');
      return;
    }
    
    const csvContent = toCSV(data, columns as string[]);
    downloadFile(csvContent, filename);
    push(`${data.length} registros exportados`, 'success');
  };

  const importData = async (
    file: File,
    requiredField: string,
    onSuccess: (items: any[]) => Promise<void>
  ) => {
    isProcessing.value = true;
    try {
      const text = await file.text();
      const { rows, mapped } = parseCSV(text);

      if (rows.length === 0) throw new Error('El archivo CSV está vacío.');

      const items: any[] = [];
      let skipped = 0;

      for (const row of rows) {
        // Verificar si el campo obligatorio existe en esta fila
        const headerReal = mapped[requiredField];
        if (!headerReal || !row[headerReal]?.trim()) {
          skipped++;
          continue;
        }

        // Construir el objeto limpio usando solo las claves que parseCSV reconoció
        const item: any = {};
        for (const [claveInterna, headerRealCol] of Object.entries(mapped)) {
          item[claveInterna] = row[headerRealCol as string]?.trim() || '';
        }
        
        // Limpieza específica para Agenda: si servicio no es 'fijo', forzar 'movil'
        if (item.servicio && item.servicio.toLowerCase().trim() !== 'fijo') {
          item.servicio = 'movil';
        }

        items.push(item);
      }

      if (items.length === 0) {
        throw new Error(`No se encontraron registros válidos. Verifica que la columna "${requiredField}" exista en el CSV y tenga datos.`);
      }

      // Delegar la persistencia al módulo que llamó a esta función
      await onSuccess(items);
      push(`${items.length} registros importados. (${skipped} omitidos por estar vacíos)`, 'success');

    } catch (err) {
      console.error('Error en importData:', err);
      push(err instanceof Error ? err.message : 'Error al procesar el archivo CSV', 'error');
    } finally {
      isProcessing.value = false;
    }
  };

  return { isProcessing, exportData, importData };
};