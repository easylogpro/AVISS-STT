// =====================================================================
// Edge Function : send-emails
// 2 cas selon "type" :
//   - "validation"   : admin valide -> email CLIENT (date passage) + email ST (confirmation)
//   - "nouvelle_date" : ST pose une date -> email ADMIN (notification à valider)
// Sécurité : recharge les données côté serveur via service role (le client
// ne fournit que l'id + le type, jamais les adresses).
// =====================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM = Deno.env.get('MAIL_FROM') || 'AVISS STT <onboarding@resend.dev>'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')! // ton email (notif nouvelles dates)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const frDate = (s: string | null) => (s ? s.split('-').reverse().join('/') : '')

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, html })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

function emailClient(i: any) {
  return {
    subject: `Intervention prévue le ${frDate(i.date_inter)} — ${i.nom_site}`,
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#1e2a3a;font-size:15px;line-height:1.5">
        <p>Bonjour,</p>
        <p>Dans le cadre de la maintenance de votre installation de sécurité incendie sur le site
        <strong>${i.nom_site}</strong>${i.ville ? ` (${i.ville})` : ''}, nous vous informons qu'une intervention
        est prévue le <strong>${frDate(i.date_inter)}</strong>.</p>
        ${i.nature_travaux ? `<p><strong>Nature des travaux :</strong> ${i.nature_travaux}</p>` : ''}
        <p>Des essais et vérifications seront susceptibles d'être effectués durant ce passage.</p>
        <p>Nous restons à votre disposition pour toute information complémentaire.</p>
        <p>Cordialement,<br/>Le service maintenance — AVISS Sécurité</p>
      </div>`
  }
}

function emailST(i: any) {
  return {
    subject: `Date validée — ${i.nom_site} le ${frDate(i.date_inter)}`,
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#1e2a3a;font-size:15px;line-height:1.5">
        <p>Bonjour,</p>
        <p>La date d'intervention que vous avez saisie pour le chantier
        <strong>${i.nom_site}</strong> (TRX ${i.num_trx}) a été <strong>validée</strong>.</p>
        <p><strong>Date confirmée :</strong> ${frDate(i.date_inter)}<br/>
        <strong>Ville :</strong> ${i.ville || '—'} (${i.dep || '—'})</p>
        <p>Le client a été informé du passage.</p>
        <p>Cordialement,<br/>AVISS Sécurité</p>
      </div>`
  }
}

function emailAdmin(i: any) {
  return {
    subject: `Nouvelle date posée — ${i.nom_site} (${frDate(i.date_inter)})`,
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;color:#1e2a3a;font-size:15px;line-height:1.5">
        <p>Une nouvelle date d'intervention a été saisie par le sous-traitant
        <strong>${i.sous_traitants?.nom || ''}</strong> :</p>
        <p><strong>${i.nom_site}</strong> (TRX ${i.num_trx})<br/>
        ${i.ville || ''} ${i.dep ? `(${i.dep})` : ''}<br/>
        <strong>Date proposée :</strong> ${frDate(i.date_inter)}</p>
        <p>Connecte-toi à l'application AVISS STT pour la valider et prévenir le client.</p>
      </div>`
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { intervention_id, type } = await req.json()
    if (!intervention_id || !type) {
      return new Response(JSON.stringify({ error: 'intervention_id et type requis' }), { status: 400, headers: cors })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const { data: i, error } = await admin
      .from('interventions')
      .select('*, sous_traitants(nom, email_login)')
      .eq('id', intervention_id)
      .single()
    if (error || !i) {
      return new Response(JSON.stringify({ error: 'intervention introuvable' }), { status: 404, headers: cors })
    }

    const sent: string[] = []

    if (type === 'validation') {
      if (i.email_client) { const e = emailClient(i); await sendEmail(i.email_client, e.subject, e.html); sent.push('client') }
      const stMail = i.sous_traitants?.email_login
      if (stMail) { const e = emailST(i); await sendEmail(stMail, e.subject, e.html); sent.push('sous_traitant') }
    } else if (type === 'nouvelle_date') {
      const e = emailAdmin(i); await sendEmail(ADMIN_EMAIL, e.subject, e.html); sent.push('admin')
    } else {
      return new Response(JSON.stringify({ error: 'type inconnu' }), { status: 400, headers: cors })
    }

    return new Response(JSON.stringify({ ok: true, sent }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
