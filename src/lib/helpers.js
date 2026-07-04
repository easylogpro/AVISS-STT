// Helpers et constantes partagés (ST + Admin)

export const STATUT_LABEL = {
  a_planifier: 'À planifier',
  en_attente: 'En attente confirmation client',
  envoye: 'Confirmé par client'
}

// Version courte pour les badges/tableaux où la place manque
export const STATUT_LABEL_COURT = {
  a_planifier: 'À planifier',
  en_attente: 'Att. confirmation',
  envoye: 'Confirmé'
}

export const MATERIEL_LABEL = {
  '': 'Non défini',
  a_envoyer: 'À livrer sur site',
  envoye_sur_site: 'Matériel sur site',
  dispo_magasin: 'Dispo magasin'
}

// Ordre de tri par état : sans date d'abord, puis à valider, puis envoyé
export const STATUT_ORDER = { a_planifier: 0, en_attente: 1, envoye: 2 }

export const eur = (n) =>
  (Number(n) || 0).toLocaleString('fr-FR') + ' €'

export const frDate = (s) =>
  s ? s.split('-').reverse().join('/') : '—'

// Référence chantier au format "N°site TX N°travaux" ex: 5246TX100222
export const refChantier = (i) =>
  `${i.num_site || ''}TX${i.num_trx || ''}`

// Lien Waze : adresse + ville + dep
export const wazeUrl = (i) => {
  const q = [i.adresse, i.ville, i.dep].filter(Boolean).join(', ')
  return `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`
}

// Une intervention bascule en historique si : envoyée ET date passée
export const isHistorique = (i, today = new Date()) => {
  if (i.statut !== 'envoye' || !i.date_inter) return false
  const d = new Date(i.date_inter)
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return d < t
}

// Tri des interventions actives par état
export const triActives = (list) =>
  [...list].sort(
    (a, b) => STATUT_ORDER[a.statut] - STATUT_ORDER[b.statut]
  )

// Tri par date : sans date d'abord, puis par date croissante
export const triParDate = (list, asc = true) =>
  [...list].sort((a, b) => {
    if (!a.date_inter && !b.date_inter) return 0
    if (!a.date_inter) return -1           // sans date toujours en premier
    if (!b.date_inter) return 1
    const d = new Date(a.date_inter) - new Date(b.date_inter)
    return asc ? d : -d
  })

// Tri générique d'une colonne (clé + sens). Champs nuls en premier en asc.
export const triColonne = (list, cle, asc = true) =>
  [...list].sort((a, b) => {
    let va = a[cle], vb = b[cle]
    // valeurs numériques (budget)
    if (cle === 'budget') { va = Number(va) || 0; vb = Number(vb) || 0; return asc ? va - vb : vb - va }
    // dates
    if (cle === 'date_inter') {
      if (!va && !vb) return 0
      if (!va) return asc ? -1 : 1
      if (!vb) return asc ? 1 : -1
      const d = new Date(va) - new Date(vb)
      return asc ? d : -d
    }
    // texte
    va = (va || '').toString().toLowerCase()
    vb = (vb || '').toString().toLowerCase()
    return asc ? va.localeCompare(vb) : vb.localeCompare(va)
  })

// =====================================================================
// Recherche, repères "nouveau passage" et export calendrier (ajouts)
// =====================================================================

// Recherche plein-texte sur nom du site, n° TRX, n° site et ville.
export const matchChantier = (i, q) => {
  const s = (q || '').trim().toLowerCase()
  if (!s) return true
  return [i.nom_site, i.num_trx, i.num_site, i.ville, refChantier(i)]
    .filter(Boolean)
    .some(v => v.toString().toLowerCase().includes(s))
}

// Nombre de passages d'un chantier (0 si non chargé).
const nbPassages = (i) => (i.passages ? i.passages.length : 0)

// ST : un passage supplémentaire est à planifier (admin l'a créé, pas encore de date).
export const estNouveauPassageST = (i) => nbPassages(i) > 1 && i.statut === 'a_planifier'

// ADMIN : un passage supplémentaire est en attente de validation.
export const estNouveauPassageAdmin = (i) => nbPassages(i) > 1 && i.vue_admin === false

// ---- Export calendrier (événement sur toute la journée) ----

const pad2 = (n) => String(n).padStart(2, '0')
// 'YYYY-MM-DD' -> 'YYYYMMDD'
const compactDate = (s) => (s || '').replaceAll('-', '')
// 'YYYY-MM-DD' + n jours -> 'YYYY-MM-DD'
const addDays = (s, n) => {
  const d = new Date(s + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// Champs communs de l'événement pour un chantier i + un passage p.
export const eventCalendrier = (i, p) => {
  const titre = `AVISS — ${i.nom_site || ''} (${refChantier(i)})`
  const lieu = [i.adresse, i.ville, i.dep].filter(Boolean).join(', ')
  const lignes = []
  if (i.nature_travaux) lignes.push(`Travaux : ${i.nature_travaux}`)
  if (p && p.reste_a_faire) lignes.push(`Reste à faire : ${p.reste_a_faire}`)
  if (i.tel_client) lignes.push(`Client : ${i.tel_client}`)
  const mat = [MATERIEL_LABEL[i.materiel_statut], i.materiel].filter(Boolean).join(' — ')
  if (mat) lignes.push(`Matériel : ${mat}`)
  return { titre, lieu, description: lignes.join('\n'), date: p.date_inter }
}

// Échappement pour le format .ics
const icsEscape = (t) => (t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

// Contenu d'un fichier .ics (événement toute la journée).
export const icsPassage = (i, p) => {
  const e = eventCalendrier(i, p)
  const start = compactDate(e.date)
  const end = compactDate(addDays(e.date, 1))
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AVISS STT//FR', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${p.id || i.id}-${p.num_passage || 1}@aviss-stt`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsEscape(e.titre)}`,
    `LOCATION:${icsEscape(e.lieu)}`,
    `DESCRIPTION:${icsEscape(e.description)}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n')
}

// Lien Google Agenda (événement toute la journée).
export const googleCalUrl = (i, p) => {
  const e = eventCalendrier(i, p)
  const dates = `${compactDate(e.date)}/${compactDate(addDays(e.date, 1))}`
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: e.titre, dates, location: e.lieu, details: e.description
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Lien Outlook (événement toute la journée).
export const outlookCalUrl = (i, p) => {
  const e = eventCalendrier(i, p)
  const params = new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent',
    subject: e.titre, startdt: e.date, enddt: addDays(e.date, 1),
    allday: 'true', location: e.lieu, body: e.description
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

// Déclenche le téléchargement d'un .ics (ouvre l'appli calendrier du téléphone).
export const telechargerIcs = (i, p) => {
  const blob = new Blob([icsPassage(i, p)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `AVISS-${refChantier(i)}-passage${p.num_passage || 1}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Passage actif (num_passage le plus élevé). Fallback synthétique si non chargé.
export const passageActif = (i) => {
  const ps = i.passages || []
  if (!ps.length) return { id: i.id, num_passage: 1, date_inter: i.date_inter, reste_a_faire: null }
  return [...ps].sort((a, b) => b.num_passage - a.num_passage)[0]
}
