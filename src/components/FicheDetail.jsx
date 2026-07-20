import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSousTraitants } from '../hooks/useSousTraitants'
import { saveMoVendue } from '../lib/emails'
import { STATUT_LABEL, STATUT_LABEL_COURT, MATERIEL_LABEL, eur, frDate, wazeUrl, refChantier } from '../lib/helpers'
import CalendarButtons from './CalendarButtons'

const BUCKETS = [
  { id: 'pieces-jointes', key: 'pj', label: 'Pièce', icon: '📄', accept: '.pdf,.doc,.docx,image/*' },
  { id: 'photos', key: 'ph', label: 'Photo', icon: '🖼️', accept: 'image/*', isImage: true }
]

// Fiche détail d'une intervention (bottom sheet).
// canUpload = true (admin) -> peut éditer email/tel/date + gérer les fichiers.
// onSave(id, champs) : callback pour enregistrer les modifs (fourni par l'admin).
export default function FicheDetail({ inter, onClose, canUpload = false, onSave, onAddPassage, onEditPassage, onDelete }) {
  const [files, setFiles] = useState({ pj: [], ph: [] })
  const [thumbs, setThumbs] = useState({})
  const [busy, setBusy] = useState(null)
  const inputs = { 'pieces-jointes': useRef(null), photos: useRef(null) }
  const sts = useSousTraitants()  // liste des sous-traitants (pour réassigner, admin)

  // Tous les passages du chantier (fiche unique), triés par n° croissant.
  const passages = [...(inter.passages || [])].sort((a, b) => a.num_passage - b.num_passage)

  // champs éditables (admin)
  const [edit, setEdit] = useState({
    email_client: inter.email_client || '',
    tel_client: inter.tel_client || '',
    date_inter: inter.date_inter || '',
    adresse: inter.adresse || '',
    nature_travaux: inter.nature_travaux || '',
    materiel_statut: inter.materiel_statut || '',
    sous_traitant_id: inter.sous_traitant_id || '',
    mo_vendue: ''
  })
  const [moBaseline, setMoBaseline] = useState('')   // MO réelle chargée (pour l'affichage + détection de changement)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Formulaire "prévoir un autre passage" + suppression
  const [passForm, setPassForm] = useState(false)
  const [passDate, setPassDate] = useState('')
  const [passReste, setPassReste] = useState('')
  const [passCout, setPassCout] = useState('')
  const [passBusy, setPassBusy] = useState(false)
  const [delBusy, setDelBusy] = useState(false)

  // Charge la MO vendue réelle (admin) pour qu'elle reste affichée dans la fiche.
  useEffect(() => {
    if (!canUpload) return
    let active = true
    supabase.from('interventions_mo').select('mo_vendue').eq('intervention_id', inter.id).maybeSingle()
      .then(({ data }) => {
        if (!active) return
        const v = data?.mo_vendue != null ? String(data.mo_vendue) : ''
        setMoBaseline(v)
        setEdit(s => ({ ...s, mo_vendue: v }))
      })
    return () => { active = false }
  }, [inter.id, canUpload])

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

  async function save() {
    if (!onSave) return
    setSaving(true); setSaved(false)
    const champs = {
      email_client: edit.email_client.trim() || null,
      tel_client: edit.tel_client.trim() || null,
      date_inter: edit.date_inter || null,
      adresse: edit.adresse.trim() || null,
      nature_travaux: edit.nature_travaux.trim() || null,
      materiel_statut: edit.materiel_statut || null,
      sous_traitant_id: edit.sous_traitant_id || null
    }
    // MO vendue : enregistrée séparément (table sécurisée) — seulement si changée. On ne vide plus le champ.
    if (edit.mo_vendue !== '' && String(edit.mo_vendue) !== String(moBaseline)) {
      await saveMoVendue(inter.id, Number(edit.mo_vendue))
      setMoBaseline(edit.mo_vendue)
    }
    const { error } = await onSave(inter.id, champs)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  // Prévoir un autre passage (admin : sans date / ST : avec date).
  async function ajouterPassage() {
    if (!onAddPassage) return
    setPassBusy(true)
    const { error } = await onAddPassage(inter.id, {
      date_inter: canUpload ? null : (passDate || null),
      reste_a_faire: passReste.trim() || null,
      byST: !canUpload,
      cout_sup: canUpload ? (Number(passCout) || 0) : 0
    })
    setPassBusy(false)
    if (error) alert('Ajout du passage impossible : ' + (error.message || error.code || 'erreur'))
    else onClose()
  }

  // Supprimer définitivement le chantier (admin).
  async function supprimer() {
    if (!onDelete) return
    if (!confirm(`Supprimer définitivement le chantier « ${inter.nom_site} » et tous ses passages ? Cette action est irréversible.`)) return
    setDelBusy(true)
    const { error } = await onDelete(inter.id)
    setDelBusy(false)
    if (error) alert('Suppression impossible : ' + (error.message || error.code || 'erreur'))
    else onClose()
  }

  const hasFiles = files.pj.length > 0 || files.ph.length > 0
  const dirty = canUpload && (
    edit.email_client !== (inter.email_client || '') ||
    edit.tel_client !== (inter.tel_client || '') ||
    edit.date_inter !== (inter.date_inter || '') ||
    edit.adresse !== (inter.adresse || '') ||
    edit.nature_travaux !== (inter.nature_travaux || '') ||
    edit.materiel_statut !== (inter.materiel_statut || '') ||
    edit.sous_traitant_id !== (inter.sous_traitant_id || '') ||
    String(edit.mo_vendue) !== String(moBaseline)
  )

  return (
    <>
      <div className="ov" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sh-hd">
          <div className="grab" />
          <button className="x" onClick={onClose} aria-label="Fermer">✕</button>
          <div className="sh-ttl">{inter.nom_site}</div>
          <div className="sh-sub">{inter.ville} · {inter.dep} · {refChantier(inter)}</div>
        </div>
        <div className="sh-body">
          <a className="waze" href={wazeUrl(inter)} target="_blank" rel="noreferrer">
            <span className="ic">📍</span>
            <span>Naviguer avec Waze<div className="addr">{[inter.adresse, inter.ville, inter.dep].filter(Boolean).join(', ')}</div></span>
          </a>

          {/* Bloc contact client visible côté sous-traitant */}
          {!canUpload && (inter.tel_client || inter.adresse) && (
            <div className="clientbox">
              <div className="cb-h">CONTACT CLIENT</div>
              {inter.tel_client && (
                <a className="cb-tel" href={`tel:${inter.tel_client.replace(/\s/g, '')}`}>📞 {inter.tel_client}</a>
              )}
              <div className="cb-addr">📍 {[inter.adresse, inter.ville, inter.dep].filter(Boolean).join(', ') || '—'}</div>
            </div>
          )}

          <div style={{ height: 13 }} />
          <div className="ch" style={{ margin: 0 }}>
            {!canUpload && inter.nature_travaux && <div className="nat" style={{ marginTop: 0 }}>{inter.nature_travaux}</div>}
            <div className="dl">
              <div className="field eur"><div className="k">Budget</div><div className="v">{eur(inter.budget)}</div></div>
              <div className="field"><div className="k">Matériel AVISS</div><div className="v" style={{ fontSize: 13 }}>{MATERIEL_LABEL[inter.materiel_statut] || '—'}</div></div>
              <div className="field"><div className="k">À prévoir par {inter.sous_traitants?.nom || '—'}</div><div className="v" style={{ fontSize: 13 }}>{inter.materiel || '—'}</div></div>
              <div className="field"><div className="k">Statut</div><div className="v" style={{ fontSize: 13 }}>{STATUT_LABEL[inter.statut]}</div></div>
            </div>
            {passages.filter(p => p.date_inter).length > 1 && (
              <div className="field" style={{ marginTop: 8 }}>
                <div className="k">Dates de passage</div>
                <div className="v" style={{ fontSize: 13 }}>{passages.filter(p => p.date_inter).map(p => frDate(p.date_inter)).join(' · ')}</div>
              </div>
            )}

            {/* ZONE ÉDITABLE ADMIN */}
            {canUpload ? (
              <div className="form" style={{ marginTop: 4 }}>
                <label>Nature des travaux</label>
                <textarea value={edit.nature_travaux} placeholder="Décrire l'intervention…"
                  onChange={e => setEdit(s => ({ ...s, nature_travaux: e.target.value }))} />
                <label>Date d'intervention</label>
                <input type="date" value={edit.date_inter}
                  onChange={e => setEdit(s => ({ ...s, date_inter: e.target.value }))} />
                <label>Email client</label>
                <input type="email" value={edit.email_client} placeholder="contact@client.fr" autoCapitalize="none"
                  onChange={e => setEdit(s => ({ ...s, email_client: e.target.value }))} />
                <label>Téléphone client</label>
                <input value={edit.tel_client} placeholder="01 46 00 00 00"
                  onChange={e => setEdit(s => ({ ...s, tel_client: e.target.value }))} />
                <label>Adresse (rue) — pour Waze</label>
                <input value={edit.adresse} placeholder="12 rue des Lilas"
                  onChange={e => setEdit(s => ({ ...s, adresse: e.target.value }))} />
                <label>Sous-traitant assigné</label>
                <select value={edit.sous_traitant_id}
                  onChange={e => setEdit(s => ({ ...s, sous_traitant_id: e.target.value }))}>
                  <option value="">— Aucun —</option>
                  {sts.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
                <label>Matériel AVISS</label>
                <select value={edit.materiel_statut}
                  onChange={e => setEdit(s => ({ ...s, materiel_statut: e.target.value }))}>
                  <option value="">— À choisir —</option>
                  <option value="a_envoyer">À livrer sur site</option>
                  <option value="dispo_magasin">Dispo magasin</option>
                  <option value="pas_de_materiel">Pas de matériel</option>
                </select>
                <label>MO vendue (€) — privé, invisible au sous-traitant</label>
                <input type="number" value={edit.mo_vendue} placeholder="Saisir pour mettre à jour"
                  onChange={e => setEdit(s => ({ ...s, mo_vendue: e.target.value }))} />
                <button className="btn primary full" style={{ marginTop: 12 }}
                  onClick={save} disabled={!dirty || saving}>
                  {saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Enregistrer les modifications'}
                </button>
                {(edit.date_inter !== (inter.date_inter || '')) && (
                  <p style={{ fontSize: 12, color: 'var(--wait)', marginTop: 8 }}>
                    ⚠ Modifier la date repassera l'intervention en « à valider ».
                  </p>
                )}
              </div>
            ) : (
              <div className="dl" style={{ marginTop: 0 }}>
                <div className="field"><div className="k">Date inter</div><div className="v" style={{ fontSize: 14 }}>{frDate(inter.date_inter)}</div></div>
                <div className="field"><div className="k">N° site</div><div className="v">{inter.num_site}</div></div>
              </div>
            )}

            {/* PASSAGES — tous affichés sur la même fiche */}
            <div className="sectlabel" style={{ margin: '14px 0 8px' }}>PASSAGES<span className="cnt">{passages.length}</span></div>
            {passages.map(p => (
              <PassageItem key={p.id} p={p} inter={inter} canUpload={canUpload} onEditPassage={onEditPassage} />
            ))}

            {onAddPassage && (passForm ? (
              <div className="form" style={{ background: '#f6f8fa', borderRadius: 11, padding: 12, marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Nouveau passage</div>
                {!canUpload && (<>
                  <label>Date d'intervention</label>
                  <input type="date" value={passDate} onChange={e => setPassDate(e.target.value)} />
                </>)}
                <label>Ce qu'il reste à faire</label>
                <textarea value={passReste} placeholder="Décrire ce qu'il reste à faire…"
                  onChange={e => setPassReste(e.target.value)} />
                {canUpload && (<>
                  <label>Budget / coût ST de ce passage (€) — optionnel</label>
                  <input type="number" value={passCout} placeholder="0 si aucun coût"
                    onChange={e => setPassCout(e.target.value)} />
                  <p style={{ fontSize: 11.5, color: 'var(--ink2)', marginTop: 2 }}>Le budget du chantier = somme des passages, compté dans les ratios. La MO ne change pas.</p>
                </>)}
                <button className="btn primary full" style={{ marginTop: 10 }}
                  onClick={ajouterPassage} disabled={passBusy || (!canUpload && !passDate)}>
                  {passBusy ? 'Ajout…' : 'Créer le passage'}
                </button>
                <button className="btn ghost full" style={{ marginTop: 6 }} onClick={() => setPassForm(false)}>Annuler</button>
                {!canUpload && !passDate && (
                  <p style={{ fontSize: 12, color: 'var(--wait)', marginTop: 6 }}>⚠ Choisis une date pour ce passage.</p>
                )}
              </div>
            ) : (
              <button className="btn ghost full" style={{ marginBottom: 4 }} onClick={() => setPassForm(true)}>
                ➕ Prévoir un autre passage
              </button>
            ))}

            <div className="sectlabel" style={{ margin: '14px 0 8px' }}>PIÈCES &amp; PHOTOS</div>
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

            {canUpload && onDelete && (
              <button className="btn full" style={{ marginTop: 16, background: '#fdecea', color: 'var(--red)' }}
                onClick={supprimer} disabled={delBusy}>
                {delBusy ? 'Suppression…' : '🗑 Supprimer ce chantier'}
              </button>
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

// Un passage : affichage + édition admin (date, reste à faire, coût).
function PassageItem({ p, inter, canUpload, onEditPassage }) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [d, setD] = useState({
    date_inter: p.date_inter || '',
    reste_a_faire: p.reste_a_faire || '',
    cout: p.cout != null ? String(p.cout) : ''
  })

  async function save() {
    if (!onEditPassage) return
    setBusy(true)
    const { error } = await onEditPassage(p.id, {
      date_inter: d.date_inter || null,
      reste_a_faire: d.reste_a_faire.trim() || null,
      cout: Number(d.cout) || 0
    })
    setBusy(false)
    if (error) alert('Modification impossible : ' + (error.message || error.code || 'erreur'))
    else setEditing(false)
  }

  return (
    <div className="ch" style={{ margin: '0 0 8px', padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 13 }}>Passage {p.num_passage}</strong>
        <span className={'b ' + p.statut} style={{ fontSize: 10, padding: '3px 6px', whiteSpace: 'nowrap' }}>{STATUT_LABEL_COURT[p.statut]}</span>
      </div>

      {!editing && (<>
        <div style={{ fontSize: 13, marginTop: 4 }}>{p.date_inter ? '📅 ' + frDate(p.date_inter) : 'Date non posée'}</div>
        {canUpload && <div style={{ fontSize: 13, marginTop: 2, color: 'var(--ink2)' }}>💶 Coût ST : {eur(p.cout || 0)}</div>}
        {p.reste_a_faire && <div className="nat" style={{ marginTop: 6 }}>{p.reste_a_faire}</div>}
        {!canUpload && p.date_inter && (
          <div style={{ marginTop: 10 }}><CalendarButtons inter={inter} passage={p} /></div>
        )}
        {canUpload && onEditPassage && (
          <button className="btn ghost full" style={{ marginTop: 8, fontSize: 13 }} onClick={() => setEditing(true)}>
            ✏️ Modifier ce passage
          </button>
        )}
      </>)}

      {editing && (
        <div className="form" style={{ marginTop: 8 }}>
          <label>Date d'intervention</label>
          <input type="date" value={d.date_inter} onChange={e => setD(s => ({ ...s, date_inter: e.target.value }))} />
          <label>Ce qu'il reste à faire</label>
          <textarea value={d.reste_a_faire} onChange={e => setD(s => ({ ...s, reste_a_faire: e.target.value }))} />
          <label>Coût ST du passage (€)</label>
          <input type="number" value={d.cout} onChange={e => setD(s => ({ ...s, cout: e.target.value }))} />
          <button className="btn primary full" style={{ marginTop: 10 }} onClick={save} disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button className="btn ghost full" style={{ marginTop: 6 }} onClick={() => setEditing(false)}>Annuler</button>
        </div>
      )}
    </div>
  )
}
