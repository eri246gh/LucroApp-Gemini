import { RecordRepository } from '../database/repositories.js';
import { consolidatePeriod } from '../core/calculations.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';

export const ReportsModule = {
  async render(container) {
    const range = Dates.getDateRange('month');
    const records = await RecordRepository.getByDateRange(range.start, range.end);
    const summary = consolidatePeriod(records);

    const profitPerKm = summary.totalDistanceKm > 0 ? summary.economicProfitCents / summary.totalDistanceKm : 0;
    const revenuePerKm = summary.totalDistanceKm > 0 ? summary.totalRevenueCents / summary.totalDistanceKm : 0;

    container.innerHTML = `
      <section class="reports-section">
        <h2>Relatórios Avançados</h2>

        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">Faturamento Total</span>
            <span class="kpi-value">${Money.format(summary.totalRevenueCents)}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Lucro Econômico Total</span>
            <span class="kpi-value text-green">${Money.format(summary.economicProfitCents)}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Distância Percorrida</span>
            <span class="kpi-value">${summary.totalDistanceKm.toFixed(0)} km</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Ganho Bruto / km</span>
            <span class="kpi-value">${Money.format(revenuePerKm)}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Lucro / km</span>
            <span class="kpi-value text-green">${Money.format(profitPerKm)}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Margem Consolidada</span>
            <span class="kpi-value">${summary.profitMargin !== null ? summary.profitMargin.toFixed(1) + '%' : 'N/A'}</span>
          </div>
        </div>

        <div class="chart-card card">
          <h3>Evolução do Faturamento vs Lucro</h3>
          <canvas id="canvas-report" width="600" height="300"></canvas>
        </div>
      </section>
    `;

    this.renderChart(records);
  },

  renderChart(records) {
    const canvas = document.getElementById('canvas-report');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Desenhar barras nativas em Canvas sem dependências externas
    const sorted = records.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!sorted.length) {
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '16px sans-serif';
      ctx.fillText('Sem dados para gerar gráfico no período.', 150, 150);
      return;
    }

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxVal = Math.max(...sorted.map(r => Money.toReal(r.snapshot.revenueCents)), 100);

    const barWidth = Math.max(10, (chartWidth / sorted.length) - 10);

    sorted.forEach((r, idx) => {
      const x = padding + idx * (barWidth + 10);
      const revHeight = (Money.toReal(r.snapshot.revenueCents) / maxVal) * chartHeight;
      const profitHeight = (Money.toReal(r.snapshot.economicProfitCents) / maxVal) * chartHeight;

      // Barra Faturamento
      ctx.fillStyle = '#1B232B';
      ctx.fillRect(x, canvas.height - padding - revHeight, barWidth, revHeight);

      // Barra Lucro
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(x + 2, canvas.height - padding - profitHeight, barWidth - 4, profitHeight);
    });
  }
};
