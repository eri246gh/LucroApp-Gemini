import { VehicleRepository } from '../database/repositories.js';
import { Validation } from '../utils/validation.js';
import { Money } from '../utils/money.js';

export const VehiclesModule = {
  async render(container) {
    const vehicles = await VehicleRepository.getAll();

    container.innerHTML = `
      <section class="stack-md" aria-labelledby="veh-heading">
        <div class="page-header">
          <div class="stack-xs">
            <span class="eyebrow">Parâmetros de Custo</span>
            <h1 id="veh-heading" class="page-title">Veículos Cadastrados</h1>
          </div>
          <button type="button" id="btn-add-vehicle" class="btn btn-primary">+ Novo Veículo</button>
        </div>

        <div id="vehicle-form-area" class="hidden"></div>

        <div class="grid-12">
          ${vehicles.length === 0 ? '<div class="col-12 surface"><p class="text-muted">Nenhum veículo cadastrado.</p></div>' : ''}
          ${vehicles.map(v => `
            <article class="surface col-6 stack-sm">
              <div class="row-between">
                <h2 class="section-title">${v.brand} ${v.model} (${v.year})</h2>
                ${v.active ? '<span class="pill pill-solid">Ativo</span>' : '<span class="pill pill-outline">Inativo</span>'}
              </div>

              <div class="ledger-list mt-2">
                <div class="ledger-row">
                  <span class="text-muted">Combustível</span>
                  <span>${v.fuelType} • ${v.kmPerLiter} km/l</span>
                </div>
                <div class="ledger-row">
                  <span class="text-muted">Preço por Litro</span>
                  <span class="tabular">${Money.format(Money.toCents(v.fuelPrice))}</span>
                </div>
                <div class="ledger-row">
                  <span class="text-muted">Manutenção por km</span>
                  <span class="tabular">R$ ${Number(v.maintCostPerKm).toFixed(2)}/km</span>
                </div>
                <div class="ledger-row">
                  <span class="text-muted">Depreciação por km</span>
                  <span class="tabular">R$ ${Number(v.deprCostPerKm).toFixed(2)}/km</span>
                </div>
              </div>

              <div class="row-wrap mt-3">
                ${!v.active ? `<button type="button" class="btn btn-primary btn-sm" data-activate="${v.id}">Definir como Ativo</button>` : ''}
                <button type="button" class="btn btn-secondary btn-sm" data-edit="${v.id}">Editar Parâmetros</button>
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;

    const formArea = container.querySelector('#vehicle-form-area');

    container.querySelector('#btn-add-vehicle')?.addEventListener('click', () => {
      this.renderForm(formArea, null, container);
    });

    container.querySelectorAll('[data-activate]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-activate');
        for (const v of vehicles) {
          v.active = v.id === id;
          await VehicleRepository.save(v);
        }
        window.location.reload();
      });
    });

    container.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const vehicle = vehicles.find(v => v.id === btn.getAttribute('data-edit'));
        this.renderForm(formArea, vehicle, container);
      });
    });
  },

  renderForm(formArea, vehicle, rootContainer) {
    const isEdit = !!vehicle;
    formArea.classList.remove('hidden');
    formArea.innerHTML = `
      <form id="vehicle-form" class="surface stack-md" novalidate>
        <h2 class="section-title">${isEdit ? 'Editar Parâmetros do Veículo' : 'Cadastrar Novo Veículo'}</h2>
        <div id="veh-error" class="notice notice-strong hidden" role="alert"></div>
        <div class="form-grid">
          <div class="form-group">
            <label for="v-brand">Marca</label>
            <input type="text" id="v-brand" value="${vehicle?.brand || ''}" required placeholder="Ex: Chevrolet">
          </div>
          <div class="form-group">
            <label for="v-model">Modelo</label>
            <input type="text" id="v-model" value="${vehicle?.model || ''}" required placeholder="Ex: Onix 1.0">
          </div>
          <div class="form-group">
            <label for="v-year">Ano</label>
            <input type="number" id="v-year" value="${vehicle?.year || new Date().getFullYear()}" required>
          </div>
          <div class="form-group">
            <label for="v-fuel">Combustível</label>
            <select id="v-fuel">
              <option value="Gasolina" ${vehicle?.fuelType === 'Gasolina' ? 'selected' : ''}>Gasolina</option>
              <option value="Etanol" ${vehicle?.fuelType === 'Etanol' ? 'selected' : ''}>Etanol</option>
              <option value="GNV" ${vehicle?.fuelType === 'GNV' ? 'selected' : ''}>GNV</option>
              <option value="Diesel" ${vehicle?.fuelType === 'Diesel' ? 'selected' : ''}>Diesel</option>
            </select>
          </div>
          <div class="form-group">
            <label for="v-kml">Consumo Médio (km/l)</label>
            <input type="number" step="0.1" id="v-kml" value="${vehicle?.kmPerLiter || ''}" required placeholder="Ex: 12.0">
          </div>
          <div class="form-group">
            <label for="v-fuelprice">Preço Combustível (R$/L)</label>
            <input type="number" step="0.01" id="v-fuelprice" value="${vehicle?.fuelPrice || ''}" required placeholder="Ex: 5.89">
          </div>
          <div class="form-group">
            <label for="v-maintkm">Manutenção Estimada (R$/km)</label>
            <input type="number" step="0.01" id="v-maintkm" value="${vehicle?.maintCostPerKm ?? '0.20'}" required>
          </div>
          <div class="form-group">
            <label for="v-deprkm">Depreciação Estimada (R$/km)</label>
            <input type="number" step="0.01" id="v-deprkm" value="${vehicle?.deprCostPerKm ?? '0.08'}" required>
          </div>
        </div>
        <div class="row-wrap">
          <button type="submit" class="btn btn-primary">Salvar Veículo</button>
          <button type="button" id="btn-cancel-v" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    `;

    formArea.querySelector('#btn-cancel-v').addEventListener('click', () => formArea.classList.add('hidden'));

    formArea.querySelector('#vehicle-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = formArea.querySelector('#veh-error');
      const payload = {
        id: vehicle?.id,
        brand: document.getElementById('v-brand').value,
        model: document.getElementById('v-model').value,
        year: parseInt(document.getElementById('v-year').value),
        fuelType: document.getElementById('v-fuel').value,
        kmPerLiter: parseFloat(document.getElementById('v-kml').value),
        fuelPrice: parseFloat(document.getElementById('v-fuelprice').value),
        maintCostPerKm: parseFloat(document.getElementById('v-maintkm').value),
        deprCostPerKm: parseFloat(document.getElementById('v-deprkm').value),
        active: vehicle ? vehicle.active : true
      };

      const val = Validation.validateVehicle(payload);
      if (!val.isValid) {
        errBox.textContent = val.errors.join(' ');
        errBox.classList.remove('hidden');
        return;
      }

      await VehicleRepository.save(payload);
      window.location.reload();
    });
  }
};
