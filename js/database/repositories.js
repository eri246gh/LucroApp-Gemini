import { openDatabase } from './database.js';

function generateUUID() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export const VehicleRepository = {
  async getAll() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vehicles', 'readonly');
      const store = tx.objectStore('vehicles');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async save(vehicle) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('vehicles', 'readwrite');
      const store = tx.objectStore('vehicles');
      if (!vehicle.id) vehicle.id = generateUUID();
      vehicle.updatedAt = new Date().toISOString();
      const req = store.put(vehicle);
      req.onsuccess = () => resolve(vehicle);
      req.onerror = () => reject(req.error);
    });
  }
};

export const RecordRepository = {
  async getByDateRange(startDate, endDate, vehicleId = null) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('dailyRecords', 'readonly');
      const store = tx.objectStore('dailyRecords');
      const req = store.getAll();
      req.onsuccess = () => {
        let results = req.result.filter(r => r.date >= startDate && r.date <= endDate);
        if (vehicleId) results = results.filter(r => r.vehicleId === vehicleId);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async save(record) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('dailyRecords', 'readwrite');
      const store = tx.objectStore('dailyRecords');
      if (!record.id) record.id = generateUUID();
      record.createdAt = record.createdAt || new Date().toISOString();
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(id) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('dailyRecords', 'readwrite');
      const store = tx.objectStore('dailyRecords');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }
};

export const ReserveRepository = {
  async getAllTransactions() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reserveTransactions', 'readonly');
      const store = tx.objectStore('reserveTransactions');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.date) - new Date(a.date)));
      req.onerror = () => reject(req.error);
    });
  },

  async addTransaction(txData) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('reserveTransactions', 'readwrite');
      const store = tx.objectStore('reserveTransactions');
      if (!txData.id) txData.id = generateUUID();
      txData.createdAt = new Date().toISOString();
      const req = store.put(txData);
      req.onsuccess = () => resolve(txData);
      req.onerror = () => reject(req.error);
    });
  },

  async getBalanceCents() {
    const transactions = await this.getAllTransactions();
    return transactions.reduce((acc, curr) => {
      if (curr.type === 'deposit') return acc + curr.amountCents;
      if (curr.type === 'withdrawal') return acc - curr.amountCents;
      if (curr.type === 'adjustment') return acc + curr.amountCents;
      return acc;
    }, 0);
  }
};
