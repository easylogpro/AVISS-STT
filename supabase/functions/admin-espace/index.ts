// =====================================================================
// Edge Function : admin-espace
// Actions réservées au super-admin sur un admin-client :
//   { action: 'renvoyer_code', admin_id, password }  -> nouveau code + mail
//   { action: 'supprimer', admin_id }                -> supprime l'espace
// La suppression n'efface PAS les comptes sous-traitants (potentiellement
// partagés) : seulement les chantiers de l'admin, ses liens et son compte.
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM = Deno.env.get('MAIL_FROM') || 'AVISS STT <onboarding@resend.dev>'
const REPLY_TO = Deno.env.get('REPLY_TO') || 'djamel-alichikh@aviss-securite.fr'
const APP_URL = Deno.env.get('APP_URL') || 'https://aviss-stt.vercel.app'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifié.' }, 401)
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: uErr } = await userClient.auth.getUser()
    if (uErr || !user) return json({ error: 'Session invalide.' }, 401)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (prof?.role !== 'super_admin') return json({ error: 'Action réservée au super-administrateur.' }, 403)

    const { action, admin_id, password } = await req.json()
    if (!action || !admin_id) return json({ error: 'action et admin_id requis.' }, 400)

    // sécurité : la cible doit bien être un admin-client (pas toi, pas un ST)
    const { data: cible } = await admin.from('profiles').select('id, role, nom').eq('id', admin_id).single()
    if (!cible) return json({ error: 'Espace introuvable.' }, 404)
    if (cible.role !== 'admin') return json({ error: 'La cible n\'est pas un admin-client.' }, 400)

    if (action === 'renvoyer_code') {
      if (!password || String(password).length < 6) return json({ error: 'Code invalide (6 caractères min).' }, 400)
      const { error: upErr } = await admin.auth.admin.updateUserById(admin_id, { password: String(password) })
      if (upErr) return json({ error: 'Changement du code impossible : ' + upErr.message }, 400)
      const { data: u } = await admin.auth.admin.getUserById(admin_id)
      const email = u?.user?.email
      if (email) {
        const html = `<div style="font-family:Segoe UI,Arial,sans-serif;color:#1e2a3a;font-size:15px;line-height:1.6">
          <p>Bonjour ${cible.nom || ''},</p>
          <p>Voici votre nouveau code d'accès à AVISS STT :</p>
          <div style="background:#f5f8fc;border:1px solid #e0e9f4;border-radius:8px;padding:14px 16px;margin:12px 0">
            <div><strong>Application :</strong> <a href="${APP_URL}">${APP_URL}</a></div>
            <div><strong>Identifiant :</strong> ${email}</div>
            <div><strong>Nouveau code :</strong> ${password}</div>
          </div></div>`
        try { await sendEmail(email, 'Votre nouveau code AVISS STT', html) } catch (_) { /* mail non bloquant */ }
      }
      return json({ ok: true, message: `Code renvoyé à ${cible.nom}.` })
    }

    if (action === 'supprimer') {
      // 1) MO des chantiers de l'admin
      const { data: inters } = await admin.from('interventions').select('id').eq('owner_id', admin_id)
      const ids = (inters || []).map(r => r.id)
      if (ids.length) {
        await admin.from('interventions_mo').delete().in('intervention_id', ids)
        // fichiers Storage
        for (const bucket of ['pieces-jointes', 'photos']) {
          for (const id of ids) {
            const { data: fl } = await admin.storage.from(bucket).list(id, { limit: 100 })
            if (fl && fl.length) await admin.storage.from(bucket).remove(fl.map(f => `${id}/${f.name}`))
          }
        }
      }
      // 2) chantiers (cascade passages)
      await admin.from('interventions').delete().eq('owner_id', admin_id)
      // 3) liens sous-traitants de cet admin (sans toucher aux comptes ST)
      await admin.from('admin_sous_traitants').delete().eq('admin_id', admin_id)
      // 4) profil + compte Auth
      await admin.from('profiles').delete().eq('id', admin_id)
      await admin.auth.admin.deleteUser(admin_id)
      return json({ ok: true, message: `Espace de ${cible.nom} supprimé.` })
    }

    return json({ error: 'Action inconnue.' }, 400)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
