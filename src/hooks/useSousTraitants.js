import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useSousTraitants() {
  const [list, setList] = useState([])
  useEffect(() => {
    let active = true
    supabase.from('sous_traitants').select('id, nom').eq('actif', true).order('nom')
      .then(({ data }) => { if (active) setList(data || []) })
    return () => { active = false }
  }, [])
  return list
}
