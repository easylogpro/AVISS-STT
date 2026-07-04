import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Gestion admin des sous-traitants : liste complète + création + activation.
export function useGestionST() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sous_traitants')
      .select('id, nom, email_login, profile_id, actif, code_modifie_at')
      .order('nom')
    setList(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const creer = useCallback(async ({ nom, email_login }) => {
    const { error } = await supabase
      .from('sous_traitants')
      .insert({ nom: nom.trim(), email_login: email_login?.trim() || null, actif: true })
    if (!error) await fetchAll()
    return { error }
  }, [fetchAll])

  const toggleActif = useCallback(async (id, actif) => {
    const { error } = await supabase
      .from('sous_traitants')
      .update({ actif: !actif })
      .eq('id', id)
    if (!error) await fetchAll()
    return { error }
  }, [fetchAll])

  const majEmail = useCallback(async (id, email_login) => {
    const { error } = await supabase
      .from('sous_traitants')
      .update({ email_login: email_login?.trim() || null })
      .eq('id', id)
    if (!error) await fetchAll()
    return { error }
  }, [fetchAll])

  // Modifier nom + email d'un sous-traitant
  const majST = useCallback(async (id, { nom, email_login }) => {
    const champs = {}
    if (nom !== undefined) champs.nom = nom.trim()
    if (email_login !== undefined) champs.email_login = email_login?.trim() || null
    const { error } = await supabase
      .from('sous_traitants')
      .update(champs)
      .eq('id', id)
    if (!error) await fetchAll()
    return { error }
  }, [fetchAll])

  // Supprimer définitivement un sous-traitant
  const supprimer = useCallback(async (id) => {
    const { error } = await supabase
      .from('sous_traitants')
      .delete()
      .eq('id', id)
    if (!error) await fetchAll()
    return { error }
  }, [fetchAll])

  return { list, loading, creer, toggleActif, majEmail, majST, supprimer, refetch: fetchAll }
}
