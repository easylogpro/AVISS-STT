// Helpers et constantes partagés (ST + Admin)

export const STATUT_LABEL = {
  a_planifier: 'À planifier',
  en_attente: 'À valider',
  envoye: 'Envoyé'
}

export const MATERIEL_LABEL = {
  a_envoyer: 'Matériel à envoyer',
  envoye_sur_site: 'Matériel sur site',
  dispo_magasin: 'Dispo magasin'
}

// Ordre de tri par état : sans date d'abord, puis à valider, puis envoyé
export const STATUT_ORDER = { a_planifier: 0, en_attente: 1, envoye: 2 }

export const eur = (n) =>
  (Number(n) || 0).toLocaleString('fr-FR') + ' €'

export const frDate = (s) =>
  s ? s.split('-').reverse().join('/') : '—'

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
