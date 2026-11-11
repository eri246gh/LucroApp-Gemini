import { RecordRepository, VehicleRepository } from '../database/repositories.js';
import { calculateShiftProfit } from '../core/calculations.js';
import { Money } from '../utils/money.js';

export const RecordsModule = {
  async submitRecord(formData) {
    const { vehicleId, date, mode, shift, revenueReal, distanceKm } = formData;
    
    // Obter veículos
    const vehicles = await VehicleRepository.getAll();
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) throw new Error('Veículo não cadastrado');

    // Verificar registros existentes para mesma data e veículo
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

    // Cálculo com snapshot dos parâmetros do veículo no momento do registro
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
  }
};
