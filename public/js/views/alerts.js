// public/js/views/alerts.js

//import the functions taht fetches alerts (either from mock json files)
// or from the real backed API
import { listAlerts } from '../api/alerts.js';

//  renders the alert page UI and loads all the alert data 
// into table. applies filters (search and category)
// when any user clicks on "Apply" button

export async function renderAlerts(root){

  //insert the alert page layout in the root container
  // this builds the search bar, filters and the table structure
  root.innerHTML = `
    <section class="panel">
      <h2>Alerts</h2>
      <div class="tools">
        <input id="q" placeholder="Search patient…">
        <select id="cat">
          <option value="">All</option>
          <option>Abnormal</option>
          <option>Borderline</option>
          <option>Normal</option>
        </select>
        <button id="go" class="primary">Apply</button>
      </div>
      <table class="list">
        <thead><tr><th>When</th><th>Patient</th><th>Category</th><th>Note</th></tr></thead>
        <tbody id="body"></tbody>
      </table>
    </section>
  `;


  // returns the single HTML string representing one alert record
  // one alert object with {when, name ,cat, note }
  function row(a){
    return `
      <tr>
        <td>${a.when}</td>
        <td>${a.name}</td>
        <td><span class="pill p-${a.cat}">${a.cat}</span></td>
        <td>${a.note}</td>
      </tr>
    `;
  }

  // fetches teh alert from teh API with the selected filters and updates
  

  async function load(){

    //fetch teh alert data from API 
    // q- text in search input 
    // cat - selected category from the dropdown 
    //(abnormal/ borderline/ normal/ all)

    const data = await listAlerts({
      q:   document.getElementById('q').value,
      cat: document.getElementById('cat').value
    });
    //render each alert as table 
    document.getElementById('body').innerHTML = data.map(row).join('');
  }
  //when clicked teh apply button reload the results with new filters 
  document.getElementById('go').onclick = load;

  // load teh alerts immediately when the page firsts opens 
  load();
}
