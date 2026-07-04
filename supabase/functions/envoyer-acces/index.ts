// =====================================================================
// Edge Function : envoyer-acces
// Envoie au sous-traitant son mail d'accès : lien de l'appli, code (mot de
// passe fourni par l'admin) et mode d'emploi d'installation Android/iPhone.
// Réservé aux admins. Entrée : { sous_traitant_id, password }
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
    <p>Voici vos accès à l'application <strong>AVISS STT</strong> pour suivre vos interventions.</p>
    <div style="background:#f5f8fc;border:1px solid #e0e9f4;border-radius:8px;padding:14px 16px;margin:14px 0">
      <div><strong>Adresse de l'application :</strong> <a href="${APP_URL}" style="color:#2c5d8a">${APP_URL}</a></div>
      <div><strong>Identifiant (email) :</strong> ${email}</div>
      <div><strong>Code (mot de passe) :</strong> ${code}</div>
    </div>
    <p style="font-weight:700;margin-bottom:6px">📲 Installer l'application sur votre téléphone</p>
    <div style="background:#ffffff;border:1px solid #e6e9ef;border-radius:8px;padding:12px 16px;margin-bottom:10px">
      <div style="font-weight:700;color:#2f6fb0;margin-bottom:4px">Android (Chrome)</div>
      <ol style="margin:0 0 0 18px;padding:0">
        <li>Ouvrez le lien ci-dessus dans <strong>Chrome</strong>.</li>
        <li>Touchez le menu <strong>⋮</strong> en haut à droite.</li>
        <li>Choisissez <strong>« Installer l'application »</strong> (ou « Ajouter à l'écran d'accueil »).</li>
      </ol>
    </div>
    <div style="background:#ffffff;border:1px solid #e6e9ef;border-radius:8px;padding:12px 16px">
      <div style="font-weight:700;color:#2f6fb0;margin-bottom:4px">iPhone (Safari)</div>
      <ol style="margin:0 0 0 18px;padding:0">
        <li>Ouvrez le lien ci-dessus dans <strong>Safari</strong>.</li>
        <li>Touchez le bouton <strong>Partager</strong> (carré avec une flèche vers le haut).</li>
        <li>Choisissez <strong>« Sur l'écran d'accueil »</strong>.</li>
      </ol>
    </div>
    <p style="margin-top:14px">Une icône AVISS STT apparaîtra sur votre téléphone : ouvrez-la, connectez-vous avec l'email et le code ci-dessus.</p>
    <p style="color:#8693a5;font-size:13px">Pour toute question, répondez simplement à cet email.</p>
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
    if (prof?.role !== 'admin') return json({ error: 'Action réservée à l\'administrateur.' }, 403)

    const { sous_traitant_id, password } = await req.json()
    if (!sous_traitant_id || !password) return json({ error: 'sous_traitant_id et password requis.' }, 400)

    const { data: st, error: stErr } = await admin
      .from('sous_traitants').select('nom, email_login').eq('id', sous_traitant_id).single()
    if (stErr || !st) return json({ error: 'Sous-traitant introuvable.' }, 404)
    if (!st.email_login) return json({ error: 'Aucun email renseigné pour ce sous-traitant.' }, 400)

    await sendEmail(st.email_login, 'Vos accès à l\'application AVISS STT', mailAcces(st.nom, st.email_login, String(password)))
    return json({ ok: true, message: `Accès envoyés à ${st.email_login}.` })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
