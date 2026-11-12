export const Validation = {
  isNonNegativeNumber(val) {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num >= 0;
  },

  isPositiveNumber(val) {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num > 0;
  },

  isValidDate(dateString) {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  },

  validateVehicle(vehicle) {
    const errors = [];
    if (!vehicle.brand?.trim()) errors.push('A marca do veículo é obrigatória.');
    if (!vehicle.model?.trim()) errors.push('O modelo do veículo é obrigatório.');
    if (!this.isPositiveNumber(vehicle.kmPerLiter)) errors.push('O consumo médio (km/l) deve ser maior que zero.');
    if (!this.isNonNegativeNumber(vehicle.fuelPrice)) errors.push('O preço do combustível deve ser maior ou igual a zero.');
    if (!this.isNonNegativeNumber(vehicle.maintCostPerKm)) errors.push('O custo de manutenção por km deve ser maior ou igual a zero.');
    if (!this.isNonNegativeNumber(vehicle.deprCostPerKm)) errors.push('A depreciação por km deve ser maior ou igual a zero.');
    return { isValid: errors.length === 0, errors };
  },

  validateWorkRecord(record) {
    const errors = [];
    if (!record.vehicleId) errors.push('Selecione um veículo válido.');
    if (!this.isValidDate(record.date)) errors.push('Informe uma data válida.');
    if (!this.isNonNegativeNumber(record.revenueReal)) errors.push('O faturamento deve ser maior ou igual a zero.');
    if (!this.isPositiveNumber(record.distanceKm)) errors.push('A quilometragem rodada deve ser maior que zero.');
    return { isValid: errors.length === 0, errors };
  },

  validateFuelPurchase(purchase) {
    const errors = [];
    if (!purchase.vehicleId) errors.push('Selecione um veículo.');
    if (!this.isValidDate(purchase.date)) errors.push('Informe uma data válida.');
    if (!this.isPositiveNumber(purchase.liters)) errors.push('A quantidade de litros deve ser maior que zero.');
    if (!this.isPositiveNumber(purchase.pricePerLiterReal)) errors.push('O preço por litro deve ser maior que zero.');
    return { isValid: errors.length === 0, errors };
  }
};
