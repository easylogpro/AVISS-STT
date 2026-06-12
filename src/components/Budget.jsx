import { useMemo } from 'react'
import { useBudgetAdmin } from '../hooks/useBudgetAdmin'
import { eur } from '../lib/helpers'

const ANNEE = new Date().getFullYear()

export default function Budget() {
  const { rows, loading } = useBudgetAdmin()

  const calc = useMemo(() => {
    // Par sous-traitant : coût annuel, MO vendue annuelle, ratio
    const parST = {}
    const parMois = {}     // coût ST par mois (année courante)
    let coutTotal = 0, moTotal = 0

    for (const r of rows) {
      const cout = Number(r.budget) || 0
      const mo = Number(r.mo_vendue) || 0
      const nom = r.sous_traitant || '—'
      const annee = r.date_inter ? Number(r.date_inter.slice(0, 4)) : null

      if (!parST[nom]) parST[nom] = { cout: 0, mo: 0, nb: 0 }
      // ratio annuel : on cumule sur l'année courante
      if (annee === ANNEE || !r.date_inter) {
        parST[nom].cout += cout
        parST[nom].mo += mo
        parST[nom].nb += 1
        coutTotal += cout
        moTotal += mo
      }
      if (r.date_inter && annee === ANNEE) {
        const m = r.date_inter.slice(0, 7)
        parMois[m] = (parMois[m] || 0) + cout
      }
    }

    const listeST = Object.entries(parST)
      .map(([nom, v]) => ({
        nom, ...v,
        ratio: v.mo > 0 ? Math.round(v.cout / v.mo * 100) : null
      }))
      .sort((a, b) => b.cout - a.cout)

    const listeMois = Object.entries(parMois).sort((a, b) => a[0].localeCompare(b[0]))
    const ratioGlobal = moTotal > 0 ? Math.round(coutTotal / moTotal * 100) : null

    return { listeST, listeMois, coutTotal, moTotal, ratioGlobal }
  }, [rows])

  if (loading) return <div className="body"><div className="empty">Chargement…</div></div>

  const maxMois = Math.max(1, ...calc.listeMois.map(([, v]) => v))

  return (
    <div className="body">
      <div className="page-h">Budget sous-traitance</div>
      <p className="pagesub">Coût ST et ratio main d'œuvre — année {ANNEE}.</p>

      {/* Synthèse année */}
      <div className="bcard">
        <h4>Synthèse {ANNEE}</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'var(--ink2)', fontWeight: 600 }}>Coût ST total</span>
          <span style={{ fontWeight: 800, color: 'var(--blue)' }}>{eur(calc.coutTotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'var(--ink2)', fontWeight: 600 }}>MO vendue totale</span>
          <span style={{ fontWeight: 800 }}>{eur(calc.moTotal)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed var(--line)', paddingTop: 8 }}>
          <span style={{ color: 'var(--ink2)', fontWeight: 700 }}>Ratio coût / MO</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: ratioColor(calc.ratioGlobal) }}>
            {calc.ratioGlobal != null ? calc.ratioGlobal + ' %' : '—'}
          </span>
        </div>
      </div>

      {/* Ratio par sous-traitant */}
      <div className="bcard">
        <h4>Par sous-traitant (année {ANNEE})</h4>
        {calc.listeST.length === 0 && <div className="empty">Aucune donnée.</div>}
        {calc.listeST.map(s => (
          <div key={s.nom} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>{s.nom}</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: ratioColor(s.ratio) }}>
                {s.ratio != null ? s.ratio + ' %' : 'MO non saisie'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 12.5, color: 'var(--ink2)' }}>
              <span>Coût : <strong style={{ color: 'var(--blue)' }}>{eur(s.cout)}</strong></span>
              <span>MO : <strong>{eur(s.mo)}</strong></span>
              <span>{s.nb} inter.</span>
            </div>
          </div>
        ))}
        <p style={{ fontSize: 11.5, color: 'var(--ink2)', marginTop: 10 }}>
          Ratio = coût sous-traitant ÷ main d'œuvre vendue. Plus c'est bas, mieux c'est.
        </p>
      </div>

      {/* Coût par mois */}
      <div className="bcard">
        <h4>Coût ST par mois ({ANNEE})</h4>
        {calc.listeMois.length === 0 && <div className="empty">Aucune date posée cette année.</div>}
        {calc.listeMois.map(([m, v]) => (
          <div className="barrow" key={m}>
            <span>{m}</span>
            <div className="bar"><span style={{ width: (v / maxMois * 100) + '%' }} /></div>
            <span className="bval">{eur(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// vert si bas, orange si moyen, rouge si élevé
function ratioColor(r) {
  if (r == null) return 'var(--ink2)'
  if (r <= 40) return '#1f8a4c'
  if (r <= 60) return '#e08a2b'
  return '#e23b2e'
}
