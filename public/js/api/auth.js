// Authentication API (mock-first; swaps to real endpoints when USE_MOCKS=false)
import { USE_MOCKS } from '../config.js';

const base = USE_MOCKS ? '' : '/api';
const LS_USERS   = 'bs_users_v1';
const LS_SESSION = 'bs_session_v1';

// seed a few users for mock mode (passwords are plain text for demo)
function seedMockUsers(){
  const existing = JSON.parse(localStorage.getItem(LS_USERS) || '[]');
  if (existing.length) return existing;

  const users = [
    { id: 1, role:'doctor', name:'Dr. A. Sharma', email:'dr@demo.test',     password:'demo' },
    { id: 2, role:'admin',  name:'Alex Morgan',   email:'admin@demo.test',  password:'demo' },
    { id: 3, role:'staff',  name:'Nurse J. Lee',  email:'staff@demo.test',  password:'demo' },
    { id: 4, role:'patient',name:'Bhavni R.',     email:'patient@demo.test', password:'demo', patientId: 2 }
  ];
  localStorage.setItem(LS_USERS, JSON.stringify(users));
  return users;
}

function mockUsers(){ return seedMockUsers(); }
function saveUsers(users){ localStorage.setItem(LS_USERS, JSON.stringify(users)); }
function saveSession(user){ localStorage.setItem(LS_SESSION, JSON.stringify(user)); }
function clearSession(){ localStorage.removeItem(LS_SESSION); }
function readSession(){ try { return JSON.parse(localStorage.getItem(LS_SESSION)||'null'); } catch { return null; } }

// ---- Public API

export async function me(){
  if (USE_MOCKS) return { user: readSession() };
  const r = await fetch(`${base}/auth/me`, { credentials:'include' });
  return r.json();
}

export async function login(email, password){
  if (USE_MOCKS){
    const user = mockUsers().find(u => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password);
    if (!user) return { ok:false, error:'Invalid credentials' };
    saveSession(user);
    return { ok:true, user };
  }
  const r = await fetch(`${base}/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include',
    body: JSON.stringify({ email, password })
  });
  return r.json();
}

export async function logout(){
  if (USE_MOCKS){ clearSession(); return { ok:true }; }
  const r = await fetch(`${base}/auth/logout`, { method:'POST', credentials:'include' });
  return r.json();
}

// Patient-only self registration
export async function registerPatient({ name, email, password }){
  if (USE_MOCKS){
    const users = mockUsers();
    if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase())){
      return { ok:false, error:'Email already registered' };
    }
    const nextId = users.reduce((m,u)=>Math.max(m,u.id),0)+1;
    const nextPid = (users.filter(u=>u.role==='patient').reduce((m,u)=>Math.max(m,u.patientId||0),0) || 0) + 1;
    const user = { id: nextId, role:'patient', name, email, password, patientId: nextPid };
    users.push(user); saveUsers(users);
    return { ok:true, user:{ id:user.id, role:user.role, name:user.name, email:user.email, patientId:user.patientId } };
  }
  const r = await fetch(`${base}/auth/register`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name, email, password })
  });
  return r.json();
}
