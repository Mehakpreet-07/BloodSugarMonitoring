export const qs  = (sel,root=document)=>root.querySelector(sel);
export const qsa = (sel,root=document)=>[...root.querySelectorAll(sel)];
export const el  = (tag,attrs={},html='')=>{
  const n=document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=> n.setAttribute(k,v));
  n.innerHTML=html; return n;
};
