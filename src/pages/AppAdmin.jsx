import { useState, useMemo } from 'react'
import { useInterventions } from '../hooks/useInterventions'
import FicheDetail from '../components/FicheDetail'
import NouveauChantier from '../components/NouveauChantier'
import Budget from '../components/Budget'
import GestionST from './GestionST'
import {
  STATUT_LABEL, MATERIEL_LABEL, eur, frDate,
  isHistorique, triActives
} from '../lib/helpers'

const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

export default function AppAdmin({ profile, signOut }) {
  const { items, loading, error, valider, creer } = useInterventions()
  const [tab, setTab] = useState('chantiers')  // chantiers | nouveau | budget | historique | profil
  const [view, setView] = useState('cards')
  const [detail, setDetail] = useState(null)
  const [validId, setValidId] = useState(null)

  const { active, historique, stats, nbNew } = useMemo(() => {
    const active = triActives(items.filter(i => !isHistorique(i)))
      // les "nouvelles dates" (vue_admin false) remontent en tête
      .sort((a, b) => (b.vue_admin === false ? 1 : 0) - (a.vue_admin === false ? 1 : 0))
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

  async function onValider(id) {
    setValidId(id)
    const { error, emailError } = await valider(id)
    setValidId(null)
    if (error) {
      alert('La validation a échoué. Réessaie.')
    } else if (emailError) {
      alert('✅ Validé.\n⚠️ Les emails n\'ont pas pu être envoyés (vérifie la configuration Resend).')
    } else {
      alert('✅ Validé.\n→ Email envoyé au client (date de passage)\n→ Email envoyé au sous-traitant (confirmation)')
    }
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
          <div className={'stat' + (stats.nouvelles ? ' alert' : '')}>
            <div className="top">Nouvelles dates</div><div className="big rd">{stats.nouvelles}</div>
          </div>
          <div className="stat"><div className="top">À planifier</div><div className="big">{stats.aPlanifier}</div></div>
          <div className="stat"><div className="top">Budget</div><div className="big bl">{eur(stats.budget)}</div></div>
        </div>
      </div>

      {tab === 'chantiers' && (
        <div className="body">
          {nbNew > 0 && (
            <div className="banner"><span className="dot" />{nbNew} nouvelle{nbNew > 1 ? 's' : ''} date{nbNew > 1 ? 's' : ''} posée{nbNew > 1 ? 's' : ''} — à valider</div>
          )}
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
          {error && <div className="empty">Erreur de chargement.</div>}
          {!loading && !error && active.length === 0 && <div className="empty">Aucun chantier actif.</div>}

          {!loading && !error && active.length > 0 && (
            view === 'cards'
              ? <CardsAdmin list={active} validId={validId} onOpen={setDetail} onValider={onValider} />
              : <TableAdmin list={active} validId={validId} onValider={onValider} />
          )}
        </div>
      )}

      {tab === 'nouveau' && <NouveauChantier onCreate={creer} />}
      {tab === 'budget' && <Budget items={items} />}
      {tab === 'sous_traitants' && <GestionST />}

      {tab === 'historique' && (
        <div className="body">
          <div className="page-h">Historique</div>
          <p className="pagesub">Interventions validées et passées.</p>
          {historique.length === 0
            ? <div className="empty">Aucune intervention terminée.</div>
            : historique.map(i => (
              <div className="ch clickable" key={i.id} onClick={() => setDetail(i)}>
                <div className="row1">
                  <div><div className="ttl">{i.nom_site}</div><div className="city">{i.ville} · TRX {i.num_trx}</div></div>
                  <span className="b hist ml">Terminé · {frDate(i.date_inter)}</span>
                </div>
                <div className="grid2" style={{ marginTop: 11 }}>
                  <div className="field eur"><div className="k">Budget</div><div className="v">{eur(i.budget)}</div></div>
                  <div className="field"><div className="k">Sous-traitant</div><div className="v" style={{ fontSize: 14 }}>{i.sous_traitants?.nom || '—'}</div></div>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === 'profil' && (
        <div className="body">
          <div className="page-h">Profil &amp; réglages</div>
          <div className="ch">
            <div className="ttl">{nom}</div>
            <p style={{ color: 'var(--ink2)', marginTop: 6, fontSize: 13 }}>Administrateur AVISS</p>
          </div>
          <button className="btn ghost full" style={{ marginTop: 4 }} onClick={() => setTab('sous_traitants')}>
            👷 Gérer les sous-traitants
          </button>
          <button className="btn ghost full" onClick={signOut}>Se déconnecter</button>
        </div>
      )}

      <nav className="nav">
        <button onClick={() => setTab('chantiers')} style={navStyle(tab === 'chantiers')}>
          <span style={{ position: 'relative' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>
            {nbNew > 0 && <span className="pastille" style={{ position: 'absolute', top: -6, right: -10 }}>{nbNew}</span>}
          </span>
          Chantiers
        </button>
        <button onClick={() => setTab('nouveau')} style={{ ...navStyle(false), marginTop: -22 }}>
          <span className="plus"><span className="fab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg></span></span>
          <span style={{ fontSize: 11, color: tab === 'nouveau' ? 'var(--red)' : '#9aa6b5' }}>Nouveau</span>
        </button>
        <button onClick={() => setTab('budget')} style={navStyle(tab === 'budget')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 4-6"/></svg>Budget
        </button>
        <button onClick={() => setTab('historique')} style={navStyle(tab === 'historique')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 3-6.7M3 5v4h4"/><path d="M12 8v4l3 2"/></svg>Historique
        </button>
      </nav>

      {detail && <FicheDetail inter={detail} onClose={() => setDetail(null)} canUpload />}
    </div>
  )
}

function navStyle(on) {
  return {
    flex: 1, textAlign: 'center', background: 'none', border: 0, fontFamily: 'inherit',
    color: on ? 'var(--red)' : '#9aa6b5', fontSize: 11, fontWeight: 600,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', position: 'relative'
  }
}

// ---- cartes admin ----
function CardsAdmin({ list, validId, onOpen, onValider }) {
  const news = list.filter(i => i.vue_admin === false)
  const rest = list.filter(i => i.vue_admin !== false)
  const groups = [['a_planifier', 'SANS DATE'], ['en_attente', 'À VALIDER'], ['envoye', 'VALIDÉES (à venir)']]
  return (
    <>
      {news.length > 0 && (
        <>
          <div className="sectlabel new">⬤ NOUVELLES DATES À VALIDER<span className="cnt">{news.length}</span></div>
          {news.map(i => <RowCard key={i.id} i={i} isNew validId={validId} onOpen={onOpen} onValider={onValider} />)}
        </>
      )}
      {groups.map(([st, lab]) => {
        const arr = rest.filter(i => i.statut === st)
        if (!arr.length) return null
        return (
          <div key={st}>
            <div className="sectlabel">{lab}<span className="cnt">{arr.length}</span></div>
            {arr.map(i => <RowCard key={i.id} i={i} validId={validId} onOpen={onOpen} onValider={onValider} />)}
          </div>
        )
      })}
    </>
  )
}

function RowCard({ i, isNew, validId, onOpen, onValider }) {
  return (
    <div className={'ch clickable' + (isNew ? ' isnew' : '') + (i.statut === 'a_planifier' ? ' nodate' : '')} onClick={() => onOpen(i)}>
      <div className="row1">
        <div>
          <div className="ttl">{i.nom_site}{isNew && <span className="newtag">NOUVELLE DATE</span>}</div>
          <div className="city">{i.ville} · {i.dep} · TRX {i.num_trx}</div>
        </div>
        <span className={'b ' + i.statut + ' ml'}>{STATUT_LABEL[i.statut]}</span>
      </div>
      {i.nature_travaux && <div className="nat">{i.nature_travaux}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '4px 0' }}>
        <span style={{ fontWeight: 700, fontSize: 13.5 }}>📅 {frDate(i.date_inter)}</span>
        <span style={{ fontWeight: 800, color: 'var(--blue)', fontSize: 13.5 }}>{eur(i.budget)}</span>
        <span className={'mtag' + (i.materiel_statut === 'a_envoyer' ? ' warn' : '')}>{MATERIEL_LABEL[i.materiel_statut]}</span>
      </div>
      {i.statut === 'en_attente' && (
        <button className="btn primary full" disabled={validId === i.id}
          onClick={e => { e.stopPropagation(); onValider(i.id) }}>
          {validId === i.id ? 'Validation…' : 'Valider · prévenir le client'}
        </button>
      )}
      {i.statut === 'envoye' && <span className="chip">✓ Client averti du passage le {frDate(i.date_inter)}</span>}
      {i.statut === 'a_planifier' && <span className="chip" style={{ background: 'var(--planbg)', color: 'var(--plan)' }}>En attente de date du sous-traitant</span>}
    </div>
  )
}

// ---- tableau admin ----
function TableAdmin({ list, validId, onValider }) {
  return (
    <div className="tbl">
      <table>
        <thead><tr><th>Site</th><th>Date</th><th>Budget</th><th>Action</th></tr></thead>
        <tbody>
          {list.map(i => (
            <tr key={i.id} className={(i.vue_admin === false ? 'isnew ' : '') + (i.statut === 'a_planifier' ? 'nodate' : '')}>
              <td>
                <div className="site">{i.nom_site}{i.vue_admin === false && <span className="newtag" style={{ marginLeft: 5 }}>NEW</span>}</div>
                <div className="sub">{i.ville} · {i.num_trx}</div>
              </td>
              <td>{frDate(i.date_inter)}</td>
              <td style={{ color: 'var(--blue)', fontWeight: 800 }}>{eur(i.budget)}</td>
              <td>
                {i.statut === 'en_attente'
                  ? <button className="vbtn" disabled={validId === i.id} onClick={() => onValider(i.id)}>{validId === i.id ? '…' : 'Valider'}</button>
                  : <span className={'b ' + i.statut}>{STATUT_LABEL[i.statut]}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
