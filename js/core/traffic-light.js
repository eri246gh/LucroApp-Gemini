/**
 * Classificador do Indicador de Rentabilidade
 */
export function getProfitabilityStatus(profitMargin, revenueCents, settings = {}) {
  const greenThreshold = settings.greenThreshold ?? 20;
  const yellowThreshold = settings.yellowThreshold ?? 0;

  if (revenueCents === 0 || profitMargin === null || profitMargin === undefined) {
    return { status: 'indeterminate', label: 'Sem faturamento', color: '#9CA3AF' };
  }

  if (profitMargin >= greenThreshold) {
    return { status: 'green', label: 'Alta Rentabilidade', color: '#22C55E' };
  } else if (profitMargin > yellowThreshold) {
    return { status: 'yellow', label: 'Atenção / Margem Baixa', color: '#FACC15' };
  } else {
    return { status: 'red', label: 'Prejuízo Operacional', color: '#EF4444' };
  }
}
