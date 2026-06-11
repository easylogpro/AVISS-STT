import { useState } from 'react'
import { useGestionST } from '../hooks/useGestionST'

export default function GestionST() {
  const { list, loading, creer, toggleActif } = useGestionST()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [showHelp, setShowHelp] = useState(null) // id du ST dont on montre l'aide

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

            <div style={{ marginTop: 10 }}>
              {lie
                ? <span className="chip">✓ Compte de connexion lié</span>
                : <span className="chip" style={{ background: 'var(--waitbg)', color: 'var(--wait)' }}>⚠ Pas encore de compte de connexion</span>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
              <button className="btn ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => toggleActif(st.id, st.actif)}>
                {st.actif ? 'Désactiver' : 'Réactiver'}
              </button>
              {!lie && (
                <button className="btn ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => setShowHelp(showHelp === st.id ? null : st.id)}>
                  Comment connecter ?
                </button>
              )}
            </div>

            {showHelp === st.id && (
              <div style={{ marginTop: 11, background: '#f6f8fa', borderRadius: 11, padding: 12, fontSize: 13, lineHeight: 1.5, color: '#475061' }}>
                <strong>Créer son accès (dans Supabase) :</strong>
                <div style={{ marginTop: 6 }}>1. Authentication → Users → Add user (email + mot de passe, coche Auto Confirm).</div>
                <div style={{ marginTop: 4 }}>2. SQL Editor, exécute :</div>
                <pre style={{ background: '#1e2a3a', color: '#d6e0ec', borderRadius: 8, padding: 10, fontSize: 11, overflowX: 'auto', marginTop: 6, whiteSpace: 'pre-wrap' }}>{`insert into profiles (id, role, nom)
select id, 'sous_traitant', '${st.nom}'
from auth.users where email = '${st.email_login || 'EMAIL'}';

update sous_traitants
set profile_id = (select id from auth.users
  where email = '${st.email_login || 'EMAIL'}')
where id = '${st.id}';`}</pre>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
