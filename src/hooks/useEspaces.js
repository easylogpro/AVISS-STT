import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Gestion des espaces (admins-clients) — réservé au super-admin.
export function useEspaces() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, nom, role, created_at')
      .eq('role', 'admin')
      .order('created_at')
    setList(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function invoke(fn, body) {
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body })
      if (error) return { error: data?.error || error.message || 'Erreur.' }
      if (data?.error) return { error: data.error }
      return { data }
    } catch (e) { return { error: String(e) } }
  }

  const creerEspace = useCallback(async ({ email, password, nom }) => {
    const r = await invoke('creer-admin', { email, password, nom })
    if (!r.error) await fetchAll()
    return r
  }, [fetchAll])

  const renvoyerCode = useCallback(async (admin_id, password) =>
    invoke('admin-espace', { action: 'renvoyer_code', admin_id, password }), [])

  const modifierEspace = useCallback(async (admin_id, { nom, email }) => {
    const r = await invoke('admin-espace', { action: 'modifier', admin_id, nom, email })
    if (!r.error) await fetchAll()
    return r
  }, [fetchAll])

  const supprimerEspace = useCallback(async (admin_id) => {
    const r = await invoke('admin-espace', { action: 'supprimer', admin_id })
    if (!r.error) await fetchAll()
    return r
  }, [fetchAll])

  return { list, loading, refetch: fetchAll, creerEspace, renvoyerCode, modifierEspace, supprimerEspace }
}
