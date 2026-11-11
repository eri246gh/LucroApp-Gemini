const DB_NAME = 'LucroAppDB';
const DB_VERSION = 1;

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('vehicles')) {
        const vehicleStore = db.createObjectStore('vehicles', { keyPath: 'id' });
        vehicleStore.createIndex('active', 'active', { unique: false });
      }

      if (!db.objectStoreNames.contains('dailyRecords')) {
        const recordStore = db.createObjectStore('dailyRecords', { keyPath: 'id' });
        recordStore.createIndex('vehicleId', 'vehicleId', { unique: false });
        recordStore.createIndex('date', 'date', { unique: false });
        recordStore.createIndex('vehicleDate', ['vehicleId', 'date'], { unique: false });
      }

      if (!db.objectStoreNames.contains('reserveTransactions')) {
        const reserveStore = db.createObjectStore('reserveTransactions', { keyPath: 'id' });
        reserveStore.createIndex('date', 'date', { unique: false });
        reserveStore.createIndex('type', 'type', { unique: false });
      }

      if (!db.objectStoreNames.contains('fuelPurchases')) {
        const fuelStore = db.createObjectStore('fuelPurchases', { keyPath: 'id' });
        fuelStore.createIndex('vehicleId', 'vehicleId', { unique: false });
        fuelStore.createIndex('date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
