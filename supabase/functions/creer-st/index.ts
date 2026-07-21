// =====================================================================
// Edge Function : creer-st
// Crée le compte de connexion (Auth) d'un sous-traitant, son profil,
// et le lie à sa fiche. Réservé aux admins.
// Entrée : { sous_traitant_id, email, password }
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
    // 1. Vérifier que l'appelant est authentifié ET admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifié.' }, 401)

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: uErr } = await userClient.auth.getUser()
    if (uErr || !user) return json({ error: 'Session invalide.' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (!['admin','super_admin'].includes(prof?.role)) return json({ error: 'Action réservée à l\'administrateur.' }, 403)

    // 2. Lire les paramètres
    const { sous_traitant_id, email, password } = await req.json()
    if (!sous_traitant_id || !email || !password) {
      return json({ error: 'sous_traitant_id, email et password requis.' }, 400)
    }
    if (String(password).length < 6) {
      return json({ error: 'Le mot de passe doit faire au moins 6 caractères.' }, 400)
    }

    // 3. Récupérer le nom du sous-traitant
    const { data: st, error: stErr } = await admin
      .from('sous_traitants').select('id, nom').eq('id', sous_traitant_id).single()
    if (stErr || !st) return json({ error: 'Sous-traitant introuvable.' }, 404)

    // 4. Créer le compte Auth (confirmé d'office)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true
    })
    if (cErr || !created?.user) {
      const msg = cErr?.message?.includes('already')
        ? 'Cet email a déjà un compte.'
        : (cErr?.message || 'Création du compte impossible.')
      return json({ error: msg }, 400)
    }
    const newUserId = created.user.id

    // 5. Créer le profil sous_traitant
    const { error: pErr } = await admin.from('profiles')
      .insert({ id: newUserId, role: 'sous_traitant', nom: st.nom })
    if (pErr) {
      // rollback du compte Auth si le profil échoue
      await admin.auth.admin.deleteUser(newUserId)
      return json({ error: 'Profil non créé : ' + pErr.message }, 400)
    }

    // 6. Lier la fiche sous-traitant au compte
    const { error: lErr } = await admin.from('sous_traitants')
      .update({ profile_id: newUserId, email_login: String(email).trim() })
      .eq('id', sous_traitant_id)
    if (lErr) return json({ error: 'Liaison échouée : ' + lErr.message }, 400)

    return json({ ok: true, message: `Accès créé pour ${st.nom}.` })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
