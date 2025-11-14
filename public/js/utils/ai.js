// AI advice for patients based on recent readings and thresholds.
// Inputs are pure. Safe to reuse when we swap to a real backend.

import { categorizeByThresholds } from './units.js';

const LOW_ALERT = 70;   // from your notes

export function makeAiAdvice(readings = [], thresholds) {
  // Keep last 14 for simple frequency checks
  const last = readings
    .slice(-14)
    .map(r => ({ ...r, cat: categorizeByThresholds(r.valueMgdl, thresholds) }));

  const total = last.length;
  const counts = last.reduce((acc, r) => {
    acc[r.cat] = (acc[r.cat] || 0) + 1;
    return acc;
  }, {});

  const advice = [];

  // High frequency of abnormal
  if ((counts.Abnormal || 0) >= 3) {
    advice.push({
      level: 'warning',
      text: 'Multiple high readings in the last two weeks. Book a consult with your doctor and bring your notes on meals and activity.'
    });
  }

  // Borderline creeping up
  if ((counts.Borderline || 0) >= 4 && (counts.Abnormal || 0) <= 1) {
    advice.push({
      level: 'tip',
      text: 'Borderline values are frequent. Review portion sizes and timing of meals. A short walk after meals can help.'
    });
  }

  // Any low events
  if (last.some(r => r.valueMgdl <= LOW_ALERT)) {
    advice.push({
      level: 'caution',
      text: 'A low glucose event was detected. Keep fast-acting carbs handy and discuss prevention steps with your care team.'
    });
  }

  // Stable normal streak
  if (total >= 7 && (counts.Abnormal || 0) === 0 && (counts.Borderline || 0) <= 1) {
    advice.push({
      level: 'positive',
      text: 'Your readings are consistently within target. Keep your current routine and continue logging.'
    });
  }

  // If nothing else matched, give a helpful general nudge
  if (advice.length === 0) {
    advice.push({
      level: 'tip',
      text: 'Keep logging meals, activity, and symptoms. More complete logs improve your personal insights.'
    });
  }

  return advice;
}

export function adviceHtml(items = []) {
  const badge = lvl =>
    lvl === 'warning' ? 'b-bad'
    : lvl === 'caution' ? 'b-warn'
    : lvl === 'positive' ? 'b-ok'
    : 'b-warn';

  return items.map(a => `
    <div class="panel" style="padding:.8rem 1rem">
      <span class="badge ${badge(a.level)}" style="margin-right:.5rem">${a.level}</span>
      ${a.text}
    </div>
  `).join('');
}
