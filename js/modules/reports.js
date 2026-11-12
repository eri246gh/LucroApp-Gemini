import { RecordRepository, VehicleRepository } from '../database/repositories.js';
import { consolidatePeriod } from '../core/calculations.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';

export const ReportsModule = {
  state: {
    period: 'month',
    vehicleId: 'all'
  },

  async render(container) {
    const vehicles = await VehicleRepository.getAll();
    const range = Dates.getDateRange(this.state.period);
    const vehicleFilter = this.state.vehicleId === 'all' ? null : this.state.vehicleId;
    const records = await RecordRepository.getByDateRange(range.start, range.end, vehicleFilter);
    const summary = consolidatePeriod(records);

    const profitPerKm = summary.totalDistanceKm > 0 ? Math.round(summary.economicProfitCents / summary.totalDistanceKm) : 0;
    const revenuePerKm = summary.totalDistanceKm > 0 ? Math.round(summary.totalRevenueCents / summary.totalDistanceKm) : 0;
    const marginText = summary.profitMargin !== null ? `${summary.profitMargin.toFixed(2)}%` : 'Indisponível';

    // Agrupar por data para o gráfico
    const dailyMap = new Map();
    records.forEach(r => {
      const current = dailyMap.get(r.date) || { date: r.date, revenueCents: 0, profitCents: 0 };
      current.revenueCents += r.snapshot.revenueCents;
      current.profitCents += r.snapshot.economicProfitCents;
      dailyMap.set(r.date, current);
    });
    const dailySeries = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    container.innerHTML = `
      <section class="stack-md" aria-labelledby="rep-heading">
        <div class="page-header">
          <div>
            <h1 id="rep-heading" class="page-title">Relatórios Financeiros</h1>
            <p class="field-hint">${Dates.formatBR(range.start)} até ${Dates.formatBR(range.end)}</p>
          </div>
        </div>

        <div class="card form-grid">
          <div class="form-group">
            <label for="rep-period">Período</label>
            <select id="rep-period">
              <option value="week" ${this.state.period === 'week' ? 'selected' : ''}>Esta Semana</option>
              <option value="month" ${this.state.period === 'month' ? 'selected' : ''}>Este Mês</option>
              <option value="year" ${this.state.period === 'year' ? 'selected' : ''}>Este Ano</option>
            </select>
          </div>
          <div class="form-group">
            <label for="rep-vehicle">Veículo</label>
            <select id="rep-vehicle">
              <option value="all">Todos os Veículos</option>
              ${vehicles.map(v => `<option value="${v.id}" ${this.state.vehicleId === v.id ? 'selected' : ''}>${v.brand} ${v.model}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="grid-12">
          <div class="col-6-sm col-4">
            <article class="kpi-card">
              <span class="kpi-label">Faturamento Total</span>
              <span class="kpi-value">${Money.format(summary.totalRevenueCents)}</span>
            </article>
          </div>
          <div class="col-6-sm col-4">
            <article class="kpi-card">
              <span class="kpi-label">Lucro Econômico Total</span>
              <span class="kpi-value ${summary.economicProfitCents >= 0 ? 'text-green' : 'text-red'}">${Money.format(summary.economicProfitCents)}</span>
            </article>
          </div>
          <div class="col-6-sm col-4">
            <article class="kpi-card">
              <span class="kpi-label">Margem Consolidada</span>
              <span class="kpi-value">${marginText}</span>
              <span class="kpi-sub">Lucro total ÷ faturamento total</span>
            </article>
          </div>
          <div class="col-6-sm col-4">
            <article class="kpi-card">
              <span class="kpi-label">Distância Total</span>
              <span class="kpi-value">${summary.totalDistanceKm.toFixed(1)} km</span>
            </article>
          </div>
          <div class="col-6-sm col-4">
            <article class="kpi-card">
              <span class="kpi-label">Ganho Bruto / km</span>
              <span class="kpi-value">${Money.format(revenuePerKm)}</span>
            </article>
          </div>
          <div class="col-6-sm col-4">
            <article class="kpi-card">
              <span class="kpi-label">Lucro Econômico / km</span>
              <span class="kpi-value text-green">${Money.format(profitPerKm)}</span>
            </article>
          </div>
        </div>

        <div class="card stack-md">
          <div class="row-between">
            <h2>Evolução Diária (Faturamento vs. Lucro Econômico)</h2>
            <div class="row-wrap" aria-hidden="true">
              <span class="row-wrap"><span class="legend-swatch swatch-revenue"></span><small class="text-muted">Faturamento</small></span>
              <span class="row-wrap"><span class="legend-swatch swatch-profit"></span><small class="text-muted">Lucro Econômico</small></span>
            </div>
          </div>

          ${this.buildSvgChart(dailySeries)}

          ${dailySeries.length > 0 ? `
            <details class="disclosure">
              <summary>Ver dados do gráfico em tabela acessível</summary>
              <div class="disclosure-body table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th class="num text-right">Faturamento</th>
                      <th class="num text-right">Lucro Econômico</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${dailySeries.map(d => `
                      <tr>
                        <td>${Dates.formatBR(d.date)}</td>
                        <td class="num text-right">${Money.format(d.revenueCents)}</td>
                        <td class="num text-right">${Money.format(d.profitCents)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </details>
          ` : ''}
        </div>
      </section>
    `;

    container.querySelector('#rep-period').addEventListener('change', (e) => {
      this.state.period = e.target.value;
      this.render(container);
    });

    container.querySelector('#rep-vehicle').addEventListener('change', (e) => {
      this.state.vehicleId = e.target.value;
      this.render(container);
    });
  },

  buildSvgChart(series) {
    if (!series.length) {
      return '<p class="text-muted">Sem registros suficientes no período para exibir o gráfico.</p>';
    }

    const width = 680;
    const height = 240;
    const padLeft = 72;
    const padBottom = 32;
    const padTop = 16;
    const padRight = 16;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    const maxCents = Math.max(...series.map(s => Math.max(s.revenueCents, Math.abs(s.profitCents))), 10000);
    const groupWidth = chartW / series.length;
    const barW = Math.min(28, Math.max(8, groupWidth * 0.34));

    const gridLines = [0, 0.5, 1].map(ratio => {
      const y = padTop + chartH - ratio * chartH;
      const valLabel = Money.format(Math.round(maxCents * ratio));
      return `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="chart-grid-line" />
        <text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" class="chart-axis-text">${valLabel}</text>
      `;
    }).join('');

    const bars = series.map((item, i) => {
      const centerX = padLeft + i * groupWidth + groupWidth / 2;
      const revH = (item.revenueCents / maxCents) * chartH;
      const profH = (Math.max(0, item.profitCents) / maxCents) * chartH;
      const revY = padTop + chartH - revH;
      const profY = padTop + chartH - profH;
      const label = Dates.formatBR(item.date).slice(0, 5);

      return `
        <rect x="${centerX - barW - 2}" y="${revY}" width="${barW}" height="${revH}" rx="3" class="bar-revenue">
          <title>${label} — Faturamento: ${Money.format(item.revenueCents)}</title>
        </rect>
        <rect x="${centerX + 2}" y="${profY}" width="${barW}" height="${profH}" rx="3" class="${item.profitCents >= 0 ? 'bar-profit' : 'bar-loss'}">
          <title>${label} — Lucro Econômico: ${Money.format(item.profitCents)}</title>
        </rect>
        ${series.length <= 15 ? `<text x="${centerX}" y="${height - 10}" text-anchor="middle" class="chart-axis-text">${label}</text>` : ''}
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" class="svg-chart" role="img" aria-labelledby="svg-title svg-desc">
        <title id="svg-title">Gráfico de Faturamento e Lucro Econômico</title>
        <desc id="svg-desc">Comparativo diário em reais entre faturamento bruto e lucro econômico no período selecionado.</desc>
        ${gridLines}
        ${bars}
      </svg>
    `;
  }
};
