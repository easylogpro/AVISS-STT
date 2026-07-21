import { useState, useMemo } from 'react'
import { useInterventions } from '../hooks/useInterventions'
import FicheDetail from '../components/FicheDetail'
import HistTable from '../components/HistTable'
import NouveauChantier from '../components/NouveauChantier'
import Budget from '../components/Budget'
import GestionST from './GestionST'
import GestionEspaces from '../components/GestionEspaces'
import {
  STATUT_LABEL, STATUT_LABEL_COURT, MATERIEL_LABEL, eur, frDate, refChantier,
  isHistorique, triParDate, triColonne, matchChantier, estNouveauPassageAdmin
} from '../lib/helpers'

const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function AppAdmin({ profile, signOut, isSuper = false }) {
  const { items, loading, error, valider, envoyerClient, creer, creerPassage, modifierPassage, updateChamps, supprimerChantier } = useInterventions()
  const [tab, setTab] = useState('chantiers')  // chantiers | nouveau | budget | historique | profil
  const [view, setView] = useState('cards')
  const [filtre, setFiltre] = useState(null)  // null | 'a_planifier' | 'en_attente' | 'nouvelles'
  const [detail, setDetail] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [tri, setTri] = useState({ cle: null, asc: true })
  const [q, setQ] = useState('')  // recherche texte
  const [histView, setHistView] = useState('cards')  // vue historique : cards | table

  const { active, historique, stats, nbNew } = useMemo(() => {
    // nouvelles dates en tête, puis sans date, puis chronologique
    const base = triParDate(items.filter(i => !isHistorique(i)), true)
    const active = base.sort((a, b) => (b.vue_admin === false ? 1 : 0) - (a.vue_admin === false ? 1 : 0))
    const historique = items.filter(i => isHistorique(i))
      .sort((a, b) => new Date(b.date_inter) - new Date(a.date_inter))
    const nbNew = items.filter(i => i.vue_admin === false).length
    const stats = {
      nouvelles: nbNew,
      aPlanifier: items.filter(i => i.statut === 'a_planifier').length,
      budget: items.reduce((s, i) => s + (Number(i.budget) || 0), 0),
    }
    return { active, historique, stats, nbNew }
  }, [items])

  // Liste affichée selon la recherche + le filtre KPI + tri colonne
  const affichee = useMemo(() => {
    let l = active
    if (filtre === 'nouvelles') l = active.filter(i => i.vue_admin === false)
    else if (filtre) l = active.filter(i => i.statut === filtre)
    if (q) l = l.filter(i => matchChantier(i, q))
    if (tri.cle) l = triColonne(l, tri.cle, tri.asc)
    return l
  }, [active, filtre, tri, q])

  // historique filtré par la recherche
  const histAffiche = useMemo(() => q ? historique.filter(i => matchChantier(i, q)) : historique, [historique, q])

  function trierPar(cle) {
    setTri(t => t.cle === cle ? { cle, asc: !t.asc } : { cle, asc: true })
  }

  // Étape 1 : valider la date → prévient le sous-traitant
  async function onValider(id) {
    setBusyId(id)
    const { error, emailError } = await valider(id)
    setBusyId(null)
    if (error) alert('La validation a échoué. Réessaie.')
    else if (emailError) alert('✅ Date validée.\n⚠️ Le mail au sous-traitant n\'a pas pu partir (vérifie Resend).')
    else alert('✅ Date validée.\n→ Le sous-traitant a été prévenu par email.')
  }

  // Étape 2 : envoyer la date au client
  async function onEnvoyerClient(id) {
    setBusyId(id)
    const { error, emailError } = await envoyerClient(id)
    setBusyId(null)
    if (error) alert('L\'envoi au client a échoué. Réessaie.')
    else if (emailError) alert('✅ Statut mis à jour.\n⚠️ Le mail au client n\'a pas pu partir (vérifie l\'email du client et Resend).')
    else alert('✅ Date envoyée au client.\n→ Le client a été prévenu du passage.')
  }

  const nom = profile.nom || 'Admin'

  return (
    <div className="phone">
      <div className="hdr">
        <div className="brand"><div className="flame">🔥</div><b>AVISS STT</b>
          <button className="role-pill" style={{ border: 0, cursor: 'pointer', font: 'inherit' }} onClick={() => setTab('profil')}>ADMIN ⚙</button>
        </div>
        <div className="hello">Bonjour, {nom} 👋</div>
        <div className="date">{todayLabel}</div>
        <div className="stats">
          <div className={'stat' + (stats.nouvelles ? ' alert' : '') + (filtre === 'nouvelles' ? ' on' : '')}
            style={{ cursor: 'pointer' }}
            onClick={() => { setTab('chantiers'); setFiltre(filtre === 'nouvelles' ? null : 'nouvelles') }}>
            <div className="top">Nouvelles dates</div><div className="big rd">{stats.nouvelles}</div>
          </div>
          <div className={'stat' + (filtre === 'a_planifier' ? ' on' : '')}
            style={{ cursor: 'pointer' }}
            onClick={() => { setTab('chantiers'); setFiltre(filtre === 'a_planifier' ? null : 'a_planifier') }}>
            <div className="top">À planifier</div><div className="big">{stats.aPlanifier}</div>
          </div>
          <div className="stat" style={{ cursor: 'pointer' }} onClick={() => setTab('budget')}>
            <div className="top">Budget</div><div className="big bl">{eur(stats.budget)}</div>
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
              <span>Filtre : {filtre === 'nouvelles' ? 'nouvelles dates' : filtre === 'a_planifier' ? 'à planifier' : 'à valider'}</span>
              <button className="btn ghost" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => setFiltre(null)}>Tout voir</button>
            </div>
          )}
          {!filtre && nbNew > 0 && (
            <div className="banner"><span className="dot" />{nbNew} nouvelle{nbNew > 1 ? 's' : ''} date{nbNew > 1 ? 's' : ''} posée{nbNew > 1 ? 's' : ''} — à valider</div>
          )}
          <div className="toolbar">
            <span className="lbl">{filtre ? 'Résultats filtrés' : 'Triés par état'}</span>
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
          {error && <div className="empty">Erreur de chargement.</div>}
          {!loading && !error && affichee.length === 0 && <div className="empty">Aucun chantier{filtre ? ' pour ce filtre' : ' actif'}.</div>}

          {!loading && !error && affichee.length > 0 && (
            view === 'cards'
              ? <CardsAdmin list={affichee} busyId={busyId} onOpen={setDetail} onValider={onValider} onEnvoyerClient={onEnvoyerClient} grouped={!filtre} />
              : <TableAdmin list={affichee} busyId={busyId} onOpen={setDetail} onValider={onValider} onEnvoyerClient={onEnvoyerClient} tri={tri} trierPar={trierPar} />
          )}
        </div>
      )}

      {tab === 'nouveau' && <NouveauChantier onCreate={creer} />}
      {tab === 'budget' && <Budget />}
      {tab === 'sous_traitants' && <GestionST />}

      {tab === 'historique' && (
        <div className="body">
          <div className="page-h">Historique</div>
          <p className="pagesub">Interventions validées et passées.</p>
          <input type="search" value={q} placeholder="🔎 Rechercher (site, TRX, ville…)"
            onChange={e => setQ(e.target.value)}
            style={{ width: '100%', border: '1.5px solid var(--line)', borderRadius: 12, padding: '11px 13px', fontSize: 15, marginBottom: 12, fontFamily: 'inherit', background: '#fff' }} />
          <div className="toolbar">
            <span className="lbl">{histAffiche.length} terminé{histAffiche.length > 1 ? 's' : ''}</span>
            <div className="seg">
              <button className={histView === 'cards' ? 'on' : ''} onClick={() => setHistView('cards')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/></svg>Cartes
              </button>
              <button className={histView === 'table' ? 'on' : ''} onClick={() => setHistView('table')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 5h18M3 12h18M3 19h18"/></svg>Tableau
              </button>
            </div>
          </div>
          {histAffiche.length === 0
            ? <div className="empty">Aucune intervention terminée.</div>
            : histView === 'table'
            ? <HistTable list={histAffiche} onOpen={setDetail} admin={true} />
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
                  <div className="field"><div className="k">Sous-traitant</div><div className="v" style={{ fontSize: 14 }}>{i.sous_traitants?.nom || '—'}</div></div>
                </div>
              </div>
              )
            })}
        </div>
      )}

      {tab === 'profil' && (
        <div className="body">
          <div className="page-h">Profil &amp; réglages</div>
          <div className="ch">
            <div className="ttl">{nom}</div>
            <p style={{ color: 'var(--ink2)', marginTop: 6, fontSize: 13 }}>{isSuper ? 'Super-administrateur AVISS' : 'Administrateur AVISS'}</p>
          </div>
          <button className="btn ghost full" style={{ marginTop: 4 }} onClick={() => setTab('sous_traitants')}>
            👷 Gérer les sous-traitants
          </button>
          <button className="btn ghost full" onClick={signOut}>Se déconnecter</button>
          {isSuper && <GestionEspaces />}
        </div>
      )}

      <nav className="nav">
        <button onClick={() => setTab('nouveau')} style={navStyle(tab === 'nouveau', '#ef5a3a')}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z"/></svg>Nouveau
        </button>
        <button onClick={() => setTab('chantiers')} style={navStyle(tab === 'chantiers', '#2f6fb0')}>
          <span style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3z"/></svg>
            {nbNew > 0 && <span className="pastille" style={{ position: 'absolute', top: -6, right: -10 }}>{nbNew}</span>}
          </span>
          Chantiers
        </button>
        <button onClick={() => setTab('budget')} style={navStyle(tab === 'budget', '#1f8a4c')}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M4 13h3v7H4zm6.5-5h3v12h-3zM17 3h3v17h-3z"/></svg>Budget
        </button>
        <button onClick={() => setTab('historique')} style={navStyle(tab === 'historique', '#7a52c7')}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M13 3a9 9 0 1 0 8.94 10h-2.02A7 7 0 1 1 13 5a6.9 6.9 0 0 1 4.9 2.1L15 10h7V3l-2.6 2.6A8.97 8.97 0 0 0 13 3zm-1 4v6l5 3 .75-1.23-4.25-2.52V7z"/></svg>Historique
        </button>
      </nav>

      {detail && <FicheDetail inter={detail} onClose={() => setDetail(null)} canUpload onSave={updateChamps} onAddPassage={creerPassage} onEditPassage={modifierPassage} onDelete={supprimerChantier} />}
    </div>
  )
}

