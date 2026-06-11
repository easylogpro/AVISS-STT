import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Fournit : session, profil (avec rôle), chargement
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadProfile(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, nom')
        .eq('id', userId)
        .single()
      if (!mounted) return
      if (error) {
        console.error('Profil introuvable', error)
        setProfile(null)
      } else {
        setProfile(data)
      }
    }

    // Session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => mounted && setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // Écoute des changements
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signOut = () => supabase.auth.signOut()

  return { session, profile, loading, signOut }
}
