// BloodSugarMonitoring/public/js/state/store.js
// me : Get current authenticated user
// login(email, password) : Authenticate user
// logout() : End user session
import { me, login as apiLogin, logout as apiLogout } from '../api/auth.js';
// Centralized application state store
export const store = {
  user: null,                 // { id, role, name, email, ... }
  filters: { patient:'', category:'' },
// Update state with partial data and notify listeners                      
  set(partial){
    Object.assign(this, partial);
    document.dispatchEvent(new Event('state:change'));
  },
//restores the user session
  async hydrate(){
    try{
      const { user } = await me();
      this.user = user || null;
    }catch{ this.user = null; }
    document.dispatchEvent(new Event('state:change'));
  },
// Authenticate user and update state
  async login(email, password){
    const res = await apiLogin(email, password);
    if (!res.ok) return res;
    this.user = res.user; document.dispatchEvent(new CustomEvent('auth:changed', { detail:this.user }));
    document.dispatchEvent(new Event('state:change'));
    return { ok:true };
  },
// End user session and update state
  async logout(){
    await apiLogout();
    this.user = null; document.dispatchEvent(new CustomEvent('auth:changed', { detail:null }));
    document.dispatchEvent(new Event('state:change'));
  }
};
