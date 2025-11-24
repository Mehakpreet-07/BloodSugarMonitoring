// public/js/state/store.js
import { me, login as apiLogin, logout as apiLogout } from '../api/auth.js';

export const store = {
  user: null,
  csrfToken: null, // New: Store the security token
  filters: { patient:'', category:'' },

  set(partial){
    Object.assign(this, partial);
    document.dispatchEvent(new Event('state:change'));
  },

  async hydrate(){
    try{
      const data = await me(); // returns { user, csrfToken }
      this.user = data.user || null;
      this.csrfToken = data.csrfToken || null; // Save token on load
    }catch{ 
      this.user = null; 
      this.csrfToken = null;
    }
    document.dispatchEvent(new Event('state:change'));
  },

  async login(email, password){
    const res = await apiLogin(email, password);
    if (!res.ok) return res;
    
    this.user = res.user; 
    this.csrfToken = res.csrfToken; // Save token on login
    
    document.dispatchEvent(new CustomEvent('auth:changed', { detail:this.user }));
    document.dispatchEvent(new Event('state:change'));
    return { ok:true };
  },

  async logout(){
    await apiLogout();
    this.user = null; 
    this.csrfToken = null;
    document.dispatchEvent(new CustomEvent('auth:changed', { detail:null }));
    document.dispatchEvent(new Event('state:change'));
  }
};