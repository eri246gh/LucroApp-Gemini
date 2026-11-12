import { VehicleRepository } from '../database/repositories.js';
import { Validation } from '../utils/validation.js';

export const VehiclesModule = {
  async render(container) {
    const vehicles = await VehicleRepository.getAll();

    container.innerHTML = `
      <section class="vehicles-section">
        <div class="section-header">
          <h2>Meus Veículos</h2>
          <button id="btn-add-vehicle" class="btn btn-primary">➕ Novo Veículo</button>
        </div>

        <div id="vehicle-form-area" class="hidden"></div>

        <div class="vehicle-grid">
          ${vehicles.length === 0 ? '<p class="empty-text">Nenhum veículo cadastrado.</p>' : ''}
          ${vehicles.map(v => `
            <div class="card vehicle-card ${v.active ? 'active-border' : ''}">
              <div class="vehicle-card-header">
                <h3>${v.brand} ${v.model} (${v.year})</h3>
                ${v.active ? '<span class="badge badge-success">Ativo</span>' : ''}
              </div>
              <div class="vehicle-specs">
                <p><strong>Motor:</strong> ${v.engine || 'N/I'} | <strong>Combustível:</strong> ${v.fuelType}</p>
                <p><strong>Consumo Médio:</strong> ${v.kmPerLiter} km/l</p>
                <p><strong>Preço Combustível:</strong> R$ ${v.fuelPrice.toFixed(2)} / L</p>
                <p><strong>Manutenção:</strong> R$ ${v.maintCostPerKm.toFixed(2)} / km</p>
                <p><strong>Depreciação:</strong> R$ ${v.deprCostPerKm.toFixed(2)} / km</p>
              </div>
              <div class="card-actions">
                ${!v.active ? `<button class="btn btn-secondary btn-sm" data-activate="${v.id}">Tornar Ativo</button>` : ''}
                <button class="btn btn-secondary btn-sm" data-edit="${v.id}">Editar</button>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;

    this.bindEvents(container, vehicles);
  },

  bindEvents(container, vehicles) {
    const formArea = container.querySelector('#vehicle-form-area');

    container.querySelector('#btn-add-vehicle')?.addEventListener('click', () => {
      this.renderForm(formArea, null);
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
        const id = btn.getAttribute('data-edit');
        const vehicle = vehicles.find(v => v.id === id);
        this.renderForm(formArea, vehicle);
      });
    });
  },

  renderForm(container, vehicle) {
    const isEdit = !!vehicle;
    container.classList.remove('hidden');
    container.innerHTML = `
      <form id="vehicle-form" class="card form-card">
        <h3>${isEdit ? 'Editar Veículo' : 'Cadastrar Veículo'}</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Marca</label>
            <input type="text" id="v-brand" value="${vehicle?.brand || ''}" required placeholder="Ex: Chevrolet">
          </div>
          <div class="form-group">
            <label>Modelo</label>
            <input type="text" id="v-model" value="${vehicle?.model || ''}" required placeholder="Ex: Onix">
          </div>
          <div class="form-group">
            <label>Ano</label>
            <input type="number" id="v-year" value="${vehicle?.year || new Date().getFullYear()}" required>
          </div>
          <div class="form-group">
            <label>Combustível</label>

            <select id="v-fuel">
              <option value="Gasolina" ${vehicle?.fuelType === 'Gasolina' ? 'selected' : ''}>Gasolina</option>
              <option value="Etanol" ${vehicle?.fuelType === 'Etanol' ? 'selected' : ''}>Etanol</option>
              <option value="GNV" ${vehicle?.fuelType === 'GNV' ? 'selected' : ''}>GNV</option>
              <option value="Diesel" ${vehicle?.fuelType === 'Diesel' ? 'selected' : ''}>Diesel</option>
            </select>
          </div>
          <div class="form-group">
            <label>Consumo Médio (km/l)</label>
            <input type="number" step="0.1" id="v-kml" value="${vehicle?.kmPerLiter || ''}" required placeholder="Ex: 12">
          </div>
          <div class="form-group">
            <label>Preço Combustível (R$/L)</label>
            <input type="number" step="0.01" id="v-fuelprice" value="${vehicle?.fuelPrice || ''}" required placeholder="Ex: 5.80">
          </div>
          <div class="form-group">
            <label>Custo Manutenção/km (R$)</label>
            <input type="number" step="0.01" id="v-maintkm" value="${vehicle?.maintCostPerKm || '0.20'}" required>
          </div>
          <div class="form-group">
            <label>Depreciação/km (R$)</label>
            <input type="number" step="0.01" id="v-deprkm" value="${vehicle?.deprCostPerKm || '0.08'}" required>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">Salvar Veículo</button>
          <button type="button" id="btn-cancel-v" class="btn btn-secondary">Cancelar</button>
        </div>
      </form>
    `;

    container.querySelector('#btn-cancel-v').addEventListener('click', () => {
      container.classList.add('hidden');
    });

    container.querySelector('#vehicle-form').addEventListener('submit', async (e) => {
      e.preventDefault();
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
        alert(val.errors.join('\n'));
        return;
      }

      await VehicleRepository.save(payload);
      window.location.reload();
    });
  }
};
