/**
 * Classificador de Rentabilidade (Semântica Monocromática + Rótulos Explícitos)
 */
export function getProfitabilityStatus(profitMargin, revenueCents, settings = {}) {
  const greenThreshold = settings.greenThreshold ?? 20;
  const yellowThreshold = settings.yellowThreshold ?? 0;

  if (revenueCents === 0 || profitMargin === null || profitMargin === undefined) {
    return { status: 'indeterminate', label: 'Sem faturamento', pillClass: 'pill-outline' };
  }

  if (profitMargin >= greenThreshold) {
    return { status: 'high', label: 'Alta Rentabilidade', pillClass: 'pill-solid' };
  } else if (profitMargin > yellowThreshold) {
    return { status: 'low', label: 'Margem Reduzida', pillClass: 'pill-outline' };
  } else {
    return { status: 'loss', label: 'Prejuízo Operacional', pillClass: 'pill-dashed' };
  }
}
