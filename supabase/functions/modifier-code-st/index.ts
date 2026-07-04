// =====================================================================
// Edge Function : modifier-code-st
// Change le mot de passe (code) d'un sous-traitant déjà lié à un compte.
// Réservé aux admins. Entrée : { sous_traitant_id, password }
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // 1. Vérifier que l'appelant est admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifié.' }, 401)

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: uErr } = await userClient.auth.getUser()
    if (uErr || !user) return json({ error: 'Session invalide.' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (prof?.role !== 'admin') return json({ error: 'Action réservée à l\'administrateur.' }, 403)

    // 2. Paramètres
    const { sous_traitant_id, password } = await req.json()
    if (!sous_traitant_id || !password) return json({ error: 'sous_traitant_id et password requis.' }, 400)
    if (String(password).length < 6) return json({ error: 'Le code doit faire au moins 6 caractères.' }, 400)

    // 3. Retrouver le compte lié
    const { data: st, error: stErr } = await admin
      .from('sous_traitants').select('id, nom, profile_id').eq('id', sous_traitant_id).single()
    if (stErr || !st) return json({ error: 'Sous-traitant introuvable.' }, 404)
    if (!st.profile_id) return json({ error: 'Ce sous-traitant n\'a pas encore de compte. Utilise « Créer l\'accès ».' }, 400)

    // 4. Changer le mot de passe côté Auth
    const { error: upErr } = await admin.auth.admin.updateUserById(st.profile_id, { password: String(password) })
    if (upErr) return json({ error: 'Changement du code impossible : ' + upErr.message }, 400)

    // 5. Horodater la modification (repère "code modifié le ...")
    await admin.from('sous_traitants').update({ code_modifie_at: new Date().toISOString() }).eq('id', sous_traitant_id)

    return json({ ok: true, message: `Code modifié pour ${st.nom}.` })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
