import { openDatabase } from '../database/database.js';
import { VehicleRepository } from '../database/repositories.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';
import { Validation } from '../utils/validation.js';

export const FuelModule = {
  async getAllPurchases() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fuelPurchases', 'readonly');
      const req = tx.objectStore('fuelPurchases').getAll();
      req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.date) - new Date(a.date)));
      req.onerror = () => reject(req.error);
    });
  },

  async savePurchase(purchase) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fuelPurchases', 'readwrite');
      if (!purchase.id) purchase.id = crypto.randomUUID();
      const req = tx.objectStore('fuelPurchases').put(purchase);
      req.onsuccess = () => resolve(purchase);
      req.onerror = () => reject(req.error);
    });
  },

  async render(container) {
    const purchases = await this.getAllPurchases();
    const vehicles = await VehicleRepository.getAll();

    container.innerHTML = `
      <section class="stack-md" aria-labelledby="fuel-heading">
        <div class="page-header">
          <div class="stack-xs">
            <span class="eyebrow">Controle de Caixa</span>
            <h1 id="fuel-heading" class="page-title">Abastecimentos</h1>
          </div>
          <button type="button" id="btn-add-fuel" class="btn btn-primary">+ Registrar Abastecimento</button>
        </div>

        <div class="notice">
          Os abastecimentos registram desembolsos reais na bomba e não são descontados em duplicidade no cálculo diário, que utiliza o consumo médio por quilômetro rodado.
        </div>

        <div id="fuel-form-area" class="hidden"></div>

        <div class="surface table-wrap">
          ${purchases.length === 0 ? '<p class="text-muted">Nenhum abastecimento registrado.</p>' : `
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th class="num text-right">Volume</th>
                  <th class="num text-right">Preço/L</th>
                  <th class="num text-right">Hodômetro</th>
                  <th class="num text-right">Total Pago</th>
                </tr>
              </thead>
              <tbody>
                ${purchases.map(p => `
                  <tr>
                    <td class="tabular">${Dates.formatBR(p.date)}</td>
                    <td class="num text-right">${p.liters.toFixed(2)} L</td>
                    <td class="num text-right">${Money.format(Money.toCents(p.pricePerLiter))}</td>
                    <td class="num text-right">${p.odometer ? `${p.odometer} km` : '—'}</td>
                    <td class="num text-right text-strong">${Money.format(p.totalCents)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </section>
    `;

    const formArea = container.querySelector('#fuel-form-area');

    container.querySelector('#btn-add-fuel')?.addEventListener('click', () => {
      if (!vehicles.length) {
        alert('Cadastre um veículo antes de registrar abastecimentos.');
        return;
      }
      this.renderForm(formArea, vehicles, container);
    });
  },

  renderForm(formArea, vehicles, rootContainer) {
    formArea.classList.remove('hidden');
    formArea.innerHTML = `
      <form id="fuel-form" class="surface stack-md" novalidate>
        <h2 class="section-title">Novo Abastecimento</h2>
        <div id="fuel-err" class="notice notice-strong hidden" role="alert"></div>
        <div class="form-grid">
          <div class="form-group">
            <label for="f-vehicle">Veículo</label>
            <select id="f-vehicle">
              ${vehicles.map(v => `<option value="${v.id}">${v.brand} ${v.model}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="f-date">Data</label>
            <input type="date" id="f-date" value="${Dates.getTodayISO()}" required>
          </div>
          <div class="form-group">
            <label for="f-liters">Litros</label>
            <input type="number" step="0.01" id="f-liters" required placeholder="Ex: 35.50">
          </div>
          <div class="form-group">
            <label for="f-price">Preço por Litro (R$)</label>
            <input type="number" step="0.01" id="f-price" required placeholder="Ex: 5.89">
          </div>
          <div class="form-group">
            <label for="f-odometer">Hodômetro (Opcional)</label>
            <input type="number" id="f-odometer" placeholder="Ex: 45200">
          </div>
        </div>
        <div class="row-wrap">
          <button type="submit" class="btn btn-primary">Salvar Abastecimento</button>
          <button type="button" id="btn-cancel-f" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    `;

    formArea.querySelector('#btn-cancel-f').addEventListener('click', () => formArea.classList.add('hidden'));

    formArea.querySelector('#fuel-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = formArea.querySelector('#fuel-err');
      const liters = parseFloat(document.getElementById('f-liters').value);
      const pricePerLiter = parseFloat(document.getElementById('f-price').value);
      const payload = {
        vehicleId: document.getElementById('f-vehicle').value,
        date: document.getElementById('f-date').value,
        liters,
        pricePerLiterReal: pricePerLiter
      };

      const val = Validation.validateFuelPurchase(payload);
      if (!val.isValid) {
        errBox.textContent = val.errors.join(' ');
        errBox.classList.remove('hidden');
        return;
      }

      await this.savePurchase({
        vehicleId: payload.vehicleId,
        date: payload.date,
        liters,
        pricePerLiter,
        totalCents: Money.toCents(liters * pricePerLiter),
        odometer: document.getElementById('f-odometer').value ? parseInt(document.getElementById('f-odometer').value) : null
      });

      this.render(rootContainer);
    });
  }
};
