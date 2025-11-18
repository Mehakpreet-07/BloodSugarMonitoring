// this is for the use of DOM manipulation
// qs - querySelector, qsa - querySelectorAll, el - createElement
// upper line means that these are utility functions for DOM manipulation
export const qs  = (sel,root=document)=>root.querySelector(sel);
export const qsa = (sel,root=document)=>[...root.querySelectorAll(sel)];
export const el  = (tag,attrs={},html='')=>{
  const n=document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=> n.setAttribute(k,v));
  n.innerHTML=html; return n;
};
