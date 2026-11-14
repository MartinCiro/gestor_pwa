// ====== CONFIGURACIÓN UNIFICADA DE INDEXEDDB ======
const DB_NAME = 'TipificacionesDB';
const DB_VERSION = 2; // Versión 2 porque agregamos el store de agendamientos

// Función única para abrir la base de datos y manejar la actualización de esquema
const openDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  
  req.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    
    // 1. Crear store de Tipificaciones si no existe
    if (!db.objectStoreNames.contains('tipificaciones')) {
      db.createObjectStore('tipificaciones', { keyPath: 'id', autoIncrement: true });
    }
    
    // 2. Crear store de Agendamientos si no existe
    if (!db.objectStoreNames.contains('agendamientos')) {
      const storeAgenda = db.createObjectStore('agendamientos', { keyPath: 'id', autoIncrement: true });
      storeAgenda.createIndex('fecha', 'fecha', { unique: false });
    }
  };
  
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

// Función auxiliar para obtener cualquier store de forma segura
const getStore = async (storeName: 'tipificaciones' | 'agendamientos', mode: IDBTransactionMode = 'readonly') => {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
};

// ====== OPERACIONES PARA TIPIFICACIONES ======
export const db = {
  getAll: async () => {
    const store = await getStore('tipificaciones');
    return new Promise<any[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  add: async (item: any) => {
    const store = await getStore('tipificaciones', 'readwrite');
    return new Promise<number>((resolve, reject) => {
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  },
  put: async (item: any) => {
    const store = await getStore('tipificaciones', 'readwrite');
    return new Promise<void>((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  delete: async (id: number) => {
    const store = await getStore('tipificaciones', 'readwrite');
    return new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  clear: async () => {
    const store = await getStore('tipificaciones', 'readwrite');
    return new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  bulkAdd: async (items: any[]) => {
    const store = await getStore('tipificaciones', 'readwrite');
    return new Promise<void>((resolve, reject) => {
      if (items.length === 0) return resolve();
      let completed = 0;
      items.forEach(item => {
        const { id, ...data } = item; 
        const req = store.add(data);
        req.onsuccess = () => { if (++completed === items.length) resolve(); };
        req.onerror = () => reject(req.error);
      });
    });
  }
};

// ====== OPERACIONES PARA AGENDAMIENTOS ======
export interface Agendamiento {
  id?: number;
  fecha: string;        // ISO: "2026-11-14"
  hora?: string;        // "14:30"
  contacto: string;
  servicio: 'fijo' | 'movil';
  notas?: string;
}

export const agendaDB = {
  getAll: async (): Promise<Agendamiento[]> => {
    const store = await getStore('agendamientos');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  add: async (item: Agendamiento): Promise<number> => {
    const store = await getStore('agendamientos', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  },
  put: async (item: Agendamiento): Promise<void> => {
    const store = await getStore('agendamientos', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  delete: async (id: number): Promise<void> => {
    const store = await getStore('agendamientos', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
};