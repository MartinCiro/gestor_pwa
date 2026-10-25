const DB_NAME = 'TipificacionesDB';
const STORE_NAME = 'tipificaciones';

const openDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const getStore = async (mode: IDBTransactionMode = 'readonly') => {
  const db = await openDB();
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
};

export const db = {
  getAll: async () => {
    const store = await getStore();
    return new Promise<any[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  add: async (item: any) => {
    const store = await getStore('readwrite');
    return new Promise<number>((resolve, reject) => {
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  },
  put: async (item: any) => {
    const store = await getStore('readwrite');
    return new Promise<void>((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  delete: async (id: number) => {
    const store = await getStore('readwrite');
    return new Promise<void>((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  clear: async () => {
    const store = await getStore('readwrite');
    return new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
  bulkAdd: async (items: any[]) => {
    const store = await getStore('readwrite');
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