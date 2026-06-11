import { supabase } from './supabase'

// Appelle l'Edge Function send-emails.
// type: 'validation' (client + ST) | 'nouvelle_date' (admin)
// Ne bloque jamais l'UI : en cas d'échec email, on log seulement.
export async function envoyerEmails(intervention_id, type) {
  try {
    const { data, error } = await supabase.functions.invoke('send-emails', {
      body: { intervention_id, type }
    })
    if (error) { console.error('Edge function emails:', error); return { error } }
    return { data }
  } catch (e) {
    console.error('Appel emails échoué:', e)
    return { error: e }
  }
}

// Crée le compte de connexion d'un sous-traitant (Edge Function admin-only).
export async function creerAccesST(sous_traitant_id, email, password) {
  try {
    const { data, error } = await supabase.functions.invoke('creer-st', {
      body: { sous_traitant_id, email, password }
    })
    if (error) {
      // l'erreur métier est dans data.error si la fonction renvoie un statut !=2xx
      const msg = data?.error || error.message || 'Création impossible.'
      return { error: msg }
    }
    if (data?.error) return { error: data.error }
    return { data }
  } catch (e) {
    return { error: String(e) }
  }
}
