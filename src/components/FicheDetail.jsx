import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { STATUT_LABEL, MATERIEL_LABEL, eur, frDate, wazeUrl } from '../lib/helpers'

// Fiche détail d'une intervention (affichée en bottom sheet).
// Charge les pièces jointes / photos depuis Storage.
export default function FicheDetail({ inter, onClose }) {
  const [files, setFiles] = useState({ pj: [], ph: [] })

  useEffect(() => {
    let active = true
    async function loadFiles() {
      const out = { pj: [], ph: [] }
      for (const [bucket, key] of [['pieces-jointes', 'pj'], ['photos', 'ph']]) {
        const { data, error } = await supabase.storage.from(bucket).list(inter.id, { limit: 50 })
        if (!error && data) out[key] = data.filter(f => f.name !== '.emptyFolderPlaceholder')
      }
      if (active) setFiles(out)
    }
    loadFiles()
    return () => { active = false }
  }, [inter.id])

  return (
    <>
      <div className="ov" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sh-hd">
          <div className="grab" />
          <button className="x" onClick={onClose} aria-label="Fermer">✕</button>
          <div className="sh-ttl">{inter.nom_site}</div>
          <div className="sh-sub">{inter.ville} · {inter.dep} · TRX {inter.num_trx}</div>
        </div>
        <div className="sh-body">
          <a className="waze" href={wazeUrl(inter)} target="_blank" rel="noreferrer">
            <span className="ic">📍</span>
            <span>Naviguer avec Waze<div className="addr">{[inter.adresse, inter.ville, inter.dep].filter(Boolean).join(', ')}</div></span>
          </a>
          {inter.tel_client && (
            <a className="tel" href={`tel:${inter.tel_client.replace(/\s/g, '')}`}>📞 Appeler le site · {inter.tel_client}</a>
          )}

          <div style={{ height: 13 }} />
          <div className="ch" style={{ margin: 0 }}>
            {inter.nature_travaux && <div className="nat" style={{ marginTop: 0 }}>{inter.nature_travaux}</div>}
            <div className="dl">
              <div className="field eur"><div className="k">Budget</div><div className="v">{eur(inter.budget)}</div></div>
              <div className="field"><div className="k">Date inter</div><div className="v" style={{ fontSize: 14 }}>{frDate(inter.date_inter)}</div></div>
              <div className="field"><div className="k">Matériel</div><div className="v" style={{ fontSize: 13 }}>{MATERIEL_LABEL[inter.materiel_statut] || '—'}</div></div>
              <div className="field"><div className="k">À prévoir</div><div className="v" style={{ fontSize: 13 }}>{inter.materiel || '—'}</div></div>
              <div className="field"><div className="k">N° site</div><div className="v">{inter.num_site}</div></div>
              <div className="field"><div className="k">Statut</div><div className="v" style={{ fontSize: 13 }}>{STATUT_LABEL[inter.statut]}</div></div>
            </div>

            <div className="sectlabel" style={{ margin: '4px 0 8px' }}>PIÈCES &amp; PHOTOS</div>
            <div className="files">
              {files.pj.map(f => (
                <div className="file" key={'pj' + f.name}><div className="ph">📄</div>{f.name.slice(0, 10)}</div>
              ))}
              {files.ph.map(f => (
                <div className="file" key={'ph' + f.name}><div className="ph">🖼️</div>Photo</div>
              ))}
              {files.pj.length === 0 && files.ph.length === 0 && (
                <div style={{ color: '#8693a5', fontSize: 13, padding: 6 }}>Aucune pièce pour l'instant.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
