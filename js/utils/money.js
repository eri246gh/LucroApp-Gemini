/**
 * Utilitário de Precisão Monetária em Centavos Inteiros
 */
export const Money = {
  toCents(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return 0;
    return Math.round((amount + Number.EPSILON) * 100);
  },

  toReal(cents) {
    if (typeof cents !== 'number' || isNaN(cents)) return 0;
    return cents / 100;
  },

  format(cents) {
    const value = this.toReal(cents);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  parseInput(stringValue) {
    if (!stringValue) return 0;
    const clean = stringValue.replace(/[^\d,-]/g, '').replace(',', '.');
    const floatVal = parseFloat(clean);
    return isNaN(floatVal) ? 0 : this.toCents(floatVal);
  }
};
