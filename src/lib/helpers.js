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
