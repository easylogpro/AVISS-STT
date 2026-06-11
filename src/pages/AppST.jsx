import { useState, useMemo } from 'react'
import { useInterventions } from '../hooks/useInterventions'
import FicheDetail from '../components/FicheDetail'
import {
  STATUT_LABEL, MATERIEL_LABEL, eur, frDate, wazeUrl,
  isHistorique, triActives
} from '../lib/helpers'

const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function AppST({ profile, signOut }) {
  const { items, loading, error, updateDate } = useInterventions()
  const [tab, setTab] = useState('chantiers')   // chantiers | historique | profil
  const [view, setView] = useState('cards')     // cards | table
  const [detail, setDetail] = useState(null)
  const [savingId, setSavingId] = useState(null)

  const { active, historique, stats } = useMemo(() => {
    const active = triActives(items.filter(i => !isHistorique(i)))
    const historique = items.filter(i => isHistorique(i))
      .sort((a, b) => new Date(b.date_inter) - new Date(a.date_inter))
    const stats = {
      sansDate: items.filter(i => i.statut === 'a_planifier').length,
      aValider: items.filter(i => i.statut === 'en_attente').length,
      validees: items.filter(i => i.statut === 'envoye').length,
    }
    return { active, historique, stats }
  }, [items])

  async function onDateChange(id, value) {
    setSavingId(id)
    await updateDate(id, value)
    setSavingId(null)
  }

  const nom = profile.nom || 'Sous-traitant'

  return (
    <div className="phone">
      <div className="hdr">
        <div className="brand"><div className="flame">🔥</div><b>AVISS STT</b></div>
        <div className="hello">Bonjour, {nom} 👋</div>
        <div className="date">{todayLabel}</div>
        <div className="stats">
          <div className="stat"><div className="top">Sans date</div><div className="big">{stats.sansDate}</div></div>
          <div className="stat"><div className="top">À valider</div><div className="big or">{stats.aValider}</div></div>
          <div className="stat"><div className="top">Validées</div><div className="big gr">{stats.validees}</div></div>
        </div>
      </div>

      {tab === 'chantiers' && (
        <div className="body">
          <div className="toolbar">
            <span className="lbl">Triés par état</span>
            <div className="seg">
              <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/></svg>Cartes
              </button>
              <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5h18M3 12h18M3 19h18"/></svg>Tableau
              </button>
            </div>
          </div>

          {loading && <div className="empty">Chargement…</div>}
          {error && <div className="empty">Erreur de chargement. Réessaie.</div>}
          {!loading && !error && active.length === 0 && <div className="empty">Aucun chantier en cours.</div>}

          {!loading && !error && active.length > 0 && (
            view === 'cards'
              ? <CardsST list={active} savingId={savingId} onOpen={setDetail} onDateChange={onDateChange} />
              : <TableST list={active} savingId={savingId} onDateChange={onDateChange} />
          )}
        </div>
      )}

      {tab === 'historique' && (
        <div className="body">
          <div className="page-h">Historique</div>
          <p className="pagesub">Interventions validées et passées.</p>
          {historique.length === 0
            ? <div className="empty">Aucune intervention terminée.</div>
            : historique.map(i => (
              <div className="ch clickable" key={i.id} onClick={() => setDetail(i)}>
                <div className="row1">
                  <div><div className="ttl">{i.nom_site}</div><div className="city">{i.ville} · {i.dep}</div></div>
                  <span className="b hist ml">Terminé · {frDate(i.date_inter)}</span>
                </div>
                <div className="grid2" style={{ marginTop: 11 }}>
                  <div className="field eur"><div className="k">Budget</div><div className="v">{eur(i.budget)}</div></div>
                  <div className="field"><div className="k">Réf. TRX</div><div className="v">{i.num_trx}</div></div>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === 'profil' && (
        <div className="body">
          <div className="page-h">Profil</div>
          <div className="ch">
            <div className="ttl">{nom}</div>
            <p style={{ color: 'var(--ink2)', marginTop: 6, fontSize: 13 }}>Compte sous-traitant</p>
            <button className="btn ghost full" onClick={signOut}>Se déconnecter</button>
          </div>
        </div>
      )}

      <nav className="nav">
        <button onClick={() => setTab('chantiers')} style={navStyle(tab === 'chantiers')}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z"/></svg>Chantiers
        </button>
        <button onClick={() => setTab('historique')} style={navStyle(tab === 'historique')}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 1 0 8.94 10h-2.02A7 7 0 1 1 13 5a6.9 6.9 0 0 1 4.9 2.1L15 10h7V3l-2.6 2.6A8.97 8.97 0 0 0 13 3zm-1 4v6l5 3 .75-1.23-4.25-2.52V7z"/></svg>Historique
        </button>
        <button onClick={() => setTab('profil')} style={navStyle(tab === 'profil')}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v1h18v-1c0-3.5-4-6-9-6z"/></svg>Profil
        </button>
      </nav>

      {detail && <FicheDetail inter={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

// style inline pour les boutons de nav (réutilise la logique .nav a)
function navStyle(on) {
  return {
    flex: 1, textAlign: 'center', background: 'none', border: 0, fontFamily: 'inherit',
    color: on ? 'var(--red)' : '#9aa6b5', fontSize: 11, fontWeight: 600,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer'
  }
}

// ---- Vue cartes ----
function CardsST({ list, savingId, onOpen, onDateChange }) {
  const groups = [
    ['a_planifier', 'SANS DATE — À PLANIFIER', true],
    ['en_attente', 'À VALIDER', false],
    ['envoye', 'VALIDÉES (à venir)', false],
  ]
  return groups.map(([st, label, urgent]) => {
    const arr = list.filter(i => i.statut === st)
    if (!arr.length) return null
    return (
      <div key={st}>
        <div className={'sectlabel' + (urgent ? ' new' : '')}>{label}<span className="cnt">{arr.length}</span></div>
        {arr.map(i => (
          <div className={'ch clickable' + (i.statut === 'a_planifier' ? ' nodate' : '')} key={i.id} onClick={() => onOpen(i)}>
            <div className="row1">
              <div><div className="ttl">{i.nom_site}</div><div className="city">{i.ville} · {i.dep}</div></div>
              <span className={'b ' + i.statut + ' ml'}>{STATUT_LABEL[i.statut]}</span>
            </div>
            {i.nature_travaux && <div className="nat">{i.nature_travaux}</div>}
            <div className="grid2">
              <div className="field eur"><div className="k">Mon budget</div><div className="v">{eur(i.budget)}</div></div>
              <div className="field"><div className="k">Réf. TRX</div><div className="v">{i.num_trx}</div></div>
            </div>
            <div style={{ marginTop: 9 }}>
              <span className={'mtag' + (i.materiel_statut === 'a_envoyer' ? ' warn' : '')}>{MATERIEL_LABEL[i.materiel_statut]}</span>
              {i.materiel && <span className="mtag">{i.materiel}</span>}
            </div>
            <a className="waze" href={wazeUrl(i)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
              <span className="ic">📍</span><span>Ouvrir dans Waze<div className="addr">{[i.adresse, i.ville].filter(Boolean).join(', ')}</div></span>
            </a>
            <div className="dateblock" onClick={e => e.stopPropagation()}>
              <div className="lab">Date d'intervention {savingId === i.id && '· enregistrement…'}</div>
              <input className="dateinput" type="date" defaultValue={i.date_inter || ''}
                onChange={e => onDateChange(i.id, e.target.value)} disabled={savingId === i.id} />
            </div>
          </div>
        ))}
      </div>
    )
  })
}

// ---- Vue tableau ----
function TableST({ list, savingId, onDateChange }) {
  return (
    <div className="tbl">
      <table>
        <thead><tr><th>Site</th><th>Budget</th><th>Date inter</th><th>Statut</th></tr></thead>
        <tbody>
          {list.map(i => (
            <tr key={i.id} className={i.statut === 'a_planifier' ? 'nodate' : ''}>
              <td><div className="site">{i.nom_site}</div><div className="sub">{i.ville} · {i.num_trx}</div></td>
              <td style={{ color: 'var(--blue)', fontWeight: 800 }}>{eur(i.budget)}</td>
              <td><input className="di" type="date" defaultValue={i.date_inter || ''}
                onChange={e => onDateChange(i.id, e.target.value)} disabled={savingId === i.id} /></td>
              <td><span className={'b ' + i.statut}>{STATUT_LABEL[i.statut]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
