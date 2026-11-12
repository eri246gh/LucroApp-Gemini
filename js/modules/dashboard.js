import { RecordRepository, VehicleRepository } from '../database/repositories.js';
import { consolidatePeriod } from '../core/calculations.js';
import { getProfitabilityStatus } from '../core/traffic-light.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';

export const DashboardModule = {
  state: {
    period: 'today',
    customStart: Dates.getTodayISO(),
    customEnd: Dates.getTodayISO()
  },

  getPreviousRange(period, currentRange) {
    const start = new Date(currentRange.start + 'T00:00:00');
    const end = new Date(currentRange.end + 'T00:00:00');
    const diffDays = Math.max(1, Math.round((end - start) / 86400000) + 1);

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - (diffDays - 1));

    return {
      start: prevStart.toISOString().split('T')[0],
      end: prevEnd.toISOString().split('T')[0]
    };
  },

  async render(container, settings = {}) {
    const vehicles = await VehicleRepository.getAll();
    if (!vehicles.length) {
      container.innerHTML = `
        <section class="card stack-md">
          <h1 class="page-title">Bem-vindo ao LucroApp</h1>
          <p class="text-muted">Para descobrir quanto você realmente ganha por quilômetro e por dia, cadastre primeiro o seu veículo de trabalho.</p>
          <div>
            <a href="#/veiculos" class="btn btn-primary">Cadastrar Meu Veículo</a>
          </div>
        </section>
      `;
      return;
    }

    const range = this.state.period === 'custom'
      ? { start: this.state.customStart, end: this.state.customEnd }
      : Dates.getDateRange(this.state.period);

    const records = await RecordRepository.getByDateRange(range.start, range.end);
    const summary = consolidatePeriod(records);

    const prevRange = this.getPreviousRange(this.state.period, range);
    const prevRecords = await RecordRepository.getByDateRange(prevRange.start, prevRange.end);
    const prevSummary = consolidatePeriod(prevRecords);

    const status = getProfitabilityStatus(summary.profitMargin, summary.totalRevenueCents, settings);
    const profitSign = summary.economicProfitCents > 0 ? '+' : '';
    const marginText = summary.profitMargin !== null ? `${summary.profitMargin.toFixed(1)}%` : 'Indisponível';

    let comparisonHtml = '<span class="text-muted">Sem dados no período anterior para comparação.</span>';
    if (prevRecords.length > 0 && prevSummary.economicProfitCents !== 0) {
      const deltaCents = summary.economicProfitCents - prevSummary.economicProfitCents;
      const deltaSign = deltaCents >= 0 ? '+' : '';
      const deltaClass = deltaCents >= 0 ? 'text-green' : 'text-red';
      comparisonHtml = `<span class="${deltaClass}"><strong>${deltaSign}${Money.format(deltaCents)}</strong> vs. período anterior (${Dates.formatBR(prevRange.start)} a ${Dates.formatBR(prevRange.end)})</span>`;
    }

    container.innerHTML = `
      <section class="stack-md" aria-labelledby="dash-heading">
        <div class="page-header">
          <div>
            <h1 id="dash-heading" class="page-title">Painel Operacional</h1>
            <p class="field-hint">Período: ${Dates.formatBR(range.start)} até ${Dates.formatBR(range.end)} • Moeda: BRL</p>
          </div>
          <a href="#/novo" class="btn btn-primary">+ Lançar Trabalho</a>
        </div>

        <!-- Seletor de Período -->
        <div class="period-bar" role="group" aria-label="Filtrar período">
          <button type="button" class="chip-btn ${this.state.period === 'today' ? 'active' : ''}" data-period="today">Hoje</button>
          <button type="button" class="chip-btn ${this.state.period === 'week' ? 'active' : ''}" data-period="week">Semana</button>
          <button type="button" class="chip-btn ${this.state.period === 'month' ? 'active' : ''}" data-period="month">Mês</button>
          <button type="button" class="chip-btn ${this.state.period === 'custom' ? 'active' : ''}" data-period="custom">Personalizado</button>
        </div>

        ${this.state.period === 'custom' ? `
          <form id="custom-period-form" class="card form-grid">
            <div class="form-group">
              <label for="dash-start">Data Inicial</label>
              <input type="date" id="dash-start" value="${this.state.customStart}" required>
            </div>
            <div class="form-group">
              <label for="dash-end">Data Final</label>
              <input type="date" id="dash-end" value="${this.state.customEnd}" required>
            </div>
            <div class="form-group">
              <label>&nbsp;</label>
              <button type="submit" class="btn btn-secondary">Aplicar Datas</button>
            </div>
          </form>
        ` : ''}

        <!-- Indicador de Rentabilidade (Cor + Rótulo + Margem) -->
        <div class="status-banner status-${status.status}" role="status">
          <div>
            <strong>Rentabilidade: ${status.label}</strong>
            <span class="field-hint"> • Margem Econômica: ${marginText}</span>
          </div>
          <span class="badge badge-${status.status === 'green' ? 'success' : status.status === 'yellow' ? 'warning' : status.status === 'red' ? 'danger' : 'neutral'}">
            ${summary.totalDistanceKm.toFixed(1)} km rodados
          </span>
        </div>

        <!-- Grid Principal -->
        <div class="grid-12">
          <div class="col-12 col-8">
            <article class="hero-card" aria-label="Lucro econômico no período">
              <span class="hero-label">Lucro Econômico Real (Estimado)</span>
              <span class="hero-value ${summary.economicProfitCents >= 0 ? 'positive' : 'negative'}">
                ${profitSign}${Money.format(summary.economicProfitCents)}
              </span>
              <div class="hero-meta">
                <span>${comparisonHtml}</span>
              </div>
            </article>
          </div>

          <div class="col-12 col-4">
            <article class="card stack-sm" aria-label="Dinheiro livre estimado">
              <span class="kpi-label">Dinheiro Livre Estimado</span>
              <span class="kpi-value ${summary.availableMoneyCents >= 0 ? 'text-green' : 'text-red'}">
                ${Money.format(summary.availableMoneyCents)}
              </span>
              <span class="kpi-sub">Faturamento bruto descontando combustível e reserva de manutenção (antes da depreciação).</span>
            </article>
          </div>

          <div class="col-6-sm col-3">
            <article class="kpi-card">
              <span class="kpi-label">Faturamento Bruto</span>
              <span class="kpi-value">${Money.format(summary.totalRevenueCents)}</span>
              <span class="kpi-sub">${summary.recordCount} lançamento(s)</span>
            </article>
          </div>

          <div class="col-6-sm col-3">
            <article class="kpi-card">
              <span class="kpi-label">Combustível Estimado</span>
              <span class="kpi-value text-red">-${Money.format(summary.totalFuelCents)}</span>
              <span class="kpi-sub">Consumo calculado por km</span>
            </article>
          </div>

          <div class="col-6-sm col-3">
            <article class="kpi-card">
              <span class="kpi-label">Reserva Manutenção</span>
              <span class="kpi-value text-yellow">-${Money.format(summary.totalMaintCents)}</span>
              <span class="kpi-sub">Recomendado guardar</span>
            </article>
          </div>

          <div class="col-6-sm col-3">
            <article class="kpi-card">
              <span class="kpi-label">Depreciação Estimada</span>
              <span class="kpi-value text-muted">-${Money.format(summary.totalDeprCents)}</span>
              <span class="kpi-sub">Desgaste patrimonial</span>
            </article>
          </div>
        </div>

        ${records.length === 0 ? `
          <div class="alert-box alert-info" role="status">
            Nenhum trabalho registrado neste período. Use o botão <strong>+ Lançar Trabalho</strong> para registrar sua jornada.
          </div>
        ` : ''}

        <!-- Divulgação Progressiva: Explicação da Fórmula -->
        <details class="disclosure">
          <summary>Como o LucroApp calcula seu resultado?</summary>
          <div class="disclosure-body stack-sm">
            <p><strong>1. Dinheiro Livre Estimado:</strong> Faturamento Bruto (−) Combustível Estimado (−) Reserva Recomendada de Manutenção.</p>
            <p><strong>2. Lucro Econômico Real:</strong> Dinheiro Livre Estimado (−) Depreciação do Veículo pelo uso.</p>
            <p><strong>3. Cofrinho:</strong> Representa apenas valores que você efetivamente depositou na aba Cofrinho.</p>
          </div>
        </details>
      </section>
    `;

    container.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.period = btn.getAttribute('data-period');
        this.render(container, settings);
      });
    });

    container.querySelector('#custom-period-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.state.customStart = document.getElementById('dash-start').value;
      this.state.customEnd = document.getElementById('dash-end').value;
      this.render(container, settings);
    });
  }
};