function navStyle(on, color) {
  return {
    flex: 1, textAlign: 'center', background: 'none', border: 0, fontFamily: 'inherit',
    color: on ? color : '#b7c0cc', fontSize: 10.5, fontWeight: on ? 700 : 600,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', position: 'relative'
  }
}

// ---- cartes admin ----
function CardsAdmin({ list, busyId, onOpen, onValider, onEnvoyerClient, grouped = true }) {
  // Mode filtré : liste simple sans regroupement par sections
  if (!grouped) {
    return list.map(i => (
      <RowCard key={i.id} i={i} isNew={i.vue_admin === false} busyId={busyId} onOpen={onOpen} onValider={onValider} onEnvoyerClient={onEnvoyerClient} />
    ))
  }
  const news = list.filter(i => i.vue_admin === false)
  const rest = list.filter(i => i.vue_admin !== false)
  const groups = [['a_planifier', 'À PLANIFIER'], ['en_attente', 'EN ATTENTE CONFIRMATION CLIENT'], ['envoye', 'CONFIRMÉ PAR CLIENT']]
  return (
    <>
      {news.length > 0 && (
        <>
          <div className="sectlabel new">⬤ NOUVELLES DATES À VALIDER<span className="cnt">{news.length}</span></div>
          {news.map(i => <RowCard key={i.id} i={i} isNew busyId={busyId} onOpen={onOpen} onValider={onValider} onEnvoyerClient={onEnvoyerClient} />)}
        </>
      )}
      {groups.map(([st, lab]) => {
        const arr = rest.filter(i => i.statut === st)
        if (!arr.length) return null
        return (
          <div key={st}>
            <div className="sectlabel">{lab}<span className="cnt">{arr.length}</span></div>
            {arr.map(i => <RowCard key={i.id} i={i} busyId={busyId} onOpen={onOpen} onValider={onValider} onEnvoyerClient={onEnvoyerClient} />)}
          </div>
        )
      })}
    </>
  )
}

