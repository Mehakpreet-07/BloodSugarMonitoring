export const mgdlToMmol = v => +(v * 0.0555).toFixed(1);
export const mmolToMgdl = v => Math.round(v / 0.0555);

export function toDisplay(valueMgdl, unit){
  return unit === 'mmol' ? `${mgdlToMmol(valueMgdl)} mmol/L` : `${valueMgdl} mg/dL`;
}

export function categorizeByThresholds(valueMgdl, {normalMax, borderlineMax}){
  if (valueMgdl <= normalMax) return 'Normal';
  if (valueMgdl <= borderlineMax) return 'Borderline';
  return 'Abnormal';
}
