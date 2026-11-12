import { Router } from './router.js';
import { DashboardModule } from './modules/dashboard.js';
import { RecordsModule } from './modules/records.js';
import { VehiclesModule } from './modules/vehicles.js';
import { FuelModule } from './modules/fuel.js';
import { ReportsModule } from './modules/reports.js';
import { BackupModule } from './modules/backup.js';
import { VehicleRepository } from './database/repositories.js';
import { openDatabase } from './database/database.js';

class App {
  static settings = {
    theme: 'light',
    greenThreshold: 20,
    yellowThreshold: 0
  };

  static async init() {
    await this.loadSettings();
    this.applyTheme(this.settings.theme);
    this.setupThemeToggle();
    this.setupNetworkListeners();
    this.registerServiceWorker();
    await this.updateHeaderBadge();

    Router.register('/inicio', (c) => DashboardModule.render(c, this.settings));
    Router.register('/historico', (c) => RecordsModule.renderHistory(c, this.settings));
    Router.register('/novo', (c) => RecordsModule.renderForm(c, () => Router.navigate('/inicio')));
    Router.register('/veiculos', (c) => VehiclesModule.render(c));
    Router.register('/abastecimentos', (c) => FuelModule.render(c));
    Router.register('/relatorios', (c) => ReportsModule.render(c));
    Router.register('/mais', (c) => this.renderMais(c));

    Router.init();
  }

  static async loadSettings() {
    try {
      const localTheme = localStorage.getItem('lucroapp_theme');
      if (localTheme === 'night' || localTheme === 'light') {
        this.settings.theme = localTheme;
      }
      const db = await openDatabase();
      const saved = await new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const req = tx.objectStore('settings').get('app_preferences');
        req.onsuccess = () => resolve(req.result?.value);
        req.onerror = () => resolve(null);
      });
      if (saved) this.settings = { ...this.settings, ...saved };
    } catch {
      // Usa configuração padrão
    }
  }

  static async saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem('lucroapp_theme', this.settings.theme);
    } catch {}
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const req = tx.objectStore('settings').put({ key: 'app_preferences', value: this.settings });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  static applyTheme(theme) {
    const isNight = theme === 'night';
    document.documentElement.classList.toggle('night-mode', isNight);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', isNight ? '#09090B' : '#FFFFFF');
  }

  static setupThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const nextTheme = this.settings.theme === 'night' ? 'light' : 'night';
      this.applyTheme(nextTheme);
      await this.saveSettings({ theme: nextTheme });
      const select = document.getElementById('cfg-theme');
      if (select) select.value = nextTheme;
    });
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
      badge.className = 'pill pill-outline';
    } else {
      badge.textContent = 'Cadastrar Veículo';
      badge.className = 'pill pill-dashed';
    }
  }

  static async renderMais(container) {
    container.innerHTML = `
      <section class="stack-md" aria-labelledby="mais-heading">
        <div class="page-header">
          <div class="stack-xs">
            <span class="eyebrow">Sistema e Dados</span>
            <h1 id="mais-heading" class="page-title">Ajustes e Ferramentas</h1>
          </div>
        </div>

        <div class="grid-12">
          <div class="surface col-6 stack-sm">
            <h2 class="section-title">Operação</h2>
            <a href="#/veiculos" class="btn btn-secondary">Gerenciar Veículos</a>
            <a href="#/abastecimentos" class="btn btn-secondary">Registros de Abastecimento</a>
            <a href="#/relatorios" class="btn btn-secondary">Relatórios Analíticos</a>
          </div>

          <form id="settings-form" class="surface col-6 stack-sm">
            <h2 class="section-title">Aparência e Parâmetros</h2>
            <div class="form-group">
              <label for="cfg-theme">Modo de Exibição</label>
              <select id="cfg-theme">
                <option value="light" ${this.settings.theme === 'light' ? 'selected' : ''}>Modo Claro (Preto no Branco)</option>
                <option value="night" ${this.settings.theme === 'night' ? 'selected' : ''}>Modo Noturno (Branco no Preto)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="cfg-green">Limiar de Alta Rentabilidade (%)</label>
              <input type="number" step="1" min="1" max="100" id="cfg-green" value="${this.settings.greenThreshold}" required>
            </div>
            <button type="submit" class="btn btn-primary">Salvar Preferências</button>
            <div id="cfg-feedback" class="notice notice-strong hidden" role="status">Preferências salvas.</div>
          </form>

          <div class="surface col-6 stack-sm">
            <h2 class="section-title">Backup Local (JSON)</h2>
            <p class="metric-note">Seus registros ficam armazenados apenas neste navegador. Exporte cópias periódicas para evitar perda ao limpar dados do dispositivo.</p>
            <button type="button" id="btn-export" class="btn btn-secondary">Exportar Arquivo JSON</button>
            <label class="btn btn-secondary">
              Restaurar Arquivo JSON
              <input type="file" id="input-import" accept=".json" class="hidden">
            </label>
          </div>

          <div class="surface col-6 stack-sm">
            <h2 class="section-title">Privacidade e Limpeza</h2>
            <p class="metric-note">Nenhuma informação financeira ou localização é transmitida para servidores externos.</p>
            <button type="button" id="btn-wipe-data" class="btn btn-danger">Apagar Todos os Dados Locais</button>
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

    container.querySelector('#btn-wipe-data').addEventListener('click', () => {
      if (confirm('Confirmar exclusão permanente de todos os veículos, lançamentos e abastecimentos?')) {
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