function RowCard({ i, isNew, busyId, onOpen, onValider, onEnvoyerClient }) {
  return (
    <div className={'ch clickable' + (isNew ? ' isnew' : '') + (i.statut === 'a_planifier' ? ' nodate' : '')} onClick={() => onOpen(i)}>
      <div className="siteheader">
        <div>
          <div className="sh-name">{i.nom_site}{estNouveauPassageAdmin(i) ? <span className="newtag" style={{ marginLeft: 6 }}>NOUVEAU PASSAGE</span> : (isNew && <span className="newtag" style={{ marginLeft: 6 }}>NOUVELLE DATE</span>)}</div>
          <div className="sh-ref">{refChantier(i)} · {i.ville} {i.dep}</div>
        </div>
        <span className={'sh-badge ' + i.statut}>{STATUT_LABEL_COURT[i.statut]}</span>
      </div>
      {i.nature_travaux && <div className="nat">{i.nature_travaux}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '4px 0' }}>
        <span style={{ fontWeight: 700, fontSize: 13.5 }}>📅 {frDate(i.date_inter)}</span>
        <span style={{ fontWeight: 800, color: 'var(--blue)', fontSize: 13.5 }}>{eur(i.budget)}</span>
        <span className={'mtag' + (i.materiel_statut === 'a_envoyer' ? ' warn' : '')}>{MATERIEL_LABEL[i.materiel_statut]}</span>
        {i.materiel && <span className="mtag">À prévoir ({i.sous_traitants?.nom || '—'}) : {i.materiel}</span>}
      </div>
      {i.statut === 'en_attente' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn ghost full" disabled={busyId === i.id}
            onClick={e => { e.stopPropagation(); onValider(i.id) }}>
            {busyId === i.id ? '…' : '1 · Valider la date (prévenir le sous-traitant)'}
          </button>
          <button className="btn primary full" disabled={busyId === i.id}
            onClick={e => { e.stopPropagation(); onEnvoyerClient(i.id) }}>
            {busyId === i.id ? '…' : '2 · Envoyer la date au client'}
          </button>
        </div>
      )}
      {i.statut === 'envoye' && (
        <span className="chip">
          ✓ Mail client envoyé{i.client_notifie_at ? ` le ${formatDateHeure(i.client_notifie_at)}` : ''}
        </span>
      )}
      {i.statut === 'a_planifier' && <span className="chip" style={{ background: 'var(--planbg)', color: 'var(--plan)' }}>En attente de date du sous-traitant</span>}
    </div>
  )
}

