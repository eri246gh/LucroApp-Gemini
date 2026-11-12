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

    const currentRoute = cleanPath.replace('/', '') || 'inicio';
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
      const page = el.getAttribute('data-page');
      el.classList.toggle('active', page === currentRoute);
    });

    const handler = this.routes[cleanPath] || this.routes['/inicio'];
    const container = document.getElementById('app');

    if (handler && container) {
      container.classList.remove('view-transition');
      void container.offsetWidth;
      container.classList.add('view-transition');

      try {
        await handler(container);
      } catch (err) {
        console.error('Erro na navegação:', err);
        container.innerHTML = `<div class="surface"><h2>Erro ao carregar tela</h2><p class="text-muted">${err.message}</p></div>`;
      }
    }
  },

  navigate(path) {
    window.location.hash = path;
  }
};
