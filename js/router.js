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

    // Atualiza o item ativo na Sidebar (Desktop) e Bottom Nav (Mobile)
    const currentRoute = cleanPath.replace('/', '') || 'inicio';
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
      const page = el.getAttribute('data-page');
      if (page === currentRoute) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    const handler = this.routes[cleanPath] || this.routes['/inicio'];
    // Suporte tanto ao container #app quanto ao #main-content
    const container = document.getElementById('app') || document.getElementById('main-content');
    
    if (handler && container) {
      container.innerHTML = '<div class="card"><p class="text-muted">Carregando...</p></div>';
      try {
        await handler(container);
      } catch (err) {
        console.error('Erro na navegação:', err);
        container.innerHTML = `<div class="card"><h3>Erro ao carregar página</h3><p class="text-red">${err.message}</p></div>`;
      }
    }
  },

  navigate(path) {
    window.location.hash = path;
  }
};
