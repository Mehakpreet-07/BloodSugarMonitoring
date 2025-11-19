import { mountHeader } from './components/header.js';
import { mountSidebar } from './components/sidebar.js';
import { router, goto } from './router.js';
import { store } from './state/store.js'; //save and load the user data

const app = document.getElementById('app');// html that will appear on ther screen
app.innerHTML = `
  <div class="app">
    <aside id="side" class="side"></aside>
    <section id="main">
      <header id="head" class="head"></header>
      <main id="page" class="main"></main>
    </section>
  </div>
`;

mountHeader(document.getElementById('head')); // calling events for header
mountSidebar(document.getElementById('side'), (hash)=> goto(hash));// when # will change maens not full side but ome parts

// load session, then the route when the hash will change
store.hydrate().then(()=> { 
  router();
  window.addEventListener('hashchange', router);
});
