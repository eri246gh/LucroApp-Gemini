import { openDatabase } from '../database/database.js';

export const BackupModule = {
  async exportData() {
    const db = await openDatabase();
    const backupData = {
      app: 'LucroApp',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      stores: {}
    };

    const storeNames = ['vehicles', 'dailyRecords', 'reserveTransactions', 'fuelPurchases', 'settings'];

    for (const storeName of storeNames) {
      backupData.stores[storeName] = await new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
      });
    }

    const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lucroapp_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async restoreData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.app !== 'LucroApp' || !data.stores) {
            throw new Error('Arquivo de backup inválido ou incompatível.');
          }

          if (!confirm('ATENÇÃO: A restauração irá substituir todos os dados atuais. Deseja continuar?')) {
            resolve(false);
            return;
          }

          const db = await openDatabase();
          for (const [storeName, records] of Object.entries(data.stores)) {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.clear();
            for (const item of records) {
              store.put(item);
            }
          }

          alert('Restauração concluída com sucesso!');
          window.location.reload();
          resolve(true);
        } catch (err) {
          alert(`Erro na restauração: ${err.message}`);
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }
};
