import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { envoyerEmails } from '../lib/emails'

// Récupère les interventions visibles par l'utilisateur courant.
// Côté ST, la RLS ne renvoie que ses propres interventions.
// Côté admin, toutes (avec jointure sous-traitant).
// On charge aussi tous les passages de chaque chantier (fiche unique).
export function useInterventions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('interventions')
      .select('*, sous_traitants(nom), passages(id, num_passage, date_inter, statut, vue_admin, client_notifie_at, reste_a_faire, cout)')
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

  // Résout l'id du passage ACTIF (num_passage le plus élevé) d'un chantier.
  async function getActivePassageId(intervention_id) {
    const { data } = await supabase
      .from('passages')
      .select('id')
      .eq('intervention_id', intervention_id)
      .order('num_passage', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data?.id || null
  }

  // ST — Pose/modifie la date du passage actif (le trigger repasse en 'en_attente').
  // Si une date est posée -> notifie l'admin par email (non bloquant).
  const updateDate = useCallback(async (id, date_inter) => {
    const pid = await getActivePassageId(id)
    if (!pid) return { error: { message: 'Passage introuvable.' } }
    const { error } = await supabase
      .from('passages')
      .update({ date_inter: date_inter || null })
      .eq('id', pid)
    if (!error) {
      if (date_inter) { envoyerEmails(id, 'nouvelle_date') }  // notif admin, en arrière-plan
      await fetchItems()
    }
    return { error }
  }, [fetchItems])

  // ADMIN — Étape 1 : Valider la date → prévient le SOUS-TRAITANT (pas le client).
  const valider = useCallback(async (id) => {
    const pid = await getActivePassageId(id)
    if (!pid) return { error: { message: 'Passage introuvable.' } }
    const { error } = await supabase
      .from('passages')
      .update({ vue_admin: true })
      .eq('id', pid)
    if (!error) {
      const res = await envoyerEmails(id, 'validation_st')
      await fetchItems()
      return { error: null, emailError: res.error || null }
    }
    return { error }
  }, [fetchItems])

  // ADMIN — Étape 2 : Envoyer la date au CLIENT → statut 'envoye' + horodatage.
  const envoyerClient = useCallback(async (id) => {
    const pid = await getActivePassageId(id)
    if (!pid) return { error: { message: 'Passage introuvable.' } }
    const { error } = await supabase
      .from('passages')
      .update({ statut: 'envoye', vue_admin: true, client_notifie_at: new Date().toISOString() })
      .eq('id', pid)
    if (!error) {
      const res = await envoyerEmails(id, 'client')
      await fetchItems()
      return { error: null, emailError: res.error || null }
    }
    return { error }
  }, [fetchItems])

  // ADMIN — Marquer le passage actif comme vu (sans le valider).
  const marquerVue = useCallback(async (id) => {
    const pid = await getActivePassageId(id)
    if (pid) await supabase.from('passages').update({ vue_admin: true }).eq('id', pid)
    await fetchItems()
  }, [fetchItems])

  // ADMIN — Créer un nouveau chantier (+ passage n°1 + MO vendue sécurisée).
  const creer = useCallback(async (payload, moValue = null) => {
    const { data, error } = await supabase
      .from('interventions')
      .insert(payload)
      .select('id')
      .single()
    if (!error && data) {
      // passage n°1 (reflète le statut initial du chantier : à planifier)
      await supabase.from('passages').insert({
        intervention_id: data.id, num_passage: 1,
        statut: payload.statut || 'a_planifier', vue_admin: true
      })
      if (moValue != null) {
        await supabase.from('interventions_mo')
          .upsert({ intervention_id: data.id, mo_vendue: moValue }, { onConflict: 'intervention_id' })
      }
    }
    if (!error) await fetchItems()
    return { error }
  }, [fetchItems])

  // ADMIN/ST — Prévoir un passage supplémentaire (même logique de workflow).
  //   byST + date  -> passage 'en_attente' (date envoyée), notifie l'admin.
  //   admin (sans date) -> passage 'à planifier', notifie le sous-traitant.
  const creerPassage = useCallback(async (intervention_id, { date_inter = null, reste_a_faire = null, byST = false, cout_sup = 0 } = {}) => {
    const { data: last } = await supabase
      .from('passages')
      .select('num_passage')
      .eq('intervention_id', intervention_id)
      .order('num_passage', { ascending: false })
      .limit(1)
      .maybeSingle()
    const num = (last?.num_passage || 0) + 1
    const avecDate = byST && !!date_inter
    const row = {
      intervention_id,
      num_passage: num,
      reste_a_faire: reste_a_faire || null,
      date_inter: date_inter || null,
      statut: avecDate ? 'en_attente' : 'a_planifier',
      vue_admin: avecDate ? false : true,
      // Coût ST du passage (admin uniquement). Le budget du chantier = somme des
      // passages, recalculée automatiquement côté base par le trigger.
      cout: byST ? 0 : (Number(cout_sup) || 0)
    }
    const { error } = await supabase.from('passages').insert(row)
    if (!error) {
      if (avecDate) envoyerEmails(intervention_id, 'nouvelle_date')          // notif admin
      else envoyerEmails(intervention_id, 'passage_st_a_planifier')          // notif sous-traitant
      await fetchItems()
    }
    return { error }
  }, [fetchItems])

  // ADMIN — Modifier un passage existant (reste à faire, date, coût).
  // Le budget du chantier se recalcule automatiquement (trigger base).
  const modifierPassage = useCallback(async (passage_id, champs) => {
    const { error } = await supabase.from('passages').update(champs).eq('id', passage_id)
    if (!error) await fetchItems()
    return { error }
  }, [fetchItems])

  // ADMIN — Modifier des champs d'un chantier. La date part sur le passage actif ;
  // les autres champs restent sur interventions.
  const updateChamps = useCallback(async (id, champs) => {
    const { date_inter, ...rest } = champs
    if (date_inter !== undefined) {
      const pid = await getActivePassageId(id)
      if (pid) {
        const { error: eDate } = await supabase.from('passages').update({ date_inter: date_inter || null }).eq('id', pid)
        if (eDate) return { error: eDate }
      }
    }
    if (Object.keys(rest).length) {
      const { error } = await supabase.from('interventions').update(rest).eq('id', id)
      if (error) return { error }
    }
    await fetchItems()
    return { error: null }
  }, [fetchItems])

  // ADMIN — Supprimer un chantier : MO + fichiers Storage + chantier (passages en cascade).
  const supprimerChantier = useCallback(async (id) => {
    await supabase.from('interventions_mo').delete().eq('intervention_id', id)
    for (const bucket of ['pieces-jointes', 'photos']) {
      const { data: fl } = await supabase.storage.from(bucket).list(id, { limit: 100 })
      if (fl && fl.length) {
        await supabase.storage.from(bucket).remove(fl.map(f => `${id}/${f.name}`))
      }
    }
    const { error } = await supabase.from('interventions').delete().eq('id', id)
    if (!error) await fetchItems()
    return { error }
  }, [fetchItems])

  return {
    items, loading, error, refetch: fetchItems,
    updateDate, valider, envoyerClient, marquerVue,
    creer, creerPassage, modifierPassage, updateChamps, supprimerChantier
  }
}
