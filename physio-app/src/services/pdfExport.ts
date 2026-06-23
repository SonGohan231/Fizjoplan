import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { RehabPlan, PlanExercise } from '../types';

// ---------------------------------------------------------------------------
// Builds a printable HTML version of a plan and exports it as a PDF the user
// can share/save. Polish, patient-facing, cautious language throughout.
// ---------------------------------------------------------------------------

const LEVEL_LABEL_PL: Record<string, string> = {
  easy: 'łatwy',
  medium: 'średni',
  advanced: 'zaawansowany',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function doseLine(pe: PlanExercise): string {
  const parts: string[] = [];
  parts.push(`${pe.sets} ${pe.sets === 1 ? 'seria' : 'serie'}`);
  if (pe.reps) parts.push(`${pe.reps} powtórzeń`);
  if (pe.duration_seconds) parts.push(`${Math.round(pe.duration_seconds / 60) || pe.duration_seconds}` +
    (pe.duration_seconds >= 60 ? ' min' : ' s'));
  return parts.join(' × ').replace(' × ', ' • ');
}

export function buildPlanHtml(plan: RehabPlan): string {
  const exercisesHtml = plan.exercises
    .map((pe, i) => {
      const ex = pe.exercise;
      return `
      <div class="ex">
        <h3>${i + 1}. ${escapeHtml(ex.title_pl)}</h3>
        <p class="dose">${doseLine(pe)} • ${escapeHtml(plan.weeklyFrequency_pl)}</p>
        <p>${escapeHtml(ex.description_pl)}</p>
        ${ex.progression ? `<p class="meta"><b>Progresja:</b> ${escapeHtml(ex.progression)}</p>` : ''}
        ${ex.regression ? `<p class="meta"><b>Regresja:</b> ${escapeHtml(ex.regression)}</p>` : ''}
      </div>`;
    })
    .join('');

  const redFlagsHtml = plan.redFlags.length
    ? `<div class="alert">
         <h2>⚠️ Objawy alarmowe</h2>
         <ul>${plan.redFlags.map((r) => `<li>${escapeHtml(r.message_pl)}</li>`).join('')}</ul>
       </div>`
    : '';

  return `<!doctype html><html lang="pl"><head><meta charset="utf-8">
  <style>
    * { font-family: -apple-system, Roboto, Arial, sans-serif; color: #1f2933; }
    body { padding: 28px; line-height: 1.45; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .sub { color: #52606d; font-size: 13px; margin-bottom: 16px; }
    h2 { font-size: 16px; margin: 22px 0 8px; border-bottom: 2px solid #e4e7eb; padding-bottom: 4px; }
    .ex { padding: 10px 0; border-bottom: 1px solid #eef1f4; }
    .ex h3 { font-size: 15px; margin: 0 0 2px; }
    .dose { color: #0b7285; font-weight: 600; margin: 2px 0 6px; font-size: 13px; }
    .meta { font-size: 12px; color: #52606d; margin: 2px 0; }
    ul { margin: 6px 0; padding-left: 18px; }
    li { margin: 3px 0; font-size: 13px; }
    .alert { background: #fff4e6; border: 1px solid #ffd8a8; border-radius: 8px; padding: 10px 14px; margin: 16px 0; }
    .alert h2 { border: none; color: #b54708; margin-top: 0; }
    .disclaimer { margin-top: 22px; font-size: 11px; color: #7b8794; font-style: italic; }
    .badge { display:inline-block; background:#e7f5ff; color:#0b7285; padding:2px 8px; border-radius:10px; font-size:12px; }
  </style></head><body>
    <h1>Propozycja ćwiczeń</h1>
    <div class="sub">Poziom: <span class="badge">${LEVEL_LABEL_PL[plan.level]}</span> •
      Wygenerowano: ${new Date(plan.generatedAt).toLocaleDateString('pl-PL')}</div>

    <h2>Podsumowanie</h2>
    <p>${escapeHtml(plan.problemSummary_pl)}</p>

    ${redFlagsHtml}

    <h2>Uwagi bezpieczeństwa</h2>
    <ul>${plan.safetyNotes_pl.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>

    <h2>Ćwiczenia</h2>
    ${exercisesHtml}

    <h2>Częstotliwość i progresja</h2>
    <p><b>Tygodniowo:</b> ${escapeHtml(plan.weeklyFrequency_pl)}</p>
    <p>${escapeHtml(plan.progressionAdvice_pl)}</p>

    <h2>Kiedy przerwać i skonsultować się</h2>
    <ul>${plan.stopWarningSigns_pl.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>

    <p class="disclaimer">${escapeHtml(plan.disclaimer_pl)}</p>
  </body></html>`;
}

/** Generate the PDF and open the share sheet. Returns the file URI. */
export async function exportPlanToPdf(plan: RehabPlan): Promise<string> {
  const html = buildPlanHtml(plan);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Plan ćwiczeń (PDF)',
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}

// ---------------------------------------------------------------------------
// Patient-friendly variant: simpler, larger type, no engine jargon — just what
// the patient needs to do at home, plus the key safety lines.
// ---------------------------------------------------------------------------
export function buildPatientHtml(plan: RehabPlan): string {
  const exercises = plan.exercises
    .map((pe, i) => {
      const ex = pe.exercise;
      return `
      <div class="card">
        <div class="num">${i + 1}</div>
        <div>
          <h3>${escapeHtml(ex.title_pl)}</h3>
          <p class="dose">${doseLine(pe)} • ${escapeHtml(plan.weeklyFrequency_pl)}</p>
          <p>${escapeHtml(ex.description_pl)}</p>
          ${pe.note_pl ? `<p class="tip">${escapeHtml(pe.note_pl)}</p>` : ''}
        </div>
      </div>`;
    })
    .join('');

  const redFlags = plan.redFlags.length
    ? `<div class="warn"><b>Uwaga:</b><ul>${plan.redFlags.map((r) => `<li>${escapeHtml(r.message_pl)}</li>`).join('')}</ul></div>`
    : '';

  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>
    * { font-family: -apple-system, Roboto, Arial, sans-serif; color:#1f2933; }
    body { padding: 30px; line-height: 1.5; }
    h1 { font-size: 24px; color:#0b7285; margin:0 0 2px; }
    .sub { color:#52606d; font-size:13px; margin-bottom:18px; }
    .card { display:flex; gap:14px; padding:14px 0; border-bottom:1px solid #eef1f4; }
    .num { width:30px; height:30px; flex:0 0 30px; background:#0b7285; color:#fff; border-radius:50%; text-align:center; line-height:30px; font-weight:700; }
    h3 { font-size:17px; margin:0 0 3px; }
    .dose { color:#0b7285; font-weight:600; font-size:14px; margin:2px 0 6px; }
    .tip { font-size:13px; color:#52606d; font-style:italic; }
    .warn { background:#fff4e6; border:1px solid #ffd8a8; border-radius:8px; padding:12px 16px; margin:14px 0; color:#b54708; }
    .warn ul { margin:6px 0 0; padding-left:18px; }
    .foot { margin-top:24px; font-size:12px; color:#7b8794; }
  </style></head><body>
    <h1>Twój plan ćwiczeń</h1>
    <div class="sub">Wygenerowano: ${new Date(plan.generatedAt).toLocaleDateString('pl-PL')}</div>
    ${redFlags}
    <p>${escapeHtml(plan.problemSummary_pl)}</p>
    ${exercises}
    <div class="warn"><b>Przerwij i skonsultuj się, jeśli:</b><ul>${plan.stopWarningSigns_pl.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>
    <p class="foot">${escapeHtml(plan.disclaimer_pl)}</p>
  </body></html>`;
}

export async function exportPatientPlanToPdf(plan: RehabPlan): Promise<string> {
  const html = buildPatientHtml(plan);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Plan dla pacjenta (PDF)', UTI: 'com.adobe.pdf' });
  }
  return uri;
}
