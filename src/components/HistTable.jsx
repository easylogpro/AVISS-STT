import { eur, frDate } from '../lib/helpers'

// Vue tableau de l'historique. admin=true affiche le sous-traitant, sinon la réf TRX.
export default function HistTable({ list, onOpen, admin = false }) {
  return (
    <div className="tbl">
      <table>
        <thead><tr>
          <th>Site</th>
          <th>Date</th>
          <th>Budget</th>
          <th>{admin ? 'Sous-traitant' : 'Réf. TRX'}</th>
        </tr></thead>
        <tbody>
          {list.map(i => (
            <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => onOpen(i)}>
              <td><div className="site">{i.nom_site}</div><div className="sub">{i.ville}</div></td>
              <td>{frDate(i.date_inter)}</td>
              <td style={{ color: 'var(--blue)', fontWeight: 800 }}>{eur(i.budget)}</td>
              <td>{admin ? (i.sous_traitants?.nom || '—') : i.num_trx}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
