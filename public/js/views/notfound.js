// public/js/views/notfound.js
// this function will render the not found page when user navigates to an unknown route
// which does not exist in the application
// the whole point of this code in the file is to show a user friendly message when the user
// tries to access a page that does not exist
export function renderNotFound(root){
  root.innerHTML = `
    <section class="panel">
      <h2>Page not found</h2>
      <p class="muted">The page you requested does not exist.</p>
      <p><a href="#/dashboard">Back to dashboard</a></p>
    </section>
  `;
}
