const SUPABASE_URL='https://hlmndkgflgutbigsxoml.supabase.co';
const SUPABASE_KEY='sb_publishable_eeu2iAtUCASeSrM6lX-NXQ_3MzJLf_Z';
const SESSION_KEY='gippi-admin-session';
let session=null, products=[], socials=[], users=[], authMode='signin';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slugify=value=>String(value||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
const money=value=>'$'+Number(value||0).toFixed(Number(value||0)%1?2:0);

function showNotice(message,error=false){
  const el=$('notice'); el.textContent=message; el.classList.remove('hidden','error'); if(error) el.classList.add('error');
  clearTimeout(showNotice.timer); showNotice.timer=setTimeout(()=>el.classList.add('hidden'),4500);
}
function saveSession(data){
  const s=data.session||data;
  if(!s||!s.access_token) return null;
  session={access_token:s.access_token,refresh_token:s.refresh_token,user:s.user||data.user,expires_at:s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600)};
  localStorage.setItem(SESSION_KEY,JSON.stringify(session)); return session;
}
function clearSession(){session=null;localStorage.removeItem(SESSION_KEY)}
async function authRequest(path,body){
  const r=await fetch(SUPABASE_URL+path,{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body||{})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.msg||data.message||data.error_description||'Authentication failed');
  return data;
}
async function refreshSession(){
  if(!session?.refresh_token) return null;
  try{
    const data=await authRequest('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token});
    return saveSession(data);
  }catch(e){clearSession();return null}
}
function consumeOAuthFragment(){
  const raw=location.hash.startsWith('#')?location.hash.slice(1):''
  if(!raw)return
  const p=new URLSearchParams(raw)
  if(!p.get('access_token'))return
  session={access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),user:null,expires_at:Math.floor(Date.now()/1000)+Number(p.get('expires_in')||3600)}
  localStorage.setItem(SESSION_KEY,JSON.stringify(session))
  history.replaceState(null,'',location.pathname+location.search)
}
async function restoreSession(){
  consumeOAuthFragment()
  if(!session){try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{session=null}}
  if(session&&session.expires_at&&session.expires_at<Math.floor(Date.now()/1000)+90) await refreshSession();
  if(session&&!session.user){
    try{
      const r=await fetch(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token}})
      if(r.ok){session.user=await r.json();localStorage.setItem(SESSION_KEY,JSON.stringify(session))}
    }catch{}
  }
  return session;
}
async function api(path,{method='GET',body=null,prefer='',rawBody=null,contentType='application/json'}={}){
  if(!session) throw new Error('Not signed in');
  if(session.expires_at<Math.floor(Date.now()/1000)+60) await refreshSession();
  const headers={apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token};
  if(prefer) headers.Prefer=prefer;
  if(rawBody==null) headers['Content-Type']=contentType;
  else if(contentType) headers['Content-Type']=contentType;
  const r=await fetch(SUPABASE_URL+path,{method,headers,body:rawBody!=null?rawBody:(body==null?undefined:JSON.stringify(body))});
  const text=await r.text();
  let data=null; try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok) throw new Error((data&&data.message)||'Request failed ('+r.status+')');
  return data;
}
async function isAdmin(){
  const rows=await api('/rest/v1/gippi_admins?select=user_id&limit=1');
  return Array.isArray(rows)&&rows.length>0;
}
async function loadData(){
  const [p,s,u]=await Promise.all([
    api('/rest/v1/gippi_products?select=*&order=sort_order.asc,created_at.asc'),
    api('/rest/v1/gippi_social_links?select=*&order=sort_order.asc,created_at.asc'),
    api('/rest/v1/gippi_user_profiles?select=*&order=created_at.desc')
  ]);
  products=p||[]; socials=s||[]; users=u||[]; renderAll();
}
function setScreen(name){
  $('authView').classList.toggle('hidden',name!=='auth');
  $('claimView').classList.toggle('hidden',name!=='claim');
  $('adminView').classList.toggle('hidden',name!=='admin');
  $('adminNav').classList.toggle('hidden',name!=='admin');
  $('signOutBtn').classList.toggle('hidden',name!=='admin');
  $('adminEmail').textContent=session?.user?.email||'';
}
function switchView(view){
  ['overview','products','users','socials'].forEach(v=>$(v+'View').classList.toggle('hidden',v!==view));
  document.querySelectorAll('#adminNav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('viewTitle').textContent=view==='overview'?'Overview':view==='products'?'Products':view==='users'?'Users':'Social links';
  $('newProductBtn').classList.toggle('hidden',view==='socials'||view==='users');
}
function renderAll(){renderMetrics();renderProducts();renderUsers();renderSocials()}
function renderMetrics(){
  $('metricProducts').textContent=products.length;
  $('metricPublished').textContent=products.filter(p=>p.status==='published').length;
  $('metricDrafts').textContent=products.filter(p=>p.status==='draft').length;
  $('metricSocials').textContent=socials.filter(s=>s.is_active&&s.url).length;
  $('metricUsers').textContent=users.length;
}
function currentFilteredProducts(){
  const q=$('productSearch').value.toLowerCase().trim(), st=$('productStatusFilter').value;
  return products.filter(p=>(st==='all'||p.status===st)&&(!q||(p.title+' '+p.category+' '+p.slug).toLowerCase().includes(q)));
}
function renderProducts(){
  $('productRows').innerHTML=currentFilteredProducts().map(p=>'<tr><td><div class="product-cell"><img class="product-thumb" src="'+esc(p.image_url||'../products/design-vault.svg')+'" alt=""><div><strong>'+esc(p.title)+'</strong><div class="micro">'+esc(p.slug)+'</div></div></div></td><td>'+esc(p.category)+'</td><td><span class="status-pill '+esc(p.status)+'">'+esc(p.status)+'</span></td><td>'+money(p.price)+'</td><td>'+Number(p.sort_order||0)+'</td><td><div class="row-actions"><button data-edit="'+esc(p.id)+'">Edit</button><a href="../product/?slug='+encodeURIComponent(p.slug)+'" target="_blank">Preview</a></div></td></tr>').join('');
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openProduct(b.dataset.edit));
}
function renderUsers(){
  $('userRows').innerHTML=users.map(u=>'<tr><td><div class="user-cell">'+(u.avatar_url?'<img src="'+esc(u.avatar_url)+'" alt="">':'<span>'+(esc((u.full_name||u.email||'U').slice(0,1).toUpperCase()))+'</span>')+'<div><strong>'+esc(u.full_name||'Customer')+'</strong><div class="micro">'+esc(u.email||'')+'</div></div></div></td><td><span class="status-pill published">'+esc(u.provider||'email')+'</span></td><td>'+formatDate(u.created_at)+'</td><td>'+formatDate(u.last_seen_at)+'</td></tr>').join('')||'<tr><td colspan="4" class="empty-row">No registered customers yet.</td></tr>'
}
function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return '—'}}
function renderSocials(){
  $('socialList').innerHTML=socials.map(s=>'<div class="social-row" data-social="'+esc(s.id)+'"><strong>'+esc(s.label||s.platform)+'</strong><input class="social-url" type="url" value="'+esc(s.url||'')+'" placeholder="https://..."><label class="check-row"><input class="social-active" type="checkbox" '+(s.is_active?'checked':'')+'> Live</label><input class="social-order" type="number" value="'+Number(s.sort_order||0)+'"><div><button class="save-social">Save</button> · <button class="delete-social">Delete</button></div></div>').join('');
  document.querySelectorAll('[data-social]').forEach(row=>{
    const id=row.dataset.social;
    row.querySelector('.save-social').onclick=()=>saveSocialRow(id,row);
    row.querySelector('.delete-social').onclick=()=>deleteSocial(id);
  });
}
async function saveSocialRow(id,row){
  try{
    const payload={url:row.querySelector('.social-url').value.trim()||null,is_active:row.querySelector('.social-active').checked,sort_order:Number(row.querySelector('.social-order').value||0)};
    await api('/rest/v1/gippi_social_links?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:payload,prefer:'return=representation'});
    showNotice('Social link updated'); await loadData();
  }catch(e){showNotice(e.message,true)}
}
async function deleteSocial(id){
  if(!confirm('Delete this social link?')) return;
  try{await api('/rest/v1/gippi_social_links?id=eq.'+encodeURIComponent(id),{method:'DELETE'});showNotice('Social link deleted');await loadData()}catch(e){showNotice(e.message,true)}
}
function openProduct(id){
  const p=id?products.find(x=>x.id===id):null;
  $('productDialogTitle').textContent=p?'Edit product':'Add product';
  $('productId').value=p?.id||'';
  $('pTitle').value=p?.title||''; $('pSlug').value=p?.slug||''; $('pShortTitle').value=p?.short_title||'';
  $('pEyebrow').value=p?.eyebrow||''; $('pCategory').value=p?.category||'Creative'; $('pStatus').value=p?.status||'published';
  $('pPrice').value=p?.price??''; $('pCompareAt').value=p?.compare_at??''; $('pSortOrder').value=p?.sort_order??products.length*10+10;
  $('pCheckoutUrl').value=p?.checkout_url||''; $('pTagline').value=p?.tagline||''; $('pDescription').value=p?.description||'';
  $('pFeatures').value=Array.isArray(p?.features)?p.features.join('\n'):''; $('pImageUrl').value=p?.image_url||'';
  $('pImageAlt').value=p?.image_alt||''; $('pSeoTitle').value=p?.seo_title||''; $('pSeoDescription').value=p?.seo_description||''; $('pSeoKeywords').value=p?.seo_keywords||'';
  $('pImageFile').value=''; $('deleteProductBtn').classList.toggle('hidden',!p); updatePreview();
  $('productDialog').showModal();
}
function updatePreview(){
  const url=$('pImageUrl').value.trim(), img=$('pImagePreview'), empty=$('noImage');
  if(url){img.src=url;img.style.display='block';empty.style.display='none'}else{img.removeAttribute('src');img.style.display='none';empty.style.display='block'}
}
async function uploadProductImage(file){
  if(!file) return null;
  if(file.size>5*1024*1024) throw new Error('Image must be 5 MB or smaller');
  const safe=file.name.toLowerCase().replace(/[^a-z0-9._-]+/g,'-');
  const path='products/'+Date.now()+'-'+crypto.randomUUID()+'-'+safe;
  const encoded=path.split('/').map(encodeURIComponent).join('/');
  await api('/storage/v1/object/gippi-product-images/'+encoded,{method:'POST',rawBody:file,contentType:file.type||'application/octet-stream'});
  return SUPABASE_URL+'/storage/v1/object/public/gippi-product-images/'+encoded;
}
async function saveProduct(event){
  event.preventDefault();
  try{
    const id=$('productId').value;
    let imageUrl=$('pImageUrl').value.trim()||null;
    const file=$('pImageFile').files[0]; if(file) imageUrl=await uploadProductImage(file);
    const title=$('pTitle').value.trim(), slug=$('pSlug').value.trim()||slugify(title);
    if(!title||!slug) throw new Error('Title and slug are required');
    const payload={
      title,slug,short_title:$('pShortTitle').value.trim()||null,eyebrow:$('pEyebrow').value.trim()||null,
      category:$('pCategory').value.trim()||'Creative',status:$('pStatus').value,
      price:Number($('pPrice').value||0),compare_at:$('pCompareAt').value===''?null:Number($('pCompareAt').value),
      sort_order:Number($('pSortOrder').value||0),checkout_url:$('pCheckoutUrl').value.trim()||null,
      tagline:$('pTagline').value.trim()||null,description:$('pDescription').value.trim()||null,
      features:$('pFeatures').value.split('\n').map(x=>x.trim()).filter(Boolean),image_url:imageUrl,
      image_alt:$('pImageAlt').value.trim()||title,seo_title:$('pSeoTitle').value.trim()||null,
      seo_description:$('pSeoDescription').value.trim()||null,seo_keywords:$('pSeoKeywords').value.trim()||null
    };
    if(id) await api('/rest/v1/gippi_products?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:payload,prefer:'return=representation'});
    else await api('/rest/v1/gippi_products',{method:'POST',body:payload,prefer:'return=representation'});
    $('productDialog').close(); showNotice(id?'Product updated':'Product added'); await loadData();
  }catch(e){showNotice(e.message,true)}
}
async function deleteProduct(){
  const id=$('productId').value;if(!id||!confirm('Permanently delete this product?')) return;
  try{await api('/rest/v1/gippi_products?id=eq.'+encodeURIComponent(id),{method:'DELETE'});$('productDialog').close();showNotice('Product deleted');await loadData()}catch(e){showNotice(e.message,true)}
}
async function addSocial(event){
  event.preventDefault();
  try{
    const payload={platform:$('sPlatform').value.trim().toLowerCase(),label:$('sLabel').value.trim(),url:$('sUrl').value.trim(),sort_order:Number($('sSortOrder').value||100),is_active:$('sActive').checked};
    await api('/rest/v1/gippi_social_links',{method:'POST',body:payload,prefer:'return=representation'});
    $('socialDialog').close();event.target.reset();$('sActive').checked=true;showNotice('Social link added');await loadData();
  }catch(e){showNotice(e.message,true)}
}
async function boot(){
  await restoreSession();
  if(!session){setScreen('auth');return}
  try{
    if(await isAdmin()){setScreen('admin');await loadData();switchView('overview')}
    else setScreen('claim');
  }catch(e){showNotice(e.message,true);setScreen('auth')}
}
$('adminGoogleBtn').onclick=async()=>{
  try{
    const settingsResponse=await fetch(SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:SUPABASE_KEY}})
    const settings=await settingsResponse.json()
    if(!settingsResponse.ok||!settings?.external?.google){
      showNotice('Google sign-in is not enabled in Supabase yet. Use email sign in for now.',true)
      return
    }
    const redirectTo=location.origin+location.pathname
    const url=new URL(SUPABASE_URL+'/auth/v1/authorize')
    url.searchParams.set('provider','google')
    url.searchParams.set('redirect_to',redirectTo)
    location.assign(url.toString())
  }catch(e){showNotice('Google sign-in is temporarily unavailable.',true)}
};
$('showSignIn').onclick=()=>{authMode='signin';$('showSignIn').classList.add('active');$('showSignUp').classList.remove('active');$('authSubmit').textContent='Sign in';$('authHelp').textContent='Only the claimed Gippi owner account can edit the store.'};
$('showSignUp').onclick=()=>{authMode='signup';$('showSignUp').classList.add('active');$('showSignIn').classList.remove('active');$('authSubmit').textContent='Create account';$('authHelp').textContent='Create your account, verify the email if prompted, then claim the store with your one-time owner code.'};
$('authForm').onsubmit=async e=>{
  e.preventDefault();const email=$('authEmail').value.trim(),password=$('authPassword').value;
  try{
    if(authMode==='signup'){
      const data=await authRequest('/auth/v1/signup?redirect_to='+encodeURIComponent(location.href),{email,password,data:{source:'gippi-studio'}});
      if(saveSession(data)){showNotice('Account created');await boot()}else showNotice('Account created. Check your email to confirm, then return here and sign in.')
    }else{
      const data=await authRequest('/auth/v1/token?grant_type=password',{email,password});saveSession(data);showNotice('Signed in');await boot()
    }
  }catch(err){showNotice(err.message,true)}
};
$('forgotBtn').onclick=async()=>{const email=$('authEmail').value.trim();if(!email)return showNotice('Enter your email first',true);try{await authRequest('/auth/v1/recover?redirect_to='+encodeURIComponent(location.href),{email});showNotice('Password recovery email sent')}catch(e){showNotice(e.message,true)}};
$('claimForm').onsubmit=async e=>{e.preventDefault();try{const ok=await api('/rest/v1/rpc/gippi_claim_admin',{method:'POST',body:{p_code:$('claimCode').value}});if(ok===true){showNotice('Owner access claimed');await boot()}else showNotice('Invalid or already-used claim code',true)}catch(err){showNotice(err.message,true)}};
async function signOut(){try{if(session)await api('/auth/v1/logout',{method:'POST'})}catch{}clearSession();location.reload()}
$('signOutBtn').onclick=signOut;$('claimSignOut').onclick=signOut;
document.querySelectorAll('#adminNav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
$('newProductBtn').onclick=()=>openProduct(null);$('productSearch').oninput=renderProducts;$('productStatusFilter').onchange=renderProducts;
$('closeProductDialog').onclick=()=>$('productDialog').close();$('cancelProductBtn').onclick=()=>$('productDialog').close();$('productForm').onsubmit=saveProduct;$('deleteProductBtn').onclick=deleteProduct;
$('pTitle').oninput=()=>{if(!$('productId').value&&!$('pSlug').dataset.touched)$('pSlug').value=slugify($('pTitle').value)};$('pSlug').oninput=()=>{$('pSlug').dataset.touched='1'};$('pImageUrl').oninput=updatePreview;
$('addSocialBtn').onclick=()=>$('socialDialog').showModal();$('closeSocialDialog').onclick=()=>$('socialDialog').close();$('cancelSocialBtn').onclick=()=>$('socialDialog').close();$('socialForm').onsubmit=addSocial;
boot();