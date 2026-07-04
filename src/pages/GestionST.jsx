import { useState } from 'react'
import { useGestionST } from '../hooks/useGestionST'
import { creerAccesST, modifierCodeST, envoyerAccesST } from '../lib/emails'

// Format court JJ/MM/AAAA
const dateCourt = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return '' } }

export default function GestionST() {
  const { list, loading, creer, toggleActif, majST, supprimer, refetch } = useGestionST()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [accesFor, setAccesFor] = useState(null)  // id du ST dont on crée l'accès
  const [acc, setAcc] = useState({ email: '', pwd: '' })
  const [accBusy, setAccBusy] = useState(false)
  const [accMsg, setAccMsg] = useState(null)
  const [editFor, setEditFor] = useState(null)   // id du ST en cours d'édition
  const [ed, setEd] = useState({ nom: '', email_login: '' })
  const [edBusy, setEdBusy] = useState(false)
  const [codeFor, setCodeFor] = useState(null)   // id du ST dont on gère le code
  const [codeVal, setCodeVal] = useState('')     // nouveau code saisi
  const [codeBusy, setCodeBusy] = useState(false)
  const [codeMsg, setCodeMsg] = useState(null)
  const [lastCode, setLastCode] = useState('')   // dernier code défini (pour le renvoi par mail)
  const [resendBusy, setResendBusy] = useState(false)

  function ouvrirCode(st) {
    setCodeFor(codeFor === st.id ? null : st.id)
    setCodeVal(''); setCodeMsg(null); setLastCode('')
    setEditFor(null); setAccesFor(null)
  }

  async function modifierCode(st) {
    setCodeMsg(null)
    if (codeVal.trim().length < 6) { setCodeMsg({ type: 'err', text: 'Le code doit faire au moins 6 caractères.' }); return }
    setCodeBusy(true)
    const { error } = await modifierCodeST(st.id, codeVal.trim())
    setCodeBusy(false)
    if (error) { setCodeMsg({ type: 'err', text: error }); return }
    setLastCode(codeVal.trim())
    setCodeMsg({ type: 'ok', text: `✓ Code modifié le ${new Date().toLocaleDateString('fr-FR')}. Tu peux le renvoyer par mail.` })
    await refetch()
  }

  async function renvoyerCode(st) {
    setCodeMsg(null)
    if (!lastCode) { setCodeMsg({ type: 'err', text: 'Modifie d\'abord le code pour pouvoir l\'envoyer.' }); return }
    setResendBusy(true)
    const { error } = await envoyerAccesST(st.id, lastCode)
    setResendBusy(false)
    if (error) setCodeMsg({ type: 'err', text: error })
    else setCodeMsg({ type: 'ok', text: 'Mail envoyé au sous-traitant (lien, code et installation).' })
  }

  function ouvrirEdit(st) {
    setEditFor(editFor === st.id ? null : st.id)
    setEd({ nom: st.nom || '', email_login: st.email_login || '' })
    setAccesFor(null)
  }

  async function enregistrerEdit(st) {
    if (!ed.nom.trim()) return
    setEdBusy(true)
    const { error } = await majST(st.id, { nom: ed.nom, email_login: ed.email_login })
    setEdBusy(false)
    if (!error) setEditFor(null)
  }

  async function supprimerST(st) {
    if (!confirm(`Supprimer définitivement le sous-traitant "${st.nom}" ? Cette action est irréversible.`)) return
    const { error } = await supprimer(st.id)
    if (error) alert('Suppression impossible : ' + (error.message || error.code || 'erreur'))
  }

  async function ajouter() {
    setMsg(null)
    if (!nom.trim()) { setMsg({ type: 'err', text: 'Le nom est obligatoire.' }); return }
    setBusy(true)
    const { error } = await creer({ nom, email_login: email })
    setBusy(false)
    if (error) {
      setMsg({ type: 'err', text: error.code === '23505' ? 'Cet email est déjà utilisé.' : 'Création impossible.' })
    } else {
      setMsg({ type: 'ok', text: `Sous-traitant "${nom}" créé.` })
      setNom(''); setEmail('')
    }
  }

  function ouvrirAcces(st) {
    setAccesFor(accesFor === st.id ? null : st.id)
    setAcc({ email: st.email_login || '', pwd: '' })
    setAccMsg(null)
  }

  async function creerAcces(st) {
    setAccMsg(null)
    if (!acc.email.trim() || !acc.pwd.trim()) { setAccMsg({ type: 'err', text: 'Email et mot de passe requis.' }); return }
    if (acc.pwd.length < 6) { setAccMsg({ type: 'err', text: 'Mot de passe : 6 caractères minimum.' }); return }
    setAccBusy(true)
    const { error } = await creerAccesST(st.id, acc.email.trim(), acc.pwd)
    setAccBusy(false)
    if (error) {
      setAccMsg({ type: 'err', text: error })
    } else {
      setAccMsg({ type: 'ok', text: 'Accès créé ! Communique l\'email et le mot de passe au sous-traitant.' })
      await refetch()
      setTimeout(() => { setAccesFor(null) }, 2500)
    }
  }

  return (
    <div className="body">
      <div className="page-h">Sous-traitants</div>
      <p className="pagesub">Gère les entreprises sous-traitantes et leurs accès.</p>

      {msg && (
        <div className={msg.type === 'err' ? 'banner' : 'chip'} style={msg.type === 'ok' ? { display: 'block', marginBottom: 12 } : {}}>
          {msg.text}
        </div>
      )}

      {/* Formulaire création */}
      <div className="ch" style={{ marginBottom: 16 }}>
        <div className="ttl" style={{ marginBottom: 4 }}>Ajouter un sous-traitant</div>
        <div className="form">
          <label>Nom de l'entreprise *</label>
          <input value={nom} onChange={e => setNom(e.target.value)} placeholder="MARTIN" />
          <label>Email de connexion</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="martin@exemple.fr" autoCapitalize="none" />
          <button className="btn primary full" onClick={ajouter} disabled={busy} style={{ marginTop: 14 }}>
            {busy ? 'Création…' : 'Créer le sous-traitant'}
          </button>
        </div>
      </div>

      <div className="sectlabel">LISTE DES SOUS-TRAITANTS<span className="cnt">{list.length}</span></div>

      {loading && <div className="empty">Chargement…</div>}
      {!loading && list.length === 0 && <div className="empty">Aucun sous-traitant.</div>}

      {list.map(st => {
        const lie = !!st.profile_id
        return (
          <div className="ch" key={st.id}>
            <div className="row1">
              <div>
                <div className="ttl">{st.nom}</div>
                <div className="city">{st.email_login || 'Pas d\'email renseigné'}</div>
              </div>
              <span className={'b ml ' + (st.actif ? 'envoye' : 'a_planifier')}>
                {st.actif ? 'Actif' : 'Inactif'}
              </span>
            </div>

            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {lie
                ? <span className="chip">✓ Compte de connexion lié</span>
                : <span className="chip" style={{ background: 'var(--waitbg)', color: 'var(--wait)' }}>⚠ Pas encore de compte de connexion</span>}
              {st.code_modifie_at && (
                <span className="chip">🔑 Code modifié le {dateCourt(st.code_modifie_at)}</span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
              <button className="btn ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => ouvrirEdit(st)}>
                {editFor === st.id ? 'Fermer' : 'Modifier'}
              </button>
              <button className="btn ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => toggleActif(st.id, st.actif)}>
                {st.actif ? 'Désactiver' : 'Réactiver'}
              </button>
              {!lie && (
                <button className="btn primary" style={{ flex: 1, fontSize: 13 }} onClick={() => ouvrirAcces(st)}>
                  {accesFor === st.id ? 'Annuler' : 'Créer l\'accès'}
                </button>
              )}
              {lie && (
                <button className="btn ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => ouvrirCode(st)}>
                  {codeFor === st.id ? 'Fermer' : 'Gérer le code'}
                </button>
              )}
              <button className="btn" style={{ flex: 1, fontSize: 13, background: '#fdecea', color: 'var(--red)' }}
                onClick={() => supprimerST(st)}>
                Supprimer
              </button>
            </div>

            {editFor === st.id && (
              <div className="form" style={{ marginTop: 12, background: '#eef4fb', borderRadius: 11, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Modifier le sous-traitant</div>
                <label>Nom</label>
                <input value={ed.nom} onChange={e => setEd(s => ({ ...s, nom: e.target.value }))} />
                <label>Email</label>
                <input type="email" value={ed.email_login} autoCapitalize="none"
                  onChange={e => setEd(s => ({ ...s, email_login: e.target.value }))} />
                <button className="btn primary full" style={{ marginTop: 12 }}
                  onClick={() => enregistrerEdit(st)} disabled={edBusy || !ed.nom.trim()}>
                  {edBusy ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            )}

            {accesFor === st.id && (
              <div className="form" style={{ marginTop: 12, background: '#f6f8fa', borderRadius: 11, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Créer le compte de connexion</div>
                {accMsg && (
                  <div className={accMsg.type === 'err' ? 'banner' : 'chip'}
                    style={accMsg.type === 'ok' ? { display: 'block', marginBottom: 10 } : { marginBottom: 10 }}>
                    {accMsg.text}
                  </div>
                )}
                <label>Email de connexion</label>
                <input type="email" value={acc.email} autoCapitalize="none"
                  placeholder="joeli@exemple.fr"
                  onChange={e => setAcc(s => ({ ...s, email: e.target.value }))} />
                <label>Mot de passe (à communiquer au ST)</label>
                <input type="text" value={acc.pwd}
                  placeholder="6 caractères minimum"
                  onChange={e => setAcc(s => ({ ...s, pwd: e.target.value }))} />
                <button className="btn primary full" style={{ marginTop: 12 }}
                  onClick={() => creerAcces(st)} disabled={accBusy}>
                  {accBusy ? 'Création…' : 'Valider la création de l\'accès'}
                </button>
              </div>
            )}

            {codeFor === st.id && (
              <div className="form" style={{ marginTop: 12, background: '#eef4fb', borderRadius: 11, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Gérer le code d'accès</div>
                {codeMsg && (
                  <div className={codeMsg.type === 'err' ? 'banner' : 'chip'}
                    style={codeMsg.type === 'ok' ? { display: 'block', marginBottom: 10 } : { marginBottom: 10 }}>
                    {codeMsg.text}
                  </div>
                )}
                <label>Nouveau code (mot de passe)</label>
                <input type="text" value={codeVal} placeholder="6 caractères minimum"
                  onChange={e => setCodeVal(e.target.value)} />
                <button className="btn primary full" style={{ marginTop: 12 }}
                  onClick={() => modifierCode(st)} disabled={codeBusy}>
                  {codeBusy ? 'Modification…' : 'Modifier le code'}
                </button>
                {lastCode && (
                  <button className="btn ghost full" style={{ marginTop: 8 }}
                    onClick={() => renvoyerCode(st)} disabled={resendBusy}>
                    {resendBusy ? 'Envoi…' : '📧 Renvoyer le code par mail'}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
