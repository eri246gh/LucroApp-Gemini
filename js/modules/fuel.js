import { openDatabase } from '../database/database.js';
import { VehicleRepository } from '../database/repositories.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';

export const FuelModule = {
  async getAllPurchases() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fuelPurchases', 'readonly');
      const store = tx.objectStore('fuelPurchases');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.date) - new Date(a.date)));
      req.onerror = () => reject(req.error);
    });
  },

  async savePurchase(purchase) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fuelPurchases', 'readwrite');
      const store = tx.objectStore('fuelPurchases');
      if (!purchase.id) purchase.id = crypto.randomUUID();
      const req = store.put(purchase);
      req.onsuccess = () => resolve(purchase);
      req.onerror = () => reject(req.error);
    });
  },

  async render(container) {
    const purchases = await this.getAllPurchases();
    const vehicles = await VehicleRepository.getAll();

    container.innerHTML = `
      <section class="fuel-section">
        <div class="section-header">
          <h2>Registro de Abastecimentos</h2>
          <button id="btn-add-fuel" class="btn btn-primary">⛽ Novo Abastecimento</button>
        </div>

        <p class="section-note">
          ℹ️ Os abastecimentos servem para controle de caixa e não abatem diretamente do lucro diário, que utiliza o consumo estimado por km rodado.
        </p>

        <div id="fuel-form-area" class="hidden"></div>

        <div class="fuel-list">
          ${purchases.length === 0 ? '<p class="empty-text">Nenhum abastecimento registrado.</p>' : ''}
          ${purchases.map(p => `
            <div class="card fuel-card">
              <div class="fuel-info">
                <strong>${Dates.formatBR(p.date)}</strong> — ${p.liters.toFixed(2)} Litros
                <br><small>R$ ${p.pricePerLiter.toFixed(2)}/L ${p.odometer ? `| Hodômetro: ${p.odometer} km` : ''}</small>
              </div>
              <div class="fuel-total text-green">
                ${Money.format(p.totalCents)}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;

    this.bindEvents(container, vehicles);
  },

  bindEvents(container, vehicles) {
    const formArea = container.querySelector('#fuel-form-area');

    container.querySelector('#btn-add-fuel')?.addEventListener('click', () => {
      if (!vehicles.length) {
        alert('Cadastre um veículo antes de registrar abastecimentos.');
        return;
      }
      this.renderForm(formArea, vehicles);
    });
  },

  renderForm(container, vehicles) {
    container.classList.remove('hidden');
    container.innerHTML = `
      <form id="fuel-form" class="card form-card">
        <h3>Novo Abastecimento</h3>
        <div class="form-group">
          <label>Veículo</label>
          <select id="f-vehicle">
            ${vehicles.map(v => `<option value="${v.id}">${v.brand} ${v.model}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Data</label>
          <input type="date" id="f-date" value="${Dates.getTodayISO()}" required>
        </div>
        <div class="form-group">
          <label>Litros Abastecidos</label>
          <input type="number" step="0.01" id="f-liters" required placeholder="Ex: 35.5">
        </div>
        <div class="form-group">
          <label>Preço por Litro (R$)</label>
          <input type="number" step="0.01" id="f-price" required placeholder="Ex: 5.89">
        </div>
        <div class="form-group">
          <label>Hodômetro Atual (Opcional)</label>
          <input type="number" id="f-odometer" placeholder="Ex: 45200">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Salvar Abastecimento</button>
          <button type="button" id="btn-cancel-f" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    `;

    container.querySelector('#btn-cancel-f').addEventListener('click', () => {
      container.classList.add('hidden');
    });

    container.querySelector('#fuel-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const liters = parseFloat(document.getElementById('f-liters').value);
      const pricePerLiter = parseFloat(document.getElementById('f-price').value);
      const totalCents = Money.toCents(liters * pricePerLiter);

      await this.savePurchase({
        vehicleId: document.getElementById('f-vehicle').value,
        date: document.getElementById('f-date').value,
        liters,
        pricePerLiter,
        totalCents,
        odometer: document.getElementById('f-odometer').value ? parseInt(document.getElementById('f-odometer').value) : null
      });

      window.location.reload();
    });
  }
};
