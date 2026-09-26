const SUPABASE_URL='https://hlmndkgflgutbigsxoml.supabase.co'
const SUPABASE_KEY='sb_publishable_eeu2iAtUCASeSrM6lX-NXQ_3MzJLf_Z'

async function publicGet(path){
  const response=await fetch(SUPABASE_URL+path,{headers:{apikey:SUPABASE_KEY}})
  if(!response.ok) throw new Error('Backend request failed: '+response.status)
  return response.json()
}

export function fetchPublishedProducts(){
  return publicGet('/rest/v1/gippi_products?select=*&status=eq.published&order=sort_order.asc,created_at.asc')
}
export function fetchActiveSocials(){
  return publicGet('/rest/v1/gippi_social_links?select=*&is_active=eq.true&order=sort_order.asc,created_at.asc')
}
