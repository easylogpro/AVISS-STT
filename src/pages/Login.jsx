import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleLogin() {
    setErr('')
    if (!email || !pwd) { setErr('Renseigne ton email et ton mot de passe.'); return }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pwd })
    setBusy(false)
    if (error) {
      setErr(error.message === 'Invalid login credentials'
        ? 'Identifiants incorrects.'
        : 'Connexion impossible. Réessaie.')
    }
    // En cas de succès, useAuth détecte la session et redirige automatiquement.
  }

  return (
    <div className="login">
      <div className="box">
        <div className="flame" style={{ background: 'linear-gradient(150deg,#f9764b,#ef5a3a)', display: 'grid', placeItems: 'center', boxShadow: '0 6px 16px rgba(239,90,58,.4)' }}>🔥</div>
        <h1>AVISS STT</h1>
        <p>Suivi des interventions sous-traitées</p>
        {err && <div className="err">{err}</div>}
        <input
          type="email" placeholder="Email" value={email}
          autoCapitalize="none" autoCorrect="off"
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <input
          type="password" placeholder="Mot de passe" value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
        />
        <button className="btn primary full" onClick={handleLogin} disabled={busy}>
          {busy ? <span className="spin" /> : 'Se connecter'}
        </button>
      </div>
    </div>
  )
}
