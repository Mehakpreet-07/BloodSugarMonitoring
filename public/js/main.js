import { mountHeader } from './components/header.js';
import { mountSidebar } from './components/sidebar.js';
import { router, goto } from './router.js';
import { store } from './state/store.js';

const app = document.getElementById('app');
app.innerHTML = `
  <div class="app">
    <aside id="side" class="side"></aside>
    <section id="main">
      <header id="head" class="head"></header>
      <main id="page" class="main"></main>
    </section>
  </div>
  <button id="themeToggle" aria-label="Toggle Dark Mode" title="Toggle Dark/Light Mode">🌙</button>
`;

mountHeader(document.getElementById('head'));
mountSidebar(document.getElementById('side'), (hash)=> goto(hash));

// ⭐ DARK MODE TOGGLE - LIGHT IS DEFAULT
const themeToggle = document.getElementById('themeToggle');

// Load saved theme or DEFAULT to LIGHT (not dark)
const savedTheme = localStorage.getItem('theme') || 'light'; // ⭐ DEFAULT: LIGHT
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  
  console.log(`Theme switched to: ${newTheme}`);
});

// Load session, then route
store.hydrate().then(()=> { 
  router();
  window.addEventListener('hashchange', router);
});