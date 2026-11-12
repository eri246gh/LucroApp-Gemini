import { Router } from './router.js';
import { DashboardModule } from './modules/dashboard.js';
import { RecordsModule } from './modules/records.js';
import { CofrinhoModule } from './modules/cofrinho.js';
import { VehiclesModule } from './modules/vehicles.js';
import { FuelModule } from './modules/fuel.js';
import { ReportsModule } from './modules/reports.js';
import { BackupModule } from './modules/backup.js';
import { VehicleRepository } from './database/repositories.js';
import { openDatabase } from './database/database.js';

class App {
  static settings = {
    theme: 'dark',
    greenThreshold: 20,
    yellowThreshold: 0
  };

  static async init() {
    await this.loadSettings();
    this.applyTheme(this.settings.theme);
    this.setupNetworkListeners();
    this.registerServiceWorker();
    await this.updateHeaderBadge();

    Router.register('/inicio', (c) => DashboardModule.render(c, this.settings));
    Router.register('/historico', (c) => RecordsModule.renderHistory(c, this.settings));
    Router.register('/novo', (c) => RecordsModule.renderForm(c, () => Router.navigate('/inicio')));
    Router.register('/cofrinho', (c) => CofrinhoModule.render(c));
    Router.register('/veiculos', (c) => VehiclesModule.render(c));
    Router.register('/abastecimentos', (c) => FuelModule.render(c));
    Router.register('/relatorios', (c) => ReportsModule.render(c));
    Router.register('/mais', (c) => this.renderMais(c));

    Router.init();
  }

  static async loadSettings() {
    try {
      const db = await openDatabase();
      const saved = await new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get('app_preferences');
        req.onsuccess = () => resolve(req.result?.value);
        req.onerror = () => resolve(null);
      });
      if (saved) this.settings = { ...this.settings, ...saved };
    } catch {
      // Fallback para configurações padrão
    }
  }

  static async saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const req = tx.objectStore('settings').put({ key: 'app_preferences', value: this.settings });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  static applyTheme(theme) {
    document.body.classList.toggle('light-theme', theme === 'light');
    document.body.classList.toggle('dark-theme', theme !== 'light');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#F4F6F5' : '#111612');
  }

  static setupNetworkListeners() {
    const indicator = document.getElementById('offline-indicator');
    const syncStatus = () => {
      if (!indicator) return;
      indicator.classList.toggle('hidden', navigator.onLine);
    };
    window.addEventListener('online', syncStatus);
    window.addEventListener('offline', syncStatus);
    syncStatus();
  }

  static async updateHeaderBadge() {
    const badge = document.getElementById('active-vehicle-badge');
    if (!badge) return;
    const vehicles = await VehicleRepository.getAll();
    const active = vehicles.find(v => v.active) || vehicles[0];
    if (active) {
      badge.textContent = `${active.brand} ${active.model}`;
      badge.className = 'badge badge-success';
    } else {
      badge.textContent = 'Cadastrar Veículo';
      badge.className = 'badge badge-warning';
    }
  }

  static async renderMais(container) {
    container.innerHTML = `
      <section class="stack-md" aria-labelledby="mais-heading">
        <div class="page-header">
          <h1 id="mais-heading" class="page-title">Ferramentas e Configurações</h1>
        </div>

        <div class="grid-12">
          <div class="col-12 col-6">
            <div class="card stack-sm">
              <h2>Módulos Operacionais</h2>
              <a href="#/veiculos" class="btn btn-secondary">Meus Veículos e Parâmetros</a>
              <a href="#/abastecimentos" class="btn btn-secondary">Controle de Abastecimentos</a>
              <a href="#/relatorios" class="btn btn-secondary">Relatórios Avançados</a>
            </div>
          </div>

          <div class="col-12 col-6">
            <form id="settings-form" class="card stack-sm">
              <h2>Aparência e Rentabilidade</h2>
              <div class="form-group">
                <label for="cfg-theme">Tema da Interface</label>
                <select id="cfg-theme">
                  <option value="dark" ${this.settings.theme === 'dark' ? 'selected' : ''}>Escuro (Padrão)</option>
                  <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Claro</option>
                </select>
              </div>
              <div class="form-group">
                <label for="cfg-green">Margem Verde — Alta Rentabilidade (%)</label>
                <input type="number" step="1" min="1" max="100" id="cfg-green" value="${this.settings.greenThreshold}" required>
              </div>
              <button type="submit" class="btn btn-primary">Salvar Preferências</button>
              <div id="cfg-feedback" class="alert-box alert-success hidden" role="status">Preferências atualizadas.</div>
            </form>
          </div>

          <div class="col-12 col-6">
            <div class="card stack-sm">
              <h2>Backup e Restauração (JSON)</h2>
              <p class="field-hint">O arquivo JSON contém seus dados financeiros pessoais. Limpar os dados do navegador apaga os registros locais se não houver backup.</p>
              <button type="button" id="btn-export" class="btn btn-secondary">Exportar Backup Completo</button>
              <label class="btn btn-secondary">
                Restaurar Backup JSON
                <input type="file" id="input-import" accept=".json" class="hidden">
              </label>
            </div>
          </div>

          <div class="col-12 col-6">
            <div class="card stack-sm">
              <h2>Privacidade e Dados Locais</h2>
              <p class="field-hint">O LucroApp funciona 100% no seu dispositivo. Nenhum dado financeiro ou localização é enviado a servidores externos.</p>
              <button type="button" id="btn-wipe-data" class="btn btn-danger">Apagar Todos os Dados Locais</button>
            </div>
          </div>
        </div>
      </section>
    `;

    container.querySelector('#settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const theme = document.getElementById('cfg-theme').value;
      const greenThreshold = parseFloat(document.getElementById('cfg-green').value) || 20;
      await this.saveSettings({ theme, greenThreshold });
      this.applyTheme(theme);
      container.querySelector('#cfg-feedback').classList.remove('hidden');
    });

    container.querySelector('#btn-export').addEventListener('click', () => BackupModule.exportData());
    container.querySelector('#input-import').addEventListener('change', (e) => {
      if (e.target.files.length) BackupModule.restoreData(e.target.files[0]);
    });

    container.querySelector('#btn-wipe-data').addEventListener('click', async () => {
      if (confirm('ATENÇÃO: Isso apagará permanentemente todos os veículos, lançamentos, abastecimentos e o cofrinho. Deseja continuar?')) {
        indexedDB.deleteDatabase('LucroAppDB');
        window.location.hash = '/inicio';
        window.location.reload();
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
