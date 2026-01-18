
import { InventoryItem } from "../types";

const DB_NAME = 'OmniVaultDB';
const STORE_NAME = 'inventory';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveInventory = async (items: InventoryItem[]) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  // Clear existing to sync fresh state
  await new Promise<void>((resolve) => {
    const clearReq = store.clear();
    clearReq.onsuccess = () => resolve();
  });

  for (const item of items) {
    store.put(item);
  }
  
  return new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
  });
};

export const loadInventory = async (): Promise<InventoryItem[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    console.error("Failed to load IndexedDB", e);
    return [];
  }
};
