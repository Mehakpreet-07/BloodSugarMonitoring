// public/js/views/notfound.js
export function renderNotFound(root){
  root.innerHTML = `
    <section class="panel">
      <h2>Page not found</h2>
      <p class="muted">The page you requested does not exist.</p>
      <p><a href="#/dashboard">Back to dashboard</a></p>
    </section>
  `;
}
