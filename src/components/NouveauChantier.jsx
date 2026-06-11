import { useState } from 'react'
import { useSousTraitants } from '../hooks/useSousTraitants'

const EMPTY = {
  num_trx: '', num_site: '', nom_site: '', ville: '', dep: '', adresse: '',
  nature_travaux: '', budget: '', materiel_statut: 'a_envoyer', materiel: '',
  email_client: '', tel_client: '', sous_traitant_id: ''
}

export default function NouveauChantier({ onCreate }) {
  const sts = useSousTraitants()
  const [f, setF] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }))

  async function submit() {
    setMsg(null)
    if (!f.num_trx || !f.num_site || !f.nom_site) {
      setMsg({ type: 'err', text: 'N° TRX, N° site et Nom du site sont obligatoires.' }); return
    }
    setBusy(true)
    const payload = {
      ...f,
      budget: f.budget === '' ? null : Number(f.budget),
      sous_traitant_id: f.sous_traitant_id || null,
      statut: 'a_planifier'
    }
    const { error } = await onCreate(payload)
    setBusy(false)
    if (error) {
      setMsg({ type: 'err', text: error.code === '23505' ? 'Ce couple TRX / site existe déjà.' : 'Création impossible.' })
    } else {
      setMsg({ type: 'ok', text: 'Chantier créé.' })
      setF(EMPTY)
    }
  }

  return (
    <div className="body">
      <div className="page-h">Nouveau chantier</div>
      <p className="pagesub">Crée l'intervention. Le sous-traitant n'aura qu'à poser la date.</p>
      {msg && (
        <div className={msg.type === 'err' ? 'banner' : 'chip'} style={msg.type === 'ok' ? { display: 'block', marginBottom: 12 } : {}}>
          {msg.text}
        </div>
      )}
      <div className="form">
        <div className="two">
          <div><label>N° TRX *</label><input value={f.num_trx} onChange={set('num_trx')} placeholder="101231" /></div>
          <div><label>N° site *</label><input value={f.num_site} onChange={set('num_site')} placeholder="4534" /></div>
        </div>
        <label>Nom du site *</label><input value={f.nom_site} onChange={set('nom_site')} placeholder="MAISON ST VINCENT" />
        <div className="two">
          <div><label>Ville</label><input value={f.ville} onChange={set('ville')} placeholder="L'HAY LES ROSES" /></div>
          <div><label>Dép.</label><input value={f.dep} onChange={set('dep')} placeholder="94" /></div>
        </div>
        <label>Adresse (rue) — pour Waze</label><input value={f.adresse} onChange={set('adresse')} placeholder="12 rue des Roses" />
        <label>Nature des travaux</label><textarea value={f.nature_travaux} onChange={set('nature_travaux')} placeholder="Décrire l'intervention…" />
        <div className="two">
          <div><label>Budget (€)</label><input type="number" value={f.budget} onChange={set('budget')} placeholder="600" /></div>
          <div><label>Matériel</label>
            <select value={f.materiel_statut} onChange={set('materiel_statut')}>
              <option value="a_envoyer">À envoyer</option>
              <option value="envoye_sur_site">Sur site</option>
              <option value="dispo_magasin">Dispo magasin</option>
            </select>
          </div>
        </div>
        <label>Matériel à prévoir</label><input value={f.materiel} onChange={set('materiel')} placeholder="1 PRESSOSTAT" />
        <div className="two">
          <div><label>Email client</label><input type="email" value={f.email_client} onChange={set('email_client')} placeholder="contact@client.fr" /></div>
          <div><label>Tél client</label><input value={f.tel_client} onChange={set('tel_client')} placeholder="01 46 00 00 00" /></div>
        </div>
        <label>Sous-traitant</label>
        <select value={f.sous_traitant_id} onChange={set('sous_traitant_id')}>
          <option value="">— Choisir —</option>
          {sts.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <button className="btn primary full" style={{ marginTop: 18 }} onClick={submit} disabled={busy}>
          {busy ? 'Création…' : 'Créer le chantier'}
        </button>
        <p style={{ color: 'var(--ink2)', fontSize: 12, marginTop: 10, textAlign: 'center' }}>
          Pièces jointes &amp; photos : à ajouter depuis la fiche du chantier (bloc suivant).
        </p>
      </div>
    </div>
  )
}
