export const Dates = {
  getTodayISO() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  },

  formatBR(isoDateStr) {
    if (!isoDateStr) return '';
    const [year, month, day] = isoDateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  },

  getDateRange(period) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (period === 'today') {
      return { start: todayStr, end: todayStr };
    }

    if (period === 'week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      return {
        start: monday.toISOString().split('T')[0],
        end: todayStr
      };
    }

    if (period === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: firstDay.toISOString().split('T')[0],
        end: todayStr
      };
    }

    if (period === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      return {
        start: firstDay.toISOString().split('T')[0],
        end: todayStr
      };
    }

    return { start: '1970-01-01', end: '2099-12-31' };
  }
};
