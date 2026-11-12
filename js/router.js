import { DashboardModule } from './modules/dashboard.js';
import { RecordsModule } from './modules/records.js';

export const Router = {
  routes: {},

  register(path, handler) {
    this.routes[path] = handler;
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  },

  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/inicio';
    const cleanPath = hash.split('?')[0];

    // Atualizar links ativos na navegação
    document.querySelectorAll('.nav-item').forEach(el => {
      const page = el.getAttribute('data-page');
      if (`/${page}` === cleanPath || (page === 'novo' && cleanPath === '/novo')) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    const handler = this.routes[cleanPath] || this.routes['/inicio'];
    const container = document.getElementById('main-content');
    
    if (handler && container) {
      container.innerHTML = '<div class="loading-spinner">Carregando...</div>';
      try {
        await handler(container);
      } catch (err) {
        console.error('Erro na navegação:', err);
        container.innerHTML = `<div class="card error-card"><h3>Erro ao carregar página</h3><p>${err.message}</p></div>`;
      }
    }
  },

  navigate(path) {
    window.location.hash = path;
  }
};
