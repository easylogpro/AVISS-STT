import { useState } from 'react'
import { useEspaces } from '../hooks/useEspaces'

const dateCourt = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return '' } }

export default function GestionEspaces() {
  const { list, loading, creerEspace, renvoyerCode, modifierEspace, supprimerEspace } = useEspaces()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ nom: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [codeFor, setCodeFor] = useState(null)
  const [codeVal, setCodeVal] = useState('')
  const [rowBusy, setRowBusy] = useState(null)
  const [editFor, setEditFor] = useState(null)
  const [editVals, setEditVals] = useState({ nom: '', email: '' })

  async function creer() {
    setMsg(null)
    if (!f.nom.trim() || !f.email.trim() || f.password.trim().length < 6) {
      setMsg({ type: 'err', text: 'Nom, email et code (6 caractères min) requis.' }); return
    }
    setBusy(true)
    const { error } = await creerEspace({ nom: f.nom.trim(), email: f.email.trim(), password: f.password.trim() })
    setBusy(false)
    if (error) setMsg({ type: 'err', text: error })
    else { setMsg({ type: 'ok', text: 'Espace créé, accès envoyé par mail.' }); setF({ nom: '', email: '', password: '' }); setOpen(false) }
  }

  async function renvoyer(id) {
    setMsg(null)
    if (codeVal.trim().length < 6) { setMsg({ type: 'err', text: 'Code : 6 caractères minimum.' }); return }
    setRowBusy(id)
    const { error } = await renvoyerCode(id, codeVal.trim())
    setRowBusy(null)
    if (error) setMsg({ type: 'err', text: error })
    else { setMsg({ type: 'ok', text: 'Nouveau code envoyé par mail.' }); setCodeFor(null); setCodeVal('') }
  }

  function ouvrirEdition(a) {
    setEditFor(editFor === a.id ? null : a.id)
    setEditVals({ nom: a.nom || '', email: '' })
    setCodeFor(null); setMsg(null)
  }

  async function enregistrerEdition(id) {
    setMsg(null)
    if (!editVals.nom.trim() && !editVals.email.trim()) { setMsg({ type: 'err', text: 'Renseigne au moins le nom ou le nouvel email.' }); return }
    setRowBusy(id)
    const { error } = await modifierEspace(id, { nom: editVals.nom.trim(), email: editVals.email.trim() })
    setRowBusy(null)
    if (error) setMsg({ type: 'err', text: error })
    else { setMsg({ type: 'ok', text: 'Espace mis à jour.' }); setEditFor(null) }
  }

  async function supprimer(id, nom) {
    if (!confirm(`Supprimer l'espace de « ${nom} » ? Tous ses chantiers seront effacés. Action irréversible.`)) return
    if (!confirm('Confirme une dernière fois : cette suppression est DÉFINITIVE.')) return
    setRowBusy(id)
    const { error } = await supprimerEspace(id)
    setRowBusy(null)
    if (error) setMsg({ type: 'err', text: error })
    else setMsg({ type: 'ok', text: 'Espace supprimé.' })
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div className="sectlabel" style={{ margin: '2px 4px 10px' }}>ESPACES (ADMINS-CLIENTS)</div>

      {msg && (
        <div className={msg.type === 'err' ? 'banner' : 'chip'}
          style={msg.type === 'ok' ? { display: 'block', marginBottom: 10 } : { marginBottom: 10 }}>{msg.text}</div>
      )}

      {open ? (
        <div className="form" style={{ background: '#eef4fb', borderRadius: 11, padding: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Nouvel espace</div>
          <label>Nom</label>
          <input value={f.nom} placeholder="Nom du collègue / société" onChange={e => setF(s => ({ ...s, nom: e.target.value }))} />
          <label>Email de connexion</label>
          <input type="email" autoCapitalize="none" value={f.email} placeholder="collegue@email.fr" onChange={e => setF(s => ({ ...s, email: e.target.value }))} />
          <label>Code (mot de passe)</label>
          <input type="text" value={f.password} placeholder="6 caractères minimum" onChange={e => setF(s => ({ ...s, password: e.target.value }))} />
          <button className="btn primary full" style={{ marginTop: 12 }} onClick={creer} disabled={busy}>
            {busy ? 'Création…' : 'Créer l\'espace + envoyer les accès'}
          </button>
          <button className="btn ghost full" style={{ marginTop: 6 }} onClick={() => setOpen(false)}>Annuler</button>
        </div>
      ) : (
        <button className="btn primary full" style={{ marginBottom: 12 }} onClick={() => setOpen(true)}>➕ Créer un espace</button>
      )}

      {loading && <div className="empty">Chargement…</div>}
      {!loading && list.length === 0 && <div className="empty">Aucun espace créé pour l'instant.</div>}

      {list.map(a => (
        <div className="ch" key={a.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="ttl" style={{ fontSize: 15 }}>{a.nom || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink2)' }}>Espace créé le {dateCourt(a.created_at)}</div>
            </div>
          </div>
          <button className="btn ghost full" style={{ marginTop: 10, fontSize: 13 }} onClick={() => ouvrirEdition(a)}>
            {editFor === a.id ? 'Fermer' : '✏️ Modifier (nom / email)'}
          </button>
          {editFor === a.id && (
            <div className="form" style={{ marginTop: 8, background: '#eef4fb', borderRadius: 11, padding: 12 }}>
              <label>Nom</label>
              <input value={editVals.nom} onChange={e => setEditVals(v => ({ ...v, nom: e.target.value }))} />
              <label>Nouvel email (laisser vide pour ne pas changer)</label>
              <input type="email" autoCapitalize="none" value={editVals.email} placeholder="nouvel@email.fr"
                onChange={e => setEditVals(v => ({ ...v, email: e.target.value }))} />
              <button className="btn primary full" style={{ marginTop: 10 }} onClick={() => enregistrerEdition(a.id)} disabled={rowBusy === a.id}>
                {rowBusy === a.id ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="btn ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => { setCodeFor(codeFor === a.id ? null : a.id); setCodeVal(''); setEditFor(null); setMsg(null) }}>
              {codeFor === a.id ? 'Fermer' : '🔑 Renvoyer le code'}
            </button>
            <button className="btn" style={{ flex: 1, fontSize: 13, background: '#fdecea', color: 'var(--red)' }}
              onClick={() => supprimer(a.id, a.nom)} disabled={rowBusy === a.id}>
              {rowBusy === a.id ? '…' : '🗑 Supprimer'}
            </button>
          </div>
          {codeFor === a.id && (
            <div className="form" style={{ marginTop: 10 }}>
              <label>Nouveau code</label>
              <input type="text" value={codeVal} placeholder="6 caractères minimum" onChange={e => setCodeVal(e.target.value)} />
              <button className="btn primary full" style={{ marginTop: 10 }} onClick={() => renvoyer(a.id)} disabled={rowBusy === a.id}>
                {rowBusy === a.id ? 'Envoi…' : '📧 Changer et envoyer le code'}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
