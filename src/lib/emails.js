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

// Modifie le mot de passe (code) d'un sous-traitant (Edge Function admin-only).
export async function modifierCodeST(sous_traitant_id, password) {
  try {
    const { data, error } = await supabase.functions.invoke('modifier-code-st', {
      body: { sous_traitant_id, password }
    })
    if (error) {
      const msg = data?.error || error.message || 'Modification impossible.'
      return { error: msg }
    }
    if (data?.error) return { error: data.error }
    return { data }
  } catch (e) {
    return { error: String(e) }
  }
}

// Envoie au sous-traitant son mail d'accès (lien appli + code + mode d'emploi).
export async function envoyerAccesST(sous_traitant_id, password) {
  try {
    const { data, error } = await supabase.functions.invoke('envoyer-acces', {
      body: { sous_traitant_id, password }
    })
    if (error) {
      const msg = data?.error || error.message || 'Envoi impossible.'
      return { error: msg }
    }
    if (data?.error) return { error: data.error }
    return { data }
  } catch (e) {
    return { error: String(e) }
  }
}

// Enregistre la MO vendue dans la table sécurisée interventions_mo (admin only).
export async function saveMoVendue(intervention_id, mo_vendue) {
  try {
    const { error } = await supabase
      .from('interventions_mo')
      .upsert({ intervention_id, mo_vendue, updated_at: new Date().toISOString() }, { onConflict: 'intervention_id' })
    return { error }
  } catch (e) {
    return { error: e }
  }
}
