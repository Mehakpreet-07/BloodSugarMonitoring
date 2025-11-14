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
`;

mountHeader(document.getElementById('head'));
mountSidebar(document.getElementById('side'), (hash)=> goto(hash));

// load session, then route
store.hydrate().then(()=> {
  router();
  window.addEventListener('hashchange', router);
});
