import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import AppST from './pages/AppST'
import AppAdmin from './pages/AppAdmin'

export default function App() {
  const { session, profile, loading, signOut } = useAuth()

  if (loading) {
    return <div className="center-load">Chargement…</div>
  }

  if (!session) {
    return <Login />
  }

  // Session OK mais profil non chargé (compte créé sans ligne profiles)
  if (!profile) {
    return (
      <div className="center-load" style={{ flexDirection: 'column', gap: 14, padding: 30, textAlign: 'center' }}>
        <div>Ton compte n'est pas encore configuré.</div>
        <div style={{ fontSize: 13, color: 'var(--ink2)' }}>Contacte l'administrateur AVISS.</div>
        <button className="btn ghost" onClick={signOut}>Se déconnecter</button>
      </div>
    )
  }

  return profile.role === 'admin'
    ? <AppAdmin profile={profile} signOut={signOut} />
    : <AppST profile={profile} signOut={signOut} />
}
