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

  getPreviousRange(currentRange) {
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
        <section class="surface stack-md">
          <span class="eyebrow">Configuração Inicial</span>
          <h1 class="page-title">Configure seu veículo de trabalho</h1>
          <p class="text-muted">Para calcular consumo de combustível, manutenção por quilômetro e depreciação real, cadastre primeiro o veículo utilizado nas corridas.</p>
          <div>
            <a href="#/veiculos" class="btn btn-primary">Cadastrar Veículo</a>
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

    const prevRange = this.getPreviousRange(range);
    const prevRecords = await RecordRepository.getByDateRange(prevRange.start, prevRange.end);
    const prevSummary = consolidatePeriod(prevRecords);

    const status = getProfitabilityStatus(summary.profitMargin, summary.totalRevenueCents, settings);
    const profitSign = summary.economicProfitCents > 0 ? '+' : '';
    const marginText = summary.profitMargin !== null ? `${summary.profitMargin.toFixed(1)}%` : 'Indisponível';
    const profitPerKm = summary.totalDistanceKm > 0 ? Math.round(summary.economicProfitCents / summary.totalDistanceKm) : 0;

    let comparisonText = 'Sem histórico anterior equivalente para comparação.';
    if (prevRecords.length > 0 && prevSummary.economicProfitCents !== 0) {
      const deltaCents = summary.economicProfitCents - prevSummary.economicProfitCents;
      const deltaSign = deltaCents >= 0 ? '+' : '−';
      comparisonText = `${deltaSign}${Money.format(Math.abs(deltaCents))} em relação a ${Dates.formatBR(prevRange.start)} – ${Dates.formatBR(prevRange.end)}`;
    }

    container.innerHTML = `
      <section class="stack-md" aria-labelledby="dash-heading">
        <div class="page-header">
          <div class="stack-xs">
            <span class="eyebrow">${Dates.formatBR(range.start)} — ${Dates.formatBR(range.end)} • BRL</span>
            <h1 id="dash-heading" class="page-title">Resumo Financeiro</h1>
          </div>

          <div class="segmented-control" role="group" aria-label="Selecionar período">
            <button type="button" class="seg-btn ${this.state.period === 'today' ? 'active' : ''}" data-period="today">Hoje</button>
            <button type="button" class="seg-btn ${this.state.period === 'week' ? 'active' : ''}" data-period="week">Semana</button>
            <button type="button" class="seg-btn ${this.state.period === 'month' ? 'active' : ''}" data-period="month">Mês</button>
            <button type="button" class="seg-btn ${this.state.period === 'custom' ? 'active' : ''}" data-period="custom">Período</button>
          </div>
        </div>

        ${this.state.period === 'custom' ? `
          <form id="custom-period-form" class="surface form-grid">
            <div class="form-group">
              <label for="dash-start">Data Inicial</label>
              <input type="date" id="dash-start" value="${this.state.customStart}" required>
            </div>
            <div class="form-group">
              <label for="dash-end">Data Final</label>
              <input type="date" id="dash-end" value="${this.state.customEnd}" required>
            </div>
            <div class="form-group">
              <label for="apply-dates-btn">Filtro</label>
              <button type="submit" id="apply-dates-btn" class="btn btn-primary">Aplicar Intervalo</button>
            </div>
          </form>
        ` : ''}

        <!-- Estrutura Assimétrica: Resultado Principal + Demonstrativo DRE -->
        <div class="grid-12">
          <article class="hero-statement col-7" aria-label="Lucro econômico real">
            <div class="row-between">
              <span class="eyebrow">Lucro Econômico Real</span>
              <span class="pill ${status.pillClass}">${status.label} • ${marginText}</span>
            </div>

            <div class="hero-number ${summary.economicProfitCents < 0 ? 'is-negative' : ''}">
              ${profitSign}${Money.format(summary.economicProfitCents)}
            </div>

            <div class="hero-footer">
              <span>${comparisonText}</span>
              <span class="tabular text-strong">${summary.totalDistanceKm.toFixed(1)} km</span>
            </div>
          </article>

          <article class="surface col-5 stack-sm" aria-label="Composição do resultado">
            <div class="row-between">
              <span class="eyebrow">Demonstrativo Operacional</span>
              <span class="metric-note">${summary.recordCount} registro(s)</span>
            </div>

            <div class="ledger-list">
              <div class="ledger-row">
                <span>Faturamento Bruto</span>
                <span class="ledger-amount text-strong">${Money.format(summary.totalRevenueCents)}</span>
              </div>
              <div class="ledger-row">
                <span class="text-muted">(−) Combustível Estimado</span>
                <span class="ledger-amount text-muted">−${Money.format(summary.totalFuelCents)}</span>
              </div>
              <div class="ledger-row">
                <span class="text-muted">(−) Reserva Manutenção</span>
                <span class="ledger-amount text-muted">−${Money.format(summary.totalMaintCents)}</span>
              </div>
              <div class="ledger-row is-total">
                <span>Dinheiro Livre Estimado</span>
                <span class="ledger-amount">${Money.format(summary.availableMoneyCents)}</span>
              </div>
              <div class="ledger-row">
                <span class="text-muted">(−) Depreciação Veicular</span>
                <span class="ledger-amount text-muted">−${Money.format(summary.totalDeprCents)}</span>
              </div>
            </div>
          </article>

          <!-- Indicadores Unitários -->
          <article class="metric-card col-6-sm col-4">
            <span class="eyebrow">Lucro por KM</span>
            <span class="metric-value">${Money.format(profitPerKm)}/km</span>
            <span class="metric-note">Rendimento líquido após custos</span>
          </article>

          <article class="metric-card col-6-sm col-4">
            <span class="eyebrow">Custo Operacional Total</span>
            <span class="metric-value">${Money.format(summary.totalFuelCents + summary.totalMaintCents + summary.totalDeprCents)}</span>
            <span class="metric-note">Combustível + Manutenção + Depreciação</span>
          </article>

          <article class="metric-card col-12 col-4">
            <span class="eyebrow">Ação Rápida</span>
            <a href="#/novo" class="btn btn-primary btn-block mt-2">Registrar Jornada</a>
          </article>
        </div>

        ${records.length === 0 ? `
          <div class="notice notice-strong" role="status">
            Nenhum lançamento encontrado no intervalo selecionado. Clique em <strong>Registrar Jornada</strong> para adicionar seus ganhos.
          </div>
        ` : ''}

        <details class="disclosure">
          <summary>Metodologia de cálculo do LucroApp</summary>
          <div class="disclosure-body stack-xs">
            <p><strong>Dinheiro Livre Estimado:</strong> Faturamento bruto subtraído do combustível estimado por consumo médio (km/l) e da reserva recomendada para manutenção.</p>
            <p><strong>Lucro Econômico Real:</strong> Dinheiro livre subtraído da depreciação estimada pelo desgaste quilométrico do veículo.</p>
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
