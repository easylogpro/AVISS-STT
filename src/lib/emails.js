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
