import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { STATUT_LABEL, MATERIEL_LABEL, eur, frDate, wazeUrl } from '../lib/helpers'

const BUCKETS = [
  { id: 'pieces-jointes', key: 'pj', label: 'Pièce', icon: '📄', accept: '.pdf,.doc,.docx,image/*' },
  { id: 'photos', key: 'ph', label: 'Photo', icon: '🖼️', accept: 'image/*', isImage: true }
]

// Fiche détail d'une intervention (bottom sheet).
// canUpload = true -> l'admin peut ajouter / supprimer des fichiers.
export default function FicheDetail({ inter, onClose, canUpload = false }) {
  const [files, setFiles] = useState({ pj: [], ph: [] })
  const [thumbs, setThumbs] = useState({})
  const [busy, setBusy] = useState(null)
  const inputs = { 'pieces-jointes': useRef(null), photos: useRef(null) }

  const loadFiles = useCallback(async () => {
    const out = { pj: [], ph: [] }
    const t = {}
    for (const b of BUCKETS) {
      const { data, error } = await supabase.storage.from(b.id).list(inter.id, { limit: 50 })
      if (!error && data) {
        const list = data.filter(f => f.name !== '.emptyFolderPlaceholder')
        out[b.key] = list
        if (b.isImage) {
          for (const f of list) {
            const { data: signed } = await supabase.storage.from(b.id).createSignedUrl(`${inter.id}/${f.name}`, 3600)
            if (signed?.signedUrl) t[f.name] = signed.signedUrl
          }
        }
      }
    }
    setFiles(out); setThumbs(t)
  }, [inter.id])

  useEffect(() => { loadFiles() }, [loadFiles])

  async function onPick(bucket, e) {
    const fileList = Array.from(e.target.files || [])
    if (!fileList.length) return
    setBusy(bucket)
    for (const file of fileList) {
      const safe = file.name.replace(/[^\w.\-]/g, '_')
      const path = `${inter.id}/${Date.now()}_${safe}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
      if (error) console.error('Upload', error)
    }
    setBusy(null)
    e.target.value = ''
    await loadFiles()
  }

  async function openFile(bucket, name) {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(`${inter.id}/${name}`, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function removeFile(bucket, name) {
    if (!confirm('Supprimer ce fichier ?')) return
    await supabase.storage.from(bucket).remove([`${inter.id}/${name}`])
    await loadFiles()
  }

  const hasFiles = files.pj.length > 0 || files.ph.length > 0

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
                <div className="file" key={'pj' + f.name} onClick={() => openFile('pieces-jointes', f.name)} style={{ cursor: 'pointer', position: 'relative' }}>
                  {canUpload && <button className="filedel" onClick={e => { e.stopPropagation(); removeFile('pieces-jointes', f.name) }}>✕</button>}
                  <div className="ph">📄</div>{displayName(f.name)}
                </div>
              ))}
              {files.ph.map(f => (
                <div className="file" key={'ph' + f.name} onClick={() => openFile('photos', f.name)} style={{ cursor: 'pointer', position: 'relative' }}>
                  {canUpload && <button className="filedel" onClick={e => { e.stopPropagation(); removeFile('photos', f.name) }}>✕</button>}
                  <div className="ph">{thumbs[f.name] ? <img src={thumbs[f.name]} alt="" /> : '🖼️'}</div>Photo
                </div>
              ))}
              {!hasFiles && !canUpload && (
                <div style={{ color: '#8693a5', fontSize: 13, padding: 6 }}>Aucune pièce pour l'instant.</div>
              )}
            </div>

            {canUpload && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {BUCKETS.map(b => (
                  <div key={b.id} style={{ flex: 1 }}>
                    <input ref={inputs[b.id]} type="file" accept={b.accept} multiple
                      style={{ display: 'none' }} onChange={e => onPick(b.id, e)} />
                    <button className="btn ghost" style={{ width: '100%', fontSize: 13 }}
                      disabled={busy === b.id} onClick={() => inputs[b.id].current?.click()}>
                      {busy === b.id ? 'Envoi…' : `${b.icon} Ajouter ${b.label.toLowerCase()}`}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function displayName(name) {
  const n = name.replace(/^\d+_/, '')
  return n.length > 12 ? n.slice(0, 11) + '…' : n
}
