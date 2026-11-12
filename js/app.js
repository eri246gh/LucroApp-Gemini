import { Router } from './router.js';
import { DashboardModule } from './modules/dashboard.js';
import { RecordsModule } from './modules/records.js';
import { CofrinhoModule } from './modules/cofrinho.js';
import { VehiclesModule } from './modules/vehicles.js';
import { FuelModule } from './modules/fuel.js';
import { ReportsModule } from './modules/reports.js';
import { BackupModule } from './modules/backup.js';
import { VehicleRepository } from './database/repositories.js';

class App {
  static async init() {
    this.registerServiceWorker();
    this.updateHeaderBadge();
    
    // Registrar Rotas
    Router.register('/inicio', (c) => DashboardModule.render(c));
    Router.register('/cofrinho', (c) => CofrinhoModule.render(c));
    Router.register('/veiculos', (c) => VehiclesModule.render(c));
    Router.register('/abastecimentos', (c) => FuelModule.render(c));
    Router.register('/relatorios', (c) => ReportsModule.render(c));
    
    Router.register('/mais', (c) => this.renderMais(c));
    Router.register('/novo', (c) => this.renderNovo(c));

    Router.init();
  }

  static async updateHeaderBadge() {
    const badge = document.getElementById('active-vehicle-badge');
    if (!badge) return;
    const vehicles = await VehicleRepository.getAll();
    const active = vehicles.find(v => v.active);
    if (active) {
      badge.textContent = `🚘 ${active.brand} ${active.model}`;
      badge.className = 'badge badge-success';
    } else {
      badge.textContent = 'Nenhum Veículo';
      badge.className = 'badge badge-warning';
    }
  }

  static async renderMais(container) {
    container.innerHTML = `
      <section class="more-section">
        <h2>Mais Opções</h2>
        <div class="menu-list">
          <a href="#/veiculos" class="menu-item">🚘 Meus Veículos</a>
          <a href="#/abastecimentos" class="menu-item">⛽ Registros de Abastecimento</a>
          <a href="#/relatorios" class="menu-item">📈 Relatórios Financeiros</a>
          
          <div class="card backup-card">
            <h3>Backup e Restauração</h3>
            <p>Guarde seus dados em segurança ou restaure de um arquivo salvo.</p>
            <div class="button-group">
              <button id="btn-export" class="btn btn-secondary">📥 Exportar Backup (JSON)</button>
              <label class="btn btn-secondary">
                📤 Restaurar Backup
                <input type="file" id="input-import" accept=".json" class="hidden">
              </label>
            </div>
          </div>
        </div>
      </section>
    `;

    container.querySelector('#btn-export')?.addEventListener('click', () => BackupModule.exportData());
    container.querySelector('#input-import')?.addEventListener('change', (e) => {
      if (e.target.files.length) BackupModule.restoreData(e.target.files[0]);
    });
  }

  static async renderNovo(container) {
    const vehicles = await VehicleRepository.getAll();
    if (!vehicles.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Cadastre um veículo primeiro</h3>
          <p>Você precisa ter pelo menos um veículo ativo para registrar jornadas de trabalho.</p>
          <a href="#/veiculos" class="btn btn-primary">Cadastrar Veículo</a>
        </div>
      `;
      return;
    }

    const activeVehicle = vehicles.find(v => v.active) || vehicles[0];

    container.innerHTML = `
      <section class="record-form-section card">
        <h2>Lançar Trabalho</h2>
        <form id="work-form">
          <div class="form-group">
            <label>Veículo Utilizado</label>
            <select id="w-vehicle">
              ${vehicles.map(v => `<option value="${v.id}" ${v.id === activeVehicle.id ? 'selected' : ''}>${v.brand} ${v.model}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Data do Trabalho</label>
            <input type="date" id="w-date" value="${new Date().toISOString().split('T')[0]}" required>
          </div>

          <div class="form-group">
            <label>Modo de Lançamento</label>
            <select id="w-mode">
              <option value="full_day">Dia Completo</option>
              <option value="shift">Por Turno</option>
            </select>
          </div>

          <div class="form-group hidden" id="shift-group">
            <label>Turno</label>
            <select id="w-shift">
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Noite">Noite</option>
              <option value="Madrugada">Madrugada</option>
            </select>
          </div>

          <div class="form-group">
            <label>Faturamento Bruto (R$)</label>
            <input type="number" step="0.01" id="w-revenue" required placeholder="Ex: 350.00">
          </div>

          <div class="form-group">
            <label>Quilometragem Rodada (km)</label>
            <input type="number" step="0.1" id="w-km" required placeholder="Ex: 150">
          </div>

          <button type="submit" class="btn btn-primary btn-block">Salvar Lançamento</button>
        </form>
      </section>
    `;

    const modeSelect = container.querySelector('#w-mode');
    const shiftGroup = container.querySelector('#shift-group');

    modeSelect.addEventListener('change', () => {
      if (modeSelect.value === 'shift') {
        shiftGroup.classList.remove('hidden');
      } else {
        shiftGroup.classList.add('hidden');
      }
    });

    container.querySelector('#work-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await RecordsModule.submitRecord({
          vehicleId: document.getElementById('w-vehicle').value,
          date: document.getElementById('w-date').value,
          mode: document.getElementById('w-mode').value,
          shift: document.getElementById('w-shift').value,
          revenueReal: parseFloat(document.getElementById('w-revenue').value),
          distanceKm: parseFloat(document.getElementById('w-km').value)
        });
        alert('Lançamento salvo com sucesso!');
        Router.navigate('/inicio');
      } catch (err) {
        alert(err.message);
      }
    });
  }

  static registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => console.error('Erro no SW:', err));
    }
  }
}

document.addEventListener('DOMContentLoaded', () => App.init());
