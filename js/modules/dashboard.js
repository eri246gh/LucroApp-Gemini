import { RecordRepository, VehicleRepository } from '../database/repositories.js';
import { consolidatePeriod } from '../core/calculations.js';
import { getProfitabilityStatus } from '../core/traffic-light.js';
import { Money } from '../utils/money.js';
import { Dates } from '../utils/dates.js';

export const DashboardModule = {
  async render(container) {
    const vehicles = await VehicleRepository.getAll();
    const activeVehicle = vehicles.find(v => v.active) || vehicles[0];

    if (!vehicles.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h2>Bem-vindo ao LucroApp! 🚘</h2>
          <p>Para começar a calcular seu lucro real, cadastre seu primeiro veículo.</p>
          <a href="#/veiculos" class="btn btn-primary">Cadastrar Veículo</a>
        </div>
      `;
      return;
    }

    const todayRange = Dates.getDateRange('today');
    const recordsToday = await RecordRepository.getByDateRange(todayRange.start, todayRange.end);
    const summaryToday = consolidatePeriod(recordsToday);

    const monthRange = Dates.getDateRange('month');
    const recordsMonth = await RecordRepository.getByDateRange(monthRange.start, monthRange.end);
    const summaryMonth = consolidatePeriod(recordsMonth);

    const status = getProfitabilityStatus(summaryToday.profitMargin, summaryToday.totalRevenueCents);

    container.innerHTML = `
      <section class="dashboard-section">
        <div class="period-selector">
          <button class="btn-chip active" data-period="today">Hoje</button>
          <button class="btn-chip" data-period="week">Semana</button>
          <button class="btn-chip" data-period="month">Mês</button>
        </div>

        <div class="status-banner" style="border-left: 5px solid ${status.color}">
          <span class="status-indicator" style="background-color: ${status.color}"></span>
          <div>
            <strong>Status de Rentabilidade:</strong> ${status.label}
            ${summaryToday.profitMargin !== null ? `<br><small>Margem Operacional: ${summaryToday.profitMargin.toFixed(1)}%</small>` : ''}
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card highlight">
            <span class="kpi-label">Lucro Econômico</span>
            <span class="kpi-value ${summaryToday.economicProfitCents >= 0 ? 'text-green' : 'text-red'}">
              ${Money.format(summaryToday.economicProfitCents)}
            </span>
            <span class="kpi-sub">Após todas as reservas e custos</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Dinheiro Livre Estimado</span>
            <span class="kpi-value">${Money.format(summaryToday.availableMoneyCents)}</span>
            <span class="kpi-sub">Faturamento (-) Combustível (-) Manutenção</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Faturamento Bruto</span>
            <span class="kpi-value">${Money.format(summaryToday.totalRevenueCents)}</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Reserva de Manutenção</span>
            <span class="kpi-value text-yellow">${Money.format(summaryToday.totalMaintCents)}</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Combustível Estimado</span>
            <span class="kpi-value">${Money.format(summaryToday.totalFuelCents)}</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Depreciação Veicular</span>
            <span class="kpi-value">${Money.format(summaryToday.totalDeprCents)}</span>
          </div>
        </div>

        <div class="quick-actions">
          <a href="#/novo" class="btn btn-primary btn-block">➕ Novo Lançamento de Trabalho</a>
        </div>
      </section>
    `;
  }
};