// formate "2026-06-12T14:30:00Z" en "12/06/2026 à 14h30"
function formatDateHeure(iso) {
  try {
    const d = new Date(iso)
    const date = d.toLocaleDateString('fr-FR')
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${date} à ${h}h${m}`
  } catch { return '' }
}

// flèche de tri
function SortArrow({ active, asc }) {
  if (!active) return <span style={{ opacity: .3, marginLeft: 3 }}>↕</span>
  return <span style={{ marginLeft: 3 }}>{asc ? '↑' : '↓'}</span>
}

// ---- tableau admin ----
function TableAdmin({ list, busyId, onOpen, onValider, onEnvoyerClient, tri, trierPar }) {
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
          <Th cle="date_inter">Date</Th>
          <Th cle="budget">Budget</Th>
          <th>Action</th>
        </tr></thead>
        <tbody>
          {list.map(i => (
            <tr key={i.id} className={(i.vue_admin === false ? 'isnew ' : '') + (i.statut === 'a_planifier' ? 'nodate' : '')}
              onClick={() => onOpen(i)} style={{ cursor: 'pointer' }}>
              <td>
                <div className="site">{i.nom_site}{i.vue_admin === false && <span className="newtag" style={{ marginLeft: 5 }}>NEW</span>}</div>
                <div className="sub">{i.ville} · {i.num_trx}</div>
              </td>
              <td>{frDate(i.date_inter)}</td>
              <td style={{ color: 'var(--blue)', fontWeight: 800 }}>{eur(i.budget)}</td>
              <td onClick={e => e.stopPropagation()}>
                {i.statut === 'en_attente'
                  ? <button className="vbtn" disabled={busyId === i.id} onClick={() => onValider(i.id)}>{busyId === i.id ? '…' : 'Valider'}</button>
                  : <span className={'b ' + i.statut}>{STATUT_LABEL_COURT[i.statut]}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
