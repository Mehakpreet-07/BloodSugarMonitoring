//import teh flag that tells teh app whther to use mock JSOn files 
//or the real backend API endpoints

import { USE_MOCKS } from '../config.js';

// decides the base URL depending on the mode
// if true uses "mock" folder
// if false uses AP backend routes "
const base = USE_MOCKS ? 'mock' : '/api';

//fetch the list of all alerts both from the mock file or API  
//params optional filters to pass as query string 
// Returns : array of alerts 


export async function listAlerts(params = {}) {

  //convert the params into query string 
  const q = new URLSearchParams(params).toString();

  // buld final URL based on whther the APP is using mocks or API

  const url = USE_MOCKS ? `${base}/alerts.json` : `${base}/alerts?${q}`;

  // fetch data from teh URL 
  const r = await fetch(url);

  // if http request failed it will show the errors 
  if (!r.ok) throw new Error('alerts fetch failed');

  // return the data as JSON 
  return r.json();
}

//get teh alerts that belong to one specific patient 
// will load teh alerts firts 
//(either from the mock file of API)
// filter the alerts by matching patientID

export async function listPatientAlerts(patientId){

  //load the  alerts fromlistAlterts function 
  const all = await listAlerts();
  
  // filter the alerts where the alert.patientID matches teh given ID 
  return all.filter(a => String(a.patientId) === String(patientId));
}
