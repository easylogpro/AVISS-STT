import { useMemo } from 'react'
import { eur } from '../lib/helpers'

export default function Budget({ items }) {
  const { parST, parPeriode, total } = useMemo(() => {
    const st = {}, per = {}
    let total = 0
    for (const i of items) {
      const b = Number(i.budget) || 0
      total += b
      const nom = i.sous_traitants?.nom || '—'
      st[nom] = (st[nom] || 0) + b
      if (i.date_inter) {
        const p = i.date_inter.slice(0, 7) // YYYY-MM
        per[p] = (per[p] || 0) + b
      }
    }
    const parST = Object.entries(st).sort((a, b) => b[1] - a[1])
    const parPeriode = Object.entries(per).sort((a, b) => a[0].localeCompare(b[0]))
    return { parST, parPeriode, total }
  }, [items])

  const maxST = Math.max(1, ...parST.map(([, v]) => v))
  const maxPer = Math.max(1, ...parPeriode.map(([, v]) => v))

  return (
    <div className="body">
      <div className="page-h">Budget sous-traitance</div>
      <p className="pagesub">Coûts cumulés des interventions.</p>

      <div className="bcard">
        <h4>Coût par sous-traitant</h4>
        {parST.length === 0 && <div className="empty">Aucune donnée.</div>}
        {parST.map(([nom, v]) => (
          <div className="barrow" key={nom}>
            <span>{nom}</span>
            <div className="bar"><span style={{ width: (v / maxST * 100) + '%' }} /></div>
            <span className="bval">{eur(v)}</span>
          </div>
        ))}
      </div>

      <div className="bcard">
        <h4>Coût par période</h4>
        {parPeriode.length === 0 && <div className="empty">Aucune date posée.</div>}
        {parPeriode.map(([p, v]) => (
          <div className="barrow" key={p}>
            <span>{p}</span>
            <div className="bar"><span style={{ width: (v / maxPer * 100) + '%' }} /></div>
            <span className="bval">{eur(v)}</span>
          </div>
        ))}
      </div>

      <div className="bcard">
        <h4>Total général</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: 'var(--ink2)', fontWeight: 600 }}>{items.length} interventions</span>
          <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--blue)' }}>{eur(total)}</span>
        </div>
      </div>
    </div>
  )
}
