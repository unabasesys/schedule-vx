import { createClient } from '@supabase/supabase-js'

let _sb = null

function getClient(sbUrl, sbKey) {
  if (_sb) return _sb
  if (!sbUrl || sbUrl === 'placeholder' || sbUrl.includes('XXXXXXXX')) return null
  if (!sbKey || sbKey === 'placeholder') return null
  _sb = createClient(sbUrl, sbKey)
  return _sb
}

export function useSupabase() {
  const config = useRuntimeConfig()

  function getSb() {
    return getClient(config.public.sbUrl, config.public.sbKey)
  }

  /**
   * Upsert project data to shared_projects table.
   */
  async function sbPushShare(proj) {
    const sb = getSb()
    if (!sb || !proj.shareToken) return
    await sb.from('shared_projects').upsert({
      token:        proj.shareToken,
      project_data: proj,
      is_active:    proj.shareActive || false,
    }, { onConflict: 'token' })
  }

  /**
   * Get view count for a share token.
   */
  async function sbGetViews(token) {
    const sb = getSb()
    if (!sb) return null
    const { data } = await sb
      .from('shared_projects')
      .select('view_count')
      .eq('token', token)
      .single()
    return data?.view_count ?? null
  }

  /**
   * Atomically record a view (+1).
   */
  async function sbRecordView(token) {
    const sb = getSb()
    if (!sb) return
    await sb.rpc('record_share_view', { p_token: token })
  }

  /**
   * Fetch a shared project by token for public view.
   * Returns null if not found or inactive.
   */
  async function sbGetProject(token) {
    const sb = getSb()
    if (!sb) return null
    const { data } = await sb
      .from('shared_projects')
      .select('project_data, is_active')
      .eq('token', token)
      .single()
    if (!data || !data.is_active) return null
    return data.project_data
  }

  return { sbPushShare, sbGetViews, sbRecordView, sbGetProject }
}
