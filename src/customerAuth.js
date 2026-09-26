const SUPABASE_URL='https://hlmndkgflgutbigsxoml.supabase.co'
const SUPABASE_KEY='sb_publishable_eeu2iAtUCASeSrM6lX-NXQ_3MzJLf_Z'
const SESSION_KEY='gippi-customer-session'

function normalizeSession(data){
  const s=data?.session||data
  if(!s?.access_token) return null
  return {
    access_token:s.access_token,
    refresh_token:s.refresh_token,
    expires_at:Number(s.expires_at||Math.floor(Date.now()/1000)+Number(s.expires_in||3600)),
    user:s.user||data?.user||null
  }
}
function storeSession(s){if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else localStorage.removeItem(SESSION_KEY)}
async function authPost(path,body,accessToken){
  const headers={apikey:SUPABASE_KEY,'Content-Type':'application/json'}
  if(accessToken)headers.Authorization='Bearer '+accessToken
  const r=await fetch(SUPABASE_URL+path,{method:'POST',headers,body:JSON.stringify(body||{})})
  const data=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(data.msg||data.message||data.error_description||'Authentication failed')
  return data
}
async function refresh(session){
  if(!session?.refresh_token)return null
  const data=await authPost('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token})
  const next=normalizeSession(data);storeSession(next);return next
}
async function getUser(accessToken){
  const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+accessToken}})
  const data=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(data.message||'Unable to load account')
  return data
}
async function getProfile(session,user){
  if(!session?.access_token||!user?.id)return null
  const r=await fetch(SUPABASE_URL+'/rest/v1/gippi_user_profiles?select=*&id=eq.'+encodeURIComponent(user.id)+'&limit=1',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token}})
  if(!r.ok)return null
  const rows=await r.json();return rows?.[0]||null
}
function consumeOAuthFragment(){
  const raw=location.hash.startsWith('#')?location.hash.slice(1):''
  if(!raw)return {session:null,error:null,consumed:false}
  const p=new URLSearchParams(raw)
  if(!p.has('access_token')&&!p.has('error_description'))return {session:null,error:null,consumed:false}
  const error=p.get('error_description')||p.get('error')
  let session=null
  if(p.get('access_token')){
    session={access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),expires_at:Math.floor(Date.now()/1000)+Number(p.get('expires_in')||3600),user:null}
    storeSession(session)
  }
  history.replaceState(null,'',location.pathname+location.search)
  return {session,error,consumed:true}
}
export async function restoreCustomerAuth(){
  const oauth=consumeOAuthFragment()
  let session=oauth.session
  if(!session){try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{session=null}}
  if(!session)return {session:null,user:null,profile:null,error:oauth.error,oauthCompleted:false}
  if(session.expires_at<Math.floor(Date.now()/1000)+90){try{session=await refresh(session)}catch{storeSession(null);return {session:null,user:null,profile:null,error:'Your session expired. Please sign in again.',oauthCompleted:false}}}
  const user=session.user||await getUser(session.access_token)
  session.user=user;storeSession(session)
  const profile=await getProfile(session,user)
  return {session,user,profile,error:oauth.error,oauthCompleted:oauth.consumed&&!oauth.error}
}
export async function signInCustomer({email,password}){
  const data=await authPost('/auth/v1/token?grant_type=password',{email,password})
  const session=normalizeSession(data);storeSession(session)
  const user=session.user||await getUser(session.access_token)
  const profile=await getProfile(session,user)
  return {session,user,profile}
}
export async function signUpCustomer({email,password,fullName}){
  const redirectTo=location.origin+location.pathname
  const data=await authPost('/auth/v1/signup?redirect_to='+encodeURIComponent(redirectTo),{email,password,data:{full_name:fullName,source:'gippi-store'}})
  const session=normalizeSession(data)
  if(!session)return {session:null,user:data.user||null,profile:null}
  storeSession(session)
  const user=session.user||await getUser(session.access_token)
  const profile=await getProfile(session,user)
  return {session,user,profile}
}
export async function startGoogleCustomerOAuth(){
  throw new Error('Google sign-in is not active yet because the Google OAuth provider has not been enabled in Supabase. Please use email sign in for now.')
}
export function recoverCustomer(email){
  const redirectTo=location.origin+location.pathname
  return authPost('/auth/v1/recover?redirect_to='+encodeURIComponent(redirectTo),{email})
}
export async function signOutCustomer(){
  let session=null;try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{}
  if(session?.access_token){try{await authPost('/auth/v1/logout?scope=local',{},session.access_token)}catch{}}
  storeSession(null)
}
