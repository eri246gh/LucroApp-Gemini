import { Money } from '../utils/money.js';

/**
 * Motor Financeiro do LucroApp
 * Executa cálculos mantendo precisão em centavos e frações de taxa por km
 */
export function calculateShiftProfit(params) {
  const {
    revenueCents,     // Faturamento bruto em centavos (F)
    distanceKm,       // Distância em km (K)
    kmPerLiter,       // Consumo médio km/l (E)
    fuelPriceCents,   // Preço combustível/litro em centavos (P)
    maintCostPerKm,   // Custo manutenção/km em R$ (M)
    deprCostPerKm     // Custo depreciação/km em R$ (D)
  } = params;

  if (distanceKm <= 0 || kmPerLiter <= 0) {
    return {
      revenueCents,
      fuelCostCents: 0,
      maintReserveCents: 0,
      deprReserveCents: 0,
      availableMoneyCents: revenueCents,
      economicProfitCents: revenueCents,
      profitMargin: revenueCents > 0 ? 100 : 0,
      isValid: false
    };
  }

  // Combustível: (K / E) * P (em centavos)
  const litersConsumed = distanceKm / kmPerLiter;
  const fuelCostCents = Math.round(litersConsumed * fuelPriceCents);

  // Manutenção: K * M (em centavos)
  const maintReserveCents = Math.round(distanceKm * Money.toCents(maintCostPerKm));

  // Depreciação: K * D (em centavos)
  const deprReserveCents = Math.round(distanceKm * Money.toCents(deprCostPerKm));

  // Dinheiro Livre Estimado = F - Combustível - Manutenção
  const availableMoneyCents = revenueCents - fuelCostCents - maintReserveCents;

  // Lucro Econômico = Dinheiro Livre - Depreciação
  const economicProfitCents = availableMoneyCents - deprReserveCents;

  // Margem Econômica (%)
  let profitMargin = null;
  if (revenueCents > 0) {
    profitMargin = (economicProfitCents / revenueCents) * 100;
  }

  return {
    revenueCents,
    distanceKm,
    fuelCostCents,
    maintReserveCents,
    deprReserveCents,
    availableMoneyCents,
    economicProfitCents,
    profitMargin,
    isValid: true,
    formulaVersion: '1.0'
  };
}

/**
 * Consolida múltiplos registros agregando faturamento e custos
 */
export function consolidatePeriod(records) {
  let totalRevenueCents = 0;
  let totalFuelCents = 0;
  let totalMaintCents = 0;
  let totalDeprCents = 0;
  let totalDistanceKm = 0;

  records.forEach(r => {
    totalRevenueCents += r.snapshot.revenueCents || 0;
    totalFuelCents += r.snapshot.fuelCostCents || 0;
    totalMaintCents += r.snapshot.maintReserveCents || 0;
    totalDeprCents += r.snapshot.deprReserveCents || 0;
    totalDistanceKm += r.distanceKm || 0;
  });

  const availableMoneyCents = totalRevenueCents - totalFuelCents - totalMaintCents;
  const economicProfitCents = availableMoneyCents - totalDeprCents;

  // Margem Consolidada = Lucro Econômico Total / Faturamento Total * 100
  let profitMargin = null;
  if (totalRevenueCents > 0) {
    profitMargin = (economicProfitCents / totalRevenueCents) * 100;
  }

  return {
    totalRevenueCents,
    totalFuelCents,
    totalMaintCents,
    totalDeprCents,
    totalDistanceKm,
    availableMoneyCents,
    economicProfitCents,
    profitMargin,
    recordCount: records.length
  };
}
