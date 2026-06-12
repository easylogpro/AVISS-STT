import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Lit la vue admin-only v_budget_admin (contient mo_vendue, réservée aux admins).
export function useBudgetAdmin() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase.from('v_budget_admin').select('*')
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.error('budget admin', error); setRows([]) }
        else setRows(data || [])
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { rows, loading }
}
