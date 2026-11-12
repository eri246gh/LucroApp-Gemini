import { RecordRepository, VehicleRepository } from '../database/repositories.js';
import { calculateShiftProfit } from '../core/calculations.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';

export const RecordsModule = {
  async submitRecord(formData) {
    const { vehicleId, date, mode, shift, revenueReal, distanceKm } = formData;
    
    const vehicles = await VehicleRepository.getAll();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw new Error('Veículo não cadastrado');

    const existing = await RecordRepository.getByDateRange(date, date, vehicleId);

    if (mode === 'full_day') {
      if (existing.length > 0) {
        throw new Error('Já existem lançamentos para esta data. Exclua os turnos existentes ou edite o registro do dia.');
      }
    } else if (mode === 'shift') {
      const fullDayRecord = existing.find(r => r.mode === 'full_day');
      if (fullDayRecord) {
        throw new Error('Existe um registro de Dia Completo nesta data. Não é possível adicionar turnos sem antes remover o registro diário.');
      }
      const duplicateShift = existing.find(r => r.shift === shift);
      if (duplicateShift) {
        throw new Error(`O turno "${shift}" já foi registrado no dia ${date}. Escolha outro turno ou edite o existente.`);
      }
    }

    const revenueCents = Money.toCents(revenueReal);
    const snapshotCalculations = calculateShiftProfit({
      revenueCents,
      distanceKm: parseFloat(distanceKm),
      kmPerLiter: vehicle.kmPerLiter,
      fuelPriceCents: Money.toCents(vehicle.fuelPrice),
      maintCostPerKm: vehicle.maintCostPerKm,
      deprCostPerKm: vehicle.deprCostPerKm
    });

    const record = {
      vehicleId,
      date,
      mode,
      shift: mode === 'shift' ? shift : null,
      revenueCents,
      distanceKm: parseFloat(distanceKm),
      snapshot: {
        ...snapshotCalculations,
        vehicleModel: `${vehicle.brand} ${vehicle.model}`,
        kmPerLiter: vehicle.kmPerLiter,
        fuelPriceCents: Money.toCents(vehicle.fuelPrice),
        maintCostPerKm: vehicle.maintCostPerKm,
        deprCostPerKm: vehicle.deprCostPerKm
      }
    };

    return await RecordRepository.save(record);
  },

  async renderHistory(container) {
    const records = await RecordRepository.getByDateRange('1970-01-01', '2099-12-31');
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = `
      <section class="history-section grid-12">
        <div class="col-12">
          <h2>Histórico de Jornadas</h2>
        </div>
        
        <div class="col-12">
          <div class="card table-container">
            ${records.length === 0 ? '<p class="text-muted">Nenhum registro encontrado no histórico.</p>' : `
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Modo/Turno</th>
                    <th>Veículo</th>
                    <th>KM</th>
                    <th>Faturamento</th>
                    <th>Lucro Econômico</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${records.map(r => `
                    <tr>
                      <td>${Dates.formatBR(r.date)}</td>
                      <td>${r.mode === 'full_day' ? 'Dia Completo' : r.shift}</td>
                      <td>${r.snapshot.vehicleModel || 'N/A'}</td>
                      <td>${r.distanceKm} km</td>
                      <td>${Money.format(r.snapshot.revenueCents)}</td>
                      <td class="${r.snapshot.economicProfitCents >= 0 ? 'text-green' : 'text-red'}">
                        ${Money.format(r.snapshot.economicProfitCents)}
                      </td>
                      <td>
                        <button class="btn btn-danger btn-sm" data-delete="${r.id}">Excluir</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </section>
    `;

    container.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete');
        if (confirm('Deseja realmente excluir este registro?')) {
          await RecordRepository.delete(id);
          this.renderHistory(container);
        }
      });
    });
  }
};
