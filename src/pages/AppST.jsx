import { useState, useMemo } from 'react'
import { useInterventions } from '../hooks/useInterventions'
import FicheDetail from '../components/FicheDetail'
import CalendarButtons from '../components/CalendarButtons'
import {
  STATUT_LABEL, STATUT_LABEL_COURT, MATERIEL_LABEL, eur, frDate, wazeUrl, refChantier,
  isHistorique, triParDate, triColonne, matchChantier, estNouveauPassageST, passageActif
} from '../lib/helpers'

const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function AppST({ profile, signOut }) {
  const { items, loading, error, updateDate, creerPassage } = useInterventions()
  const [tab, setTab] = useState('chantiers')   // chantiers | historique | profil
  const [view, setView] = useState('cards')     // cards | table
  const [detail, setDetail] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [filtre, setFiltre] = useState(null)    // null | a_planifier | en_attente | envoye
  const [tri, setTri] = useState({ cle: null, asc: true })  // tri colonne tableau
  const [q, setQ] = useState('')                // recherche texte

  const { active, historique, stats } = useMemo(() => {
    // par défaut : sans date d'abord puis chronologique
    const active = triParDate(items.filter(i => !isHistorique(i)), true)
    const historique = items.filter(i => isHistorique(i))
      .sort((a, b) => new Date(b.date_inter) - new Date(a.date_inter))
    const stats = {
      sansDate: items.filter(i => i.statut === 'a_planifier').length,
      aValider: items.filter(i => i.statut === 'en_attente').length,
      validees: items.filter(i => i.statut === 'envoye').length,
    }
    return { active, historique, stats }
  }, [items])

  // liste affichée : recherche + filtre KPI + tri colonne éventuel
  const affichee = useMemo(() => {
    let l = filtre ? active.filter(i => i.statut === filtre) : active
    if (q) l = l.filter(i => matchChantier(i, q))
    if (tri.cle) l = triColonne(l, tri.cle, tri.asc)
    return l
  }, [active, filtre, tri, q])

  // historique filtré par la recherche
  const histAffiche = useMemo(() => q ? historique.filter(i => matchChantier(i, q)) : historique, [historique, q])

  // nombre de passages supplémentaires à planifier (pastille onglet Chantiers)
  const nbNouveauxPassages = useMemo(() => active.filter(estNouveauPassageST).length, [active])

  function trierPar(cle) {
    setTri(t => t.cle === cle ? { cle, asc: !t.asc } : { cle, asc: true })
  }

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
          <div className={'stat' + (filtre === 'a_planifier' ? ' on' : '')} style={{ cursor: 'pointer' }}
            onClick={() => setFiltre(filtre === 'a_planifier' ? null : 'a_planifier')}>
            <div className="top">À planifier</div><div className="big">{stats.sansDate}</div>
          </div>
          <div className={'stat' + (filtre === 'en_attente' ? ' on' : '')} style={{ cursor: 'pointer' }}
            onClick={() => setFiltre(filtre === 'en_attente' ? null : 'en_attente')}>
            <div className="top">Att. confirmation</div><div className="big or">{stats.aValider}</div>
          </div>
          <div className={'stat' + (filtre === 'envoye' ? ' on' : '')} style={{ cursor: 'pointer' }}
            onClick={() => setFiltre(filtre === 'envoye' ? null : 'envoye')}>
            <div className="top">Confirmé</div><div className="big gr">{stats.validees}</div>
          </div>
        </div>
      </div>

      {tab === 'chantiers' && (
        <div className="body">
          <input type="search" value={q} placeholder="🔎 Rechercher un chantier (site, TRX, ville…)"
            onChange={e => setQ(e.target.value)}
            style={{ width: '100%', border: '1.5px solid var(--line)', borderRadius: 12, padding: '11px 13px', fontSize: 15, marginBottom: 12, fontFamily: 'inherit', background: '#fff' }} />
          {filtre && (
            <div className="banner" style={{ background: 'var(--bluebg)', borderColor: '#cfe0f1', color: 'var(--blue)' }}>
              <span>Filtre : {STATUT_LABEL_COURT[filtre]}</span>
              <button className="btn ghost" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => setFiltre(null)}>Tout voir</button>
            </div>
          )}
          <div className="toolbar">
            <span className="lbl">{filtre ? 'Résultats filtrés' : 'Par date'}</span>
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
          {!loading && !error && affichee.length === 0 && <div className="empty">Aucun chantier{filtre ? ' pour ce filtre' : ' en cours'}.</div>}

          {!loading && !error && affichee.length > 0 && (
            view === 'cards'
              ? <CardsST list={affichee} grouped={!filtre} savingId={savingId} onOpen={setDetail} onDateChange={onDateChange} />
              : <TableST list={affichee} savingId={savingId} onDateChange={onDateChange} tri={tri} trierPar={trierPar} onOpen={setDetail} />
          )}
        </div>
      )}

      {tab === 'historique' && (
        <div className="body">
          <div className="page-h">Historique</div>
          <p className="pagesub">Interventions validées et passées.</p>
          <input type="search" value={q} placeholder="🔎 Rechercher (site, TRX, ville…)"
            onChange={e => setQ(e.target.value)}
            style={{ width: '100%', border: '1.5px solid var(--line)', borderRadius: 12, padding: '11px 13px', fontSize: 15, marginBottom: 12, fontFamily: 'inherit', background: '#fff' }} />
          {histAffiche.length === 0
            ? <div className="empty">Aucune intervention terminée.</div>
            : histAffiche.map(i => {
              const ps = [...(i.passages || [])].sort((a, b) => a.num_passage - b.num_passage)
              return (
              <div className="ch clickable" key={i.id} onClick={() => setDetail(i)}>
                <div className="siteheader">
                  <div>
                    <div className="sh-name">{i.nom_site}</div>
                    <div className="sh-ref">{refChantier(i)} · {i.ville}</div>
                  </div>
                  <span className="sh-badge envoye">Terminé · {frDate(i.date_inter)}</span>
                </div>
                {i.nature_travaux && <div className="nat">{i.nature_travaux}</div>}
                {ps.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <div className="sectlabel" style={{ margin: '2px 4px 8px' }}>TÂCHES EFFECTUÉES</div>
                    {ps.map(p => (
                      <div key={p.id} className="field" style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 13 }}><strong>Passage {p.num_passage}</strong> · {p.date_inter ? frDate(p.date_inter) : 'sans date'}</div>
                        {p.reste_a_faire && <div style={{ color: '#475061', marginTop: 3, fontSize: 13 }}>{p.reste_a_faire}</div>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid2" style={{ marginTop: 11 }}>
                  <div className="field eur"><div className="k">Budget</div><div className="v">{eur(i.budget)}</div></div>
                  <div className="field"><div className="k">Réf. TRX</div><div className="v">{i.num_trx}</div></div>
                </div>
              </div>
              )
            })}
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
        <button onClick={() => setTab('chantiers')} style={navStyle(tab === 'chantiers', '#2f6fb0')}>
          <span style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z"/></svg>
            {nbNouveauxPassages > 0 && <span className="pastille" style={{ position: 'absolute', top: -6, right: -10 }}>{nbNouveauxPassages}</span>}
          </span>
          Chantiers
        </button>
        <button onClick={() => setTab('historique')} style={navStyle(tab === 'historique', '#7a52c7')}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M13 3a9 9 0 1 0 8.94 10h-2.02A7 7 0 1 1 13 5a6.9 6.9 0 0 1 4.9 2.1L15 10h7V3l-2.6 2.6A8.97 8.97 0 0 0 13 3zm-1 4v6l5 3 .75-1.23-4.25-2.52V7z"/></svg>Historique
        </button>
        <button onClick={() => setTab('profil')} style={navStyle(tab === 'profil', '#d4537e')}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v1h18v-1c0-3.5-4-6-9-6z"/></svg>Profil
        </button>
      </nav>

      {detail && <FicheDetail inter={detail} onClose={() => setDetail(null)} onAddPassage={creerPassage} />}
    </div>
  )
}

// style inline pour les boutons de nav (réutilise la logique .nav a)
function navStyle(on, color) {
  return {
    flex: 1, textAlign: 'center', background: 'none', border: 0, fontFamily: 'inherit',
    color: on ? color : '#b7c0cc', fontSize: 10.5, fontWeight: on ? 700 : 600,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer'
  }
}

// Bouton "Ajouter à l'agenda" dépliable, directement sur la carte (date confirmée)
function CardCalendrier({ i }) {
  const [open, setOpen] = useState(false)
  const p = passageActif(i)
  if (!p || !p.date_inter) return null
  return (
    <div style={{ marginTop: 9 }} onClick={e => e.stopPropagation()}>
      <button className="btn ghost full" style={{ fontSize: 13 }} onClick={() => setOpen(o => !o)}>
        📅 Ajouter à l'agenda {open ? '▲' : '▼'}
      </button>
      {open && <div style={{ marginTop: 8 }}><CalendarButtons inter={i} passage={p} /></div>}
    </div>
  )
}

// ---- Vue cartes ----
function CardsST({ list, savingId, onOpen, onDateChange, grouped = true }) {
  const renderCard = (i) => (
    <div className={'ch clickable' + (i.statut === 'a_planifier' ? ' nodate' : '')} key={i.id} onClick={() => onOpen(i)}>
      <div className="siteheader">
        <div>
          <div className="sh-name">{i.nom_site}{estNouveauPassageST(i) && <span className="newtag" style={{ marginLeft: 6 }}>NOUVEAU PASSAGE</span>}</div>
          <div className="sh-ref">{refChantier(i)}</div>
        </div>
        <span className={'sh-badge ' + i.statut}>{STATUT_LABEL_COURT[i.statut]}</span>
      </div>
      <div className="city" style={{ marginTop: -4, marginBottom: 8 }}>{i.ville} · {i.dep}</div>
      {i.nature_travaux && <div className="nat">{i.nature_travaux}</div>}
      <div className="grid2">
        <div className="field eur"><div className="k">Mon budget</div><div className="v">{eur(i.budget)}</div></div>
        <div className="field"><div className="k">Réf.</div><div className="v" style={{ fontSize: 13 }}>{refChantier(i)}</div></div>
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
      {i.statut === 'envoye' && <CardCalendrier i={i} />}
    </div>
  )

  // mode filtré : liste simple
  if (!grouped) return list.map(renderCard)

  const groups = [
    ['a_planifier', 'À PLANIFIER', true],
    ['en_attente', 'EN ATTENTE CONFIRMATION CLIENT', false],
    ['envoye', 'CONFIRMÉ PAR CLIENT', false],
  ]
  return groups.map(([st, label, urgent]) => {
    const arr = list.filter(i => i.statut === st)
    if (!arr.length) return null
    return (
      <div key={st}>
        <div className={'sectlabel' + (urgent ? ' new' : '')}>{label}<span className="cnt">{arr.length}</span></div>
        {arr.map(renderCard)}
      </div>
    )
  })
}

// libellé statut très court pour le tableau (place limitée)
function statutCourt(s) {
  return s === 'a_planifier' ? 'À planif.' : s === 'en_attente' ? 'Attente' : 'Confirmé'
}

// flèche de tri
function SortArrow({ active, asc }) {
  if (!active) return <span style={{ opacity: .3, marginLeft: 3 }}>↕</span>
  return <span style={{ marginLeft: 3 }}>{asc ? '↑' : '↓'}</span>
}

// ---- Vue tableau ----
function TableST({ list, savingId, onDateChange, tri, trierPar, onOpen }) {
  const Th = ({ cle, children }) => (
    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => trierPar(cle)}>
      {children}<SortArrow active={tri.cle === cle} asc={tri.asc} />
    </th>
  )
  return (
    <div className="tbl">
      <table>
        <thead><tr>
          <Th cle="nom_site">Site</Th>
          <Th cle="budget">Budget</Th>
          <Th cle="date_inter">Date</Th>
          <Th cle="statut">Statut</Th>
        </tr></thead>
        <tbody>
          {list.map(i => (
            <tr key={i.id} className={i.statut === 'a_planifier' ? 'nodate' : ''}>
              <td onClick={() => onOpen(i)} style={{ cursor: 'pointer' }}>
                <div className="site">{i.nom_site}</div><div className="sub">{i.ville} · {i.num_trx}</div>
              </td>
              <td style={{ color: 'var(--blue)', fontWeight: 800 }}>{eur(i.budget)}</td>
              <td onClick={e => e.stopPropagation()}><input className="di" type="date" defaultValue={i.date_inter || ''}
                onChange={e => onDateChange(i.id, e.target.value)} disabled={savingId === i.id} /></td>
              <td><span className={'b ' + i.statut} style={{ fontSize: 10, padding: '3px 6px', whiteSpace: 'nowrap' }}>{statutCourt(i.statut)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
