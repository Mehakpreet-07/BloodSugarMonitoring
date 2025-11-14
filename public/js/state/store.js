import { me, login as apiLogin, logout as apiLogout } from '../api/auth.js';

export const store = {
  user: null,                 // { id, role, name, email, ... }
  filters: { patient:'', category:'' },

  set(partial){
    Object.assign(this, partial);
    document.dispatchEvent(new Event('state:change'));
  },

  async hydrate(){
    try{
      const { user } = await me();
      this.user = user || null;
    }catch{ this.user = null; }
    document.dispatchEvent(new Event('state:change'));
  },

  async login(email, password){
    const res = await apiLogin(email, password);
    if (!res.ok) return res;
    this.user = res.user; document.dispatchEvent(new CustomEvent('auth:changed', { detail:this.user }));
    document.dispatchEvent(new Event('state:change'));
    return { ok:true };
  },

  async logout(){
    await apiLogout();
    this.user = null; document.dispatchEvent(new CustomEvent('auth:changed', { detail:null }));
    document.dispatchEvent(new Event('state:change'));
  }
};
