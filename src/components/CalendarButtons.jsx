import { googleCalUrl, telechargerIcs } from '../lib/helpers'

// Bloc calendrier réutilisable (fiche + carte).
// 2 options fiables : Google Agenda (lien direct) et fichier .ics universel
// (Outlook perso/pro, Apple, etc. — s'ouvre pré-rempli).
export default function CalendarButtons({ inter, passage }) {
  if (!passage || !passage.date_inter) return null
  return (
    <div style={{ background: '#eaf4ff', border: '1px solid #d4e7fb', borderRadius: 12, padding: '10px 12px' }}
      onClick={e => e.stopPropagation()}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1c6fc0' }}>Ajouter cette date à mon agenda</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink2)', marginBottom: 8 }}>Choisissez votre agenda :</div>
      <a className="btn ghost full" style={{ fontSize: 13, textDecoration: 'none', textAlign: 'left', display: 'block', background: '#fff' }}
        href={googleCalUrl(inter, passage)} target="_blank" rel="noreferrer">
        🟦 Google Agenda / Gmail <span style={{ color: 'var(--ink2)', fontSize: 11 }}>· ajout direct</span>
      </a>
      <button className="btn ghost full" style={{ fontSize: 13, textAlign: 'left', marginTop: 6, background: '#fff' }}
        onClick={() => telechargerIcs(inter, passage)}>
        📅 Outlook / Apple / autre <span style={{ color: 'var(--ink2)', fontSize: 11 }}>· fichier à ouvrir</span>
      </button>
    </div>
  )
}
