import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { envoyerEmails } from '../lib/emails'

// Récupère les interventions visibles par l'utilisateur courant.
// Côté ST, la RLS ne renvoie que ses propres interventions.
// Côté admin, toutes (avec jointure sous-traitant).
export function useInterventions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('interventions')
      .select('*, sous_traitants(nom)')
      .order('date_inter', { ascending: true, nullsFirst: true })
    if (error) {
      setError(error)
      setItems([])
    } else {
      setError(null)
      setItems(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  // Met à jour la date d'intervention (le trigger SQL repasse en 'en_attente').
  // Si une date est posée -> notifie l'admin par email (non bloquant).
  const updateDate = useCallback(async (id, date_inter) => {
    const { error } = await supabase
      .from('interventions')
      .update({ date_inter: date_inter || null })
      .eq('id', id)
    if (!error) {
      if (date_inter) { envoyerEmails(id, 'nouvelle_date') }  // notif admin, en arrière-plan
      await fetchItems()
    }
    return { error }
  }, [fetchItems])

  // ADMIN — Étape 1 : Valider la date → prévient le SOUS-TRAITANT (pas le client).
  // Ne change PAS le statut en 'envoye' (ça se fait à l'envoi client).
  const valider = useCallback(async (id) => {
    const { error } = await supabase
      .from('interventions')
      .update({ vue_admin: true })
      .eq('id', id)
    if (!error) {
      const res = await envoyerEmails(id, 'validation_st')
      await fetchItems()
      return { error: null, emailError: res.error || null }
    }
    return { error }
  }, [fetchItems])

  // ADMIN — Étape 2 : Envoyer la date au CLIENT → statut 'envoye' + horodatage.
  const envoyerClient = useCallback(async (id) => {
    const { error } = await supabase
      .from('interventions')
      .update({ statut: 'envoye', vue_admin: true, client_notifie_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      const res = await envoyerEmails(id, 'client')
      await fetchItems()
      return { error: null, emailError: res.error || null }
    }
    return { error }
  }, [fetchItems])

  // ADMIN — Marquer une intervention comme vue (sans la valider).
  const marquerVue = useCallback(async (id) => {
    await supabase.from('interventions').update({ vue_admin: true }).eq('id', id)
    await fetchItems()
  }, [fetchItems])

  // ADMIN — Créer un nouveau chantier (+ MO vendue dans la table sécurisée).
  const creer = useCallback(async (payload, moValue = null) => {
    const { data, error } = await supabase
      .from('interventions')
      .insert(payload)
      .select('id')
      .single()
    if (!error && data && moValue != null) {
      // écrit la MO dans la table protégée (échec non bloquant)
      await supabase.from('interventions_mo')
        .upsert({ intervention_id: data.id, mo_vendue: moValue }, { onConflict: 'intervention_id' })
    }
    if (!error) await fetchItems()
    return { error }
  }, [fetchItems])

  // ADMIN — Modifier des champs d'une intervention (email/tel/date/adresse…).
  // Si la date change, on renvoie l'info pour gérer le statut côté appelant.
  const updateChamps = useCallback(async (id, champs) => {
    const { error } = await supabase
      .from('interventions')
      .update(champs)
      .eq('id', id)
    if (!error) await fetchItems()
    return { error }
  }, [fetchItems])

  return { items, loading, error, refetch: fetchItems, updateDate, valider, envoyerClient, marquerVue, creer, updateChamps }
}
