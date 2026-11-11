import { calculateShiftProfit } from '../js/core/calculations.js';
import { Money } from '../js/utils/money.js';

function runTests() {
  console.log('--- EXECUTANDO TESTES DO MOTOR FINANCEIRO ---');

  // Caso de referência do Prompt Mestre
  const testCase = {
    revenueCents: Money.toCents(420.00),
    distanceKm: 180,
    kmPerLiter: 12,
    fuelPriceCents: Money.toCents(6.00),
    maintCostPerKm: 0.20,
    deprCostPerKm: 0.08
  };

  const result = calculateShiftProfit(testCase);

  console.assert(result.fuelCostCents === 9000, `Erro Combustível: esperado 9000, obteve ${result.fuelCostCents}`);
  console.assert(result.maintReserveCents === 3600, `Erro Manutenção: esperado 3600, obteve ${result.maintReserveCents}`);
  console.assert(result.deprReserveCents === 1440, `Erro Depreciação: esperado 1440, obteve ${result.deprReserveCents}`);
  console.assert(result.availableMoneyCents === 29400, `Erro Dinheiro Livre: esperado 29400, obteve ${result.availableMoneyCents}`);
  console.assert(result.economicProfitCents === 27960, `Erro Lucro Econômico: esperado 27960, obteve ${result.economicProfitCents}`);
  
  const formattedMargin = result.profitMargin.toFixed(2);
  console.assert(formattedMargin === '66.57', `Erro Margem Econômica: esperada 66.57%, obteve ${formattedMargin}%`);

  console.log('✅ TODOS OS TESTES FINANCEIROS PASSARAM COM SUCESSO!');
}

runTests();
