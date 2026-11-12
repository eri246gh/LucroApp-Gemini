// Trecho de atualização no js/router.js ou js/app.js
export function syncActiveNav(cleanPath) {
  const currentRoute = cleanPath.replace('/', '') || 'inicio';
  
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
    const page = el.getAttribute('data-page');
    if (page === currentRoute) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}
