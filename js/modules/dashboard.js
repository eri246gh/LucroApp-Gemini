import { RecordRepository, VehicleRepository } from '../database/repositories.js';
import { consolidatePeriod } from '../core/calculations.js';
import { getProfitabilityStatus } from '../core/traffic-light.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';

export const DashboardModule = {
  async render(container) {
    const vehicles = await VehicleRepository.getAll();
    if (!vehicles.length) {
      container.innerHTML = `
        <div class="card empty-state">
          <h2>Bem-vindo ao LucroApp! 🚘</h2>
          <p class="text-muted">Para começar a calcular seu lucro real, cadastre seu primeiro veículo.</p>
          <a href="#/veiculos" class="btn btn-primary" style="margin-top:16px;">Cadastrar Veículo</a>
        </div>
      `;
      return;
    }

    const todayRange = Dates.getDateRange('today');
    const recordsToday = await RecordRepository.getByDateRange(todayRange.start, todayRange.end);
    const summaryToday = consolidatePeriod(recordsToday);
    const status = getProfitabilityStatus(summaryToday.profitMargin, summaryToday.totalRevenueCents);

    // Mapeamento de classe do status banner sem style inline
    const statusClass = status.status === 'green' ? 'status-green' : status.status === 'yellow' ? 'status-yellow' : 'status-red';

    container.innerHTML = `
      <section class="dashboard-section grid-12">
        <!-- Banner de Status sem inline CSS -->
        <div class="col-12">
          <div class="status-banner ${statusClass}">
            <span class="status-dot"></span>
            <div>
              <strong>Status de Rentabilidade:</strong> ${status.label}
              ${summaryToday.profitMargin !== null ? `<br><small class="text-muted">Margem Operacional: ${summaryToday.profitMargin.toFixed(1)}%</small>` : ''}
            </div>
          </div>
        </div>

        <!-- Hero Card Principal -->
        <div class="col-12 col-8-md">
          <div class="hero-card">
            <span class="hero-label">Lucro Econômico Hoje</span>
            <span class="hero-value ${summaryToday.economicProfitCents >= 0 ? 'text-accent' : 'text-red'}">
              ${Money.format(summaryToday.economicProfitCents)}
            </span>
            <span class="hero-sub">Livre de combustível, manutenção recomendada e depreciação.</span>
          </div>
        </div>

        <!-- Dinheiro Livre Estimado -->
        <div class="col-12 col-4-md">
          <div class="card hero-secondary">
            <span class="kpi-label">Dinheiro Livre Estimado</span>
            <span class="kpi-value text-green">${Money.format(summaryToday.availableMoneyCents)}</span>
            <span class="kpi-sub">Faturamento (-) Combustível (-) Manutenção</span>
          </div>
        </div>

        <!-- KPI Grid de Custos -->
        <div class="col-6 col-3-md">
          <div class="kpi-card">
            <span class="kpi-label">Faturamento Bruto</span>
            <span class="kpi-value">${Money.format(summaryToday.totalRevenueCents)}</span>
          </div>
        </div>

        <div class="col-6 col-3-md">
          <div class="kpi-card">
            <span class="kpi-label">Combustível Estimado</span>
            <span class="kpi-value">${Money.format(summaryToday.totalFuelCents)}</span>
          </div>
        </div>

        <div class="col-6 col-3-md">
          <div class="kpi-card">
            <span class="kpi-label">Reserva Manutenção</span>
            <span class="kpi-value text-yellow">${Money.format(summaryToday.totalMaintCents)}</span>
          </div>
        </div>

        <div class="col-6 col-3-md">
          <div class="kpi-card">
            <span class="kpi-label">Depreciação Veicular</span>
            <span class="kpi-value">${Money.format(summaryToday.totalDeprCents)}</span>
          </div>
        </div>

        <div class="col-12">
          <a href="#/novo" class="btn btn-primary btn-block">➕ Registrar Novo Trabalho</a>
        </div>
      </section>
    `;
  }
};
