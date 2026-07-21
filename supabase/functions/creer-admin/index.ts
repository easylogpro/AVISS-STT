// =====================================================================
// Edge Function : creer-admin
// Crée le compte d'un admin-client (son espace) + envoie le mail d'accès.
// Réservé au super-admin. Entrée : { email, password, nom }
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM = Deno.env.get('MAIL_FROM') || 'AVISS STT <onboarding@resend.dev>'
const REPLY_TO = Deno.env.get('REPLY_TO') || 'djamel-alichikh@aviss-securite.fr'
const APP_URL = Deno.env.get('APP_URL') || 'https://aviss-stt.vercel.app'
const LOGO_URL = `${APP_URL}/logo-aviss.png`

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

function mailAcces(nom: string, email: string, code: string) {
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;color:#1e2a3a;font-size:15px;line-height:1.6">
    <img src="${LOGO_URL}" alt="AVISS" width="120" style="display:block;margin-bottom:14px" />
    <p>Bonjour ${nom || ''},</p>
    <p>Voici vos accès à votre espace <strong>AVISS STT</strong> pour gérer vos chantiers et vos sous-traitants.</p>
    <div style="background:#f5f8fc;border:1px solid #e0e9f4;border-radius:8px;padding:14px 16px;margin:14px 0">
      <div><strong>Adresse de l'application :</strong> <a href="${APP_URL}" style="color:#2c5d8a">${APP_URL}</a></div>
      <div><strong>Identifiant (email) :</strong> ${email}</div>
      <div><strong>Code (mot de passe) :</strong> ${code}</div>
    </div>
    <p style="font-weight:700;margin-bottom:6px">📲 Installer l'application</p>
    <div style="background:#fff;border:1px solid #e6e9ef;border-radius:8px;padding:12px 16px;margin-bottom:10px">
      <div style="font-weight:700;color:#2f6fb0;margin-bottom:4px">Android (Chrome)</div>
      <ol style="margin:0 0 0 18px;padding:0"><li>Ouvrez le lien dans <strong>Chrome</strong>.</li><li>Menu <strong>⋮</strong> → <strong>« Installer l'application »</strong>.</li></ol>
    </div>
    <div style="background:#fff;border:1px solid #e6e9ef;border-radius:8px;padding:12px 16px">
      <div style="font-weight:700;color:#2f6fb0;margin-bottom:4px">iPhone (Safari)</div>
      <ol style="margin:0 0 0 18px;padding:0"><li>Ouvrez le lien dans <strong>Safari</strong>.</li><li>Bouton <strong>Partager</strong> → <strong>« Sur l'écran d'accueil »</strong>.</li></ol>
    </div>
    <p style="color:#8693a5;font-size:13px">Pour toute question, répondez à cet email.</p>
  </div>`
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

    const { email, password, nom } = await req.json()
    if (!email || !password || !nom) return json({ error: 'email, password et nom requis.' }, 400)
    if (String(password).length < 6) return json({ error: 'Le code doit faire au moins 6 caractères.' }, 400)

    // 1. Créer le compte Auth
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: String(email).trim(), password: String(password), email_confirm: true
    })
    if (cErr || !created?.user) {
      const msg = cErr?.message?.includes('already') ? 'Cet email a déjà un compte.' : (cErr?.message || 'Création impossible.')
      return json({ error: msg }, 400)
    }
    const newId = created.user.id

    // 2. Créer le profil admin (= son espace)
    const { error: pErr } = await admin.from('profiles').insert({ id: newId, role: 'admin', nom: String(nom).trim() })
    if (pErr) {
      await admin.auth.admin.deleteUser(newId)
      return json({ error: 'Profil non créé : ' + pErr.message }, 400)
    }

    // 3. Mail d'accès (non bloquant)
    try { await sendEmail(String(email).trim(), 'Vos accès à AVISS STT', mailAcces(String(nom).trim(), String(email).trim(), String(password))) }
    catch (_) { /* le compte est créé même si le mail échoue */ }

    return json({ ok: true, message: `Espace créé pour ${nom}.` })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
