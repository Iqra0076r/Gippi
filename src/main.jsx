import React, {useEffect, useMemo, useState} from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { products as fallbackProducts } from './data'
import { fetchPublishedProducts, fetchActiveSocials } from './backend'
import { restoreCustomerAuth, signInCustomer, signUpCustomer, recoverCustomer, signOutCustomer, startGoogleCustomerOAuth } from './customerAuth'
import './styles.css'

const money = v => `${Number(v || 0).toFixed(Number(v || 0) % 1 ? 2 : 0)}`

function fromDbProduct(p){
  return {
    id:p.id,
    seoSlug:p.slug,
    slug:p.slug,
    name:p.title,
    eyebrow:p.eyebrow || '',
    category:p.category || 'Creative',
    price:Number(p.price || 0),
    compareAt:p.compare_at == null ? null : Number(p.compare_at),
    image:p.image_url || './products/design-vault.svg',
    imageAlt:p.image_alt || p.title,
    gallery:[p.image_url || './products/design-vault.svg'],
    tagline:p.tagline || '',
    description:p.description || '',
    features:Array.isArray(p.features) ? p.features : [],
    checkoutUrl:p.checkout_url || ''
  }
}

function Sparkle(){ return <span className="sparkle" aria-hidden>✦</span> }

function App(){
  const [filter,setFilter]=useState('All')
  const [query,setQuery]=useState('')
  const [quick,setQuick]=useState(null)
  const [cart,setCart]=useState(()=>JSON.parse(localStorage.getItem('gippi-cart')||'[]'))
  const [cartOpen,setCartOpen]=useState(false)
  const [menu,setMenu]=useState(false)
  const [catalog,setCatalog]=useState(fallbackProducts)
  const [socials,setSocials]=useState([])
  const [accountOpen,setAccountOpen]=useState(false)
  const [customer,setCustomer]=useState(null)
  const [customerProfile,setCustomerProfile]=useState(null)
  const [authNotice,setAuthNotice]=useState('')

  useEffect(()=>localStorage.setItem('gippi-cart',JSON.stringify(cart)),[cart])
  useEffect(()=>{
    let active=true
    restoreCustomerAuth().then(result=>{
      if(!active) return
      if(result?.user) setCustomer(result.user)
      if(result?.profile) setCustomerProfile(result.profile)
      if(result?.oauthCompleted){ setAccountOpen(true); setAuthNotice('Welcome to Gippi. Your Google account is connected.') }
      if(result?.error){ setAuthNotice(result.error) }
    }).catch(()=>{})
    return ()=>{active=false}
  },[])
  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      try{
        const [dbProducts,dbSocials]=await Promise.all([fetchPublishedProducts(),fetchActiveSocials()])
        if(cancelled) return
        if(Array.isArray(dbProducts)&&dbProducts.length) setCatalog(dbProducts.map(fromDbProduct))
        if(Array.isArray(dbSocials)) setSocials(dbSocials)
      }catch(error){
        console.warn('Gippi backend unavailable; using bundled catalog.',error)
      }
    })()
    return ()=>{cancelled=true}
  },[])
  const filtered=useMemo(()=>catalog.filter(p=>
    (filter==='All'||p.category===filter) && (`${p.name} ${p.tagline} ${p.category}`).toLowerCase().includes(query.toLowerCase())
  ),[filter,query,catalog])
  const liveCategories=useMemo(()=>['All',...new Set(catalog.map(p=>p.category).filter(Boolean))],[catalog])

  const add=p=>{
    setCart(c=>c.some(x=>x.id===p.id)?c:[...c,p])
    setCartOpen(true)
  }
  const total=cart.reduce((s,p)=>s+p.price,0)

  return <div className="site-shell">
    <div className="ambient ambient-a"/><div className="ambient ambient-b"/>
    <Announcement/>
    <header className="nav glass">
      <a className="brand" href="#top" aria-label="Gippi home">Gippi<Sparkle/></a>
      <nav className={menu?'navlinks open':'navlinks'}>
        <a href="#collection" onClick={()=>setMenu(false)}>Shop</a>
        <a href="#why" onClick={()=>setMenu(false)}>Why Gippi</a>
        <a href="#bundle" onClick={()=>setMenu(false)}>Bundle</a>
        <a href="#faq" onClick={()=>setMenu(false)}>FAQ</a>
      </nav>
      <div className="nav-actions">
        <button className="account-btn" onClick={()=>setAccountOpen(true)} aria-label={customer?'Open account':'Sign in'}>
          {customer?(customerProfile?.avatar_url?<img src={customerProfile.avatar_url} alt=""/>:<span className="account-initial">{(customerProfile?.full_name||customer.email||'G').slice(0,1).toUpperCase()}</span>):<span className="account-icon">◯</span>}
          <span className="account-label">{customer?(customerProfile?.full_name?.split(' ')[0]||'Account'):'Sign in'}</span>
        </button>
        <button className="icon-btn menu-btn" onClick={()=>setMenu(v=>!v)} aria-label="Menu">☰</button>
        <button className="cart-btn" onClick={()=>setCartOpen(true)}>Cart <span>{cart.length}</span></button>
      </div>
    </header>
    <main id="top">
      <Hero onExplore={()=>document.querySelector('#collection')?.scrollIntoView({behavior:'smooth'})}/>
      <ValueRibbon/>
      <section className="collection section" id="collection">
        <div className="section-head">
          <div><p className="kicker">The Gippi collection</p><h2>Digital products that feel like <em>premium software.</em></h2></div>
          <p className="section-copy">Not filler. Not basic downloads. Each system combines structure, design, automation and practical depth.</p>
        </div>
        <div className="shop-tools glass-soft">
          <div className="chips">{liveCategories.map(c=><button className={filter===c?'chip active':'chip'} onClick={()=>setFilter(c)} key={c}>{c}</button>)}</div>
          <label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search the collection"/></label>
        </div>
        <motion.div layout className="product-grid">
          <AnimatePresence mode="popLayout">
          {filtered.map((p,i)=><ProductCard key={p.id} p={p} i={i} onQuick={()=>setQuick(p)} onAdd={()=>add(p)}/>) }
          </AnimatePresence>
        </motion.div>
      </section>
      <EditorialBreak/>
      <Why/>
      <Bundle addAll={()=>{setCart(catalog);setCartOpen(true)}}/>
      <SeoDiscovery onPick={(category)=>{setFilter(category);document.querySelector('#collection')?.scrollIntoView({behavior:'smooth'})}}/>
      <FAQ/>
      <Newsletter/>
      <ReachUs socials={socials}/>
    </main>
    <Footer socials={socials}/>
    <AnimatePresence>{quick&&<QuickView p={quick} onClose={()=>setQuick(null)} onAdd={()=>add(quick)}/>}</AnimatePresence>
    <AnimatePresence>{cartOpen&&<CartDrawer cart={cart} setCart={setCart} total={total} onClose={()=>setCartOpen(false)}/>}</AnimatePresence>
    <AnimatePresence>{accountOpen&&<AccountModal customer={customer} profile={customerProfile} notice={authNotice} onClose={()=>{setAccountOpen(false);setAuthNotice('')}} onSignedIn={(result)=>{setCustomer(result.user||null);setCustomerProfile(result.profile||null);setAuthNotice('Welcome back to Gippi.')}} onSignedOut={()=>{setCustomer(null);setCustomerProfile(null);setAuthNotice('')}}/>}</AnimatePresence>
  </div>
}

function Announcement(){return <div className="announcement">Instant digital delivery <span>•</span> Premium systems <span>•</span> Built for real work</div>}

function Hero({onExplore}){
  const mx=useMotionValue(0), my=useMotionValue(0)
  const sx=useSpring(mx,{stiffness:80,damping:18}), sy=useSpring(my,{stiffness:80,damping:18})
  const rx=useTransform(sy,[-0.5,0.5],[5,-5]), ry=useTransform(sx,[-0.5,0.5],[-6,6])
  const move=e=>{const r=e.currentTarget.getBoundingClientRect();mx.set((e.clientX-r.left)/r.width-.5);my.set((e.clientY-r.top)/r.height-.5)}
  return <section className="hero section" onMouseMove={move}>
    <div className="hero-copy">
      <motion.p initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="kicker">Create <Sparkle/> organize <Sparkle/> grow</motion.p>
      <motion.h1 initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{delay:.08}}>Beautiful systems for a <em>brighter business.</em></motion.h1>
      <motion.p initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:.14}} className="hero-sub">Premium digital products for creators, professionals and small businesses—designed to look exceptional and work hard.</motion.p>
      <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay:.2}} className="hero-cta">
        <button className="btn primary" onClick={onExplore}>Explore the collection <span>↗</span></button>
        <a className="btn ghost" href="#bundle">Get the complete suite</a>
      </motion.div>
      <div className="mini-proof"><span>8 flagship systems</span><span>Instant access</span><span>Global digital delivery</span></div>
    </div>
    <motion.div className="hero-stage" style={{rotateX:rx,rotateY:ry,transformPerspective:1000}}>
      <motion.div className="hero-card hero-main" initial={{opacity:0,scale:.94,y:24}} animate={{opacity:1,scale:1,y:0}} transition={{duration:.7}}><img src="./products/business-command.svg" alt="Business spreadsheet dashboard template and CRM system by Gippi" width="800" height="1000" fetchPriority="high" decoding="async"/></motion.div>
      <motion.div className="hero-card hero-float one" animate={{y:[0,-14,0],rotate:[-8,-5,-8]}} transition={{duration:5,repeat:Infinity,ease:'easeInOut'}}><img src="./products/content-empire.svg" alt="Editable Canva business template bundle for creators" width="800" height="1000" decoding="async"/></motion.div>
      <motion.div className="hero-card hero-float two" animate={{y:[0,12,0],rotate:[8,5,8]}} transition={{duration:6,repeat:Infinity,ease:'easeInOut'}}><img src="./products/life-os.svg" alt="Premium digital planner and printable life organization system" width="800" height="1000" decoding="async"/></motion.div>
      <div className="orbit-badge"><b>Gippi</b><span>premium digital systems</span></div>
    </motion.div>
  </section>
}

function ValueRibbon(){return <div className="ticker-wrap"><div className="ticker">{Array.from({length:2}).map((_,j)=><React.Fragment key={j}>{['Editable where it matters','Premium visual systems','Real workflows, not filler','Designed for global buyers','Commercially packaged'].map(x=><span key={j+x}>{x}<Sparkle/></span>)}</React.Fragment>)}</div></div>}

function ProductCard({p,i,onQuick,onAdd}){
  return <motion.article layout initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.2}} transition={{delay:(i%4)*.05}} className="product-card">
    <button className="visual" onClick={onQuick} aria-label={`Quick view ${p.name}`}>
      <img src={p.image} alt={p.imageAlt || p.name} loading="lazy" decoding="async" width="800" height="1000"/>
      <span className="quick">Quick view ↗</span>
    </button>
    <div className="product-meta">
      <p className="eyebrow">{p.eyebrow}</p><h3><button className="product-title-btn" onClick={onQuick}>{p.name}</button></h3><p>{p.tagline}</p>
      <button className="seo-details detail-btn" onClick={onQuick}>View full product details →</button>
      <div className="price-row"><div><b>{money(p.price)}</b>{p.compareAt!=null&&<s>{money(p.compareAt)}</s>}</div><button className="add" onClick={onAdd}>Add to cart +</button></div>
    </div>
  </motion.article>
}

function EditorialBreak(){return <section className="editorial section">
  <div className="editorial-panel"><p className="kicker">The anti-template template store</p><h2>Designed like a brand.<br/>Built like a system.<br/><em>Delivered like a product.</em></h2></div>
  <div className="editorial-cards">
    <div><strong>01</strong><h3>Purpose before pages.</h3><p>Every file exists to solve a real workflow—not inflate a page count.</p></div>
    <div><strong>02</strong><h3>Premium by default.</h3><p>Editorial layouts, thoughtful hierarchy and a consistent product language.</p></div>
    <div><strong>03</strong><h3>Ready to use.</h3><p>Guides, sample data, clean versions and organized delivery make onboarding fast.</p></div>
  </div>
</section>}

function Why(){return <section id="why" className="why section">
  <div className="section-head"><div><p className="kicker">Why Gippi</p><h2>Luxury aesthetics.<br/><em>Serious utility.</em></h2></div><p className="section-copy">The visual polish gets attention. The structure keeps the product useful long after purchase.</p></div>
  <div className="feature-bento">
    <div className="bento large"><span>✦</span><h3>One coherent design language</h3><p>Cream, ink, violet and lime create a recognizable premium identity across every product.</p></div>
    <div className="bento"><span>⌁</span><h3>Built for real workflows</h3><p>Dashboards, trackers, planners and systems that reduce friction.</p></div>
    <div className="bento"><span>↗</span><h3>Instant digital delivery</h3><p>No shipping. No setup appointment. Buyers can start immediately.</p></div>
    <div className="bento wide"><div><span>◈</span><h3>Seller-ready packaging</h3><p>Product assets, documentation, previews and licensing designed for ecommerce.</p></div><div className="bento-metric"><b>8</b><small>flagship systems</small></div></div>
  </div>
</section>}

function Bundle({addAll}){return <section id="bundle" className="bundle section">
  <div className="bundle-art"><div className="stack s1"><img src="./products/content-empire.svg"/></div><div className="stack s2"><img src="./products/business-command.svg"/></div><div className="stack s3"><img src="./products/course-creator.svg"/></div></div>
  <div className="bundle-copy"><p className="kicker">The complete Gippi collection</p><h2>One purchase.<br/><em>Eight premium systems.</em></h2><p>Build your business, organize your life, publish content, launch courses, manage your career and create faster—with one cohesive digital toolkit.</p><div className="bundle-price"><b>$149</b><s>$521 combined value</s></div><button className="btn dark" onClick={addAll}>Add complete collection <span>↗</span></button></div>
</section>}

function SeoDiscovery({onPick}){return <section className="seo-discovery section" aria-labelledby="shop-by-workflow">
  <div className="section-head"><div><p className="kicker">Shop by workflow</p><h2 id="shop-by-workflow">Find the right <em>digital system</em> faster.</h2></div><p className="section-copy">Explore focused collections without leaving the storefront. In-depth buying guides open separately so your place in the store is preserved.</p></div>
  <div className="seo-link-grid">
    <button onClick={()=>onPick('Business')}><span>Business tools</span><strong>Spreadsheet dashboards, CRM, invoicing & course creation</strong><small>Show business digital products →</small></button>
    <button onClick={()=>onPick('Productivity')}><span>Productivity</span><strong>Digital planners, Notion systems & life organization</strong><small>Show productivity systems →</small></button>
    <button onClick={()=>onPick('Creative')}><span>Creative templates</span><strong>Canva templates, ebook systems & design assets</strong><small>Show creative digital products →</small></button>
    <button onClick={()=>onPick('Career')}><span>Career tools</span><strong>ATS resumes, CV templates & job-search systems</strong><small>Show career resources →</small></button>
  </div>
  <div className="guide-links">
    <a target="_blank" rel="noopener noreferrer" href="./guides/best-digital-business-tools/">Best digital business tools for small businesses ↗</a>
    <a target="_blank" rel="noopener noreferrer" href="./guides/digital-planner-vs-notion-vs-spreadsheet/">Digital planner vs Notion vs spreadsheet ↗</a>
    <a target="_blank" rel="noopener noreferrer" href="./guides/how-to-build-a-small-business-operating-system/">How to build a small-business operating system ↗</a>
  </div>
</section>}

function FAQ(){const items=[['How are products delivered?','Digitally, immediately after purchase through the checkout provider connected to the store.'],['Can I edit the files?','Where a product is designed to be editable, the package includes editable formats or clear access instructions.'],['Can I resell the original files?','No. Standard products are licensed for personal and internal business use unless a product-specific commercial license says otherwise.'],['Do I need special software?','Each product clearly identifies its compatible software before purchase. Many include PDF, spreadsheet or editable-template formats.']];return <section id="faq" className="faq section"><p className="kicker">Questions, answered</p><h2>Everything you need to know.</h2><div className="faq-list">{items.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>}

function Newsletter(){return <section className="newsletter section"><div><p className="kicker">Gippi dispatch</p><h2>New systems. Better workflows.<br/><em>Zero clutter.</em></h2></div><form onSubmit={e=>e.preventDefault()}><input type="email" placeholder="Email address" aria-label="Email address"/><button className="btn primary">Join the list ↗</button></form></section>}

function socialGlyph(platform=''){
  const p=platform.toLowerCase()
  if(p.includes('instagram')) return '◎'
  if(p.includes('facebook')) return 'f'
  if(p==='x'||p.includes('twitter')) return '𝕏'
  if(p.includes('youtube')) return '▶'
  if(p.includes('linkedin')) return 'in'
  if(p.includes('pinterest')) return 'P'
  if(p.includes('tiktok')) return '♪'
  return '↗'
}

function ReachUs({socials}){if(!socials?.length)return null;return <section className="reach-us section" id="reach-us"><div><p className="kicker">Reach us</p><h2>Follow Gippi beyond the store.</h2><p>Product drops, new systems and practical creative-business ideas. Social profiles open in a new tab.</p></div><div className="reach-socials">{socials.map(s=><a key={s.id||s.platform} href={s.url} target="_blank" rel="noopener noreferrer"><span>{socialGlyph(s.platform)}</span><div><b>{s.label||s.platform}</b><small>Open profile ↗</small></div></a>)}</div></section>}

function QuickView({p,onClose,onAdd}){const [img,setImg]=useState(p.gallery[0]);return <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>e.target===e.currentTarget&&onClose()}><motion.div className="quick-modal" initial={{opacity:0,y:24,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:20,scale:.98}}><button className="close" onClick={onClose}>×</button><div className="quick-gallery"><img className="quick-main" src={img} alt={p.name}/>{p.gallery.length>1&&<div className="thumbs">{p.gallery.map(g=><button key={g} className={img===g?'active':''} onClick={()=>setImg(g)}><img src={g}/></button>)}</div>}</div><div className="quick-copy"><p className="eyebrow">{p.eyebrow}</p><h2>{p.name}</h2><p className="lead">{p.description}</p><ul>{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul><div className="quick-buy"><div><b>{money(p.price)}</b>{p.compareAt!=null&&<s>{money(p.compareAt)}</s>}</div><button className="btn dark" onClick={onAdd}>Add to cart</button></div><small>Digital product · instant delivery after checkout</small></div></motion.div></motion.div>}

function CartDrawer({cart,setCart,total,onClose}){return <motion.div className="cart-layer" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>e.target===e.currentTarget&&onClose()}><motion.aside className="cart-drawer" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',stiffness:240,damping:28}}><div className="cart-head"><div><p className="kicker">Your collection</p><h2>Cart <span>{cart.length}</span></h2></div><button className="close" onClick={onClose}>×</button></div><div className="cart-items">{cart.length===0?<div className="empty"><span>◇</span><h3>Your cart is beautifully empty.</h3><p>Add a premium system to get started.</p></div>:cart.map(p=><div className="cart-item" key={p.id}><img src={p.image}/><div><b>{p.name}</b><span>{money(p.price)}</span></div><button onClick={()=>setCart(c=>c.filter(x=>x.id!==p.id))}>Remove</button></div>)}</div><div className="cart-footer"><div className="cart-total"><span>Total</span><b>{money(total)}</b></div><button className="btn dark full" onClick={()=>{if(cart.length===1&&cart[0].checkoutUrl){window.open(cart[0].checkoutUrl,'_blank','noopener,noreferrer')}else{alert('Checkout links can be managed per product from Gippi Admin.')}}}>Continue to checkout ↗</button><small>Secure checkout URL can be connected to Payhip, Lemon Squeezy, Shopify or another provider.</small></div></motion.aside></motion.div>}


function GoogleMark(){return <svg aria-hidden viewBox="0 0 24 24"><path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.5Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.3l-3.2-2.6c-.9.6-2 1-3.5 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.1 7.5l3.3 2.6C7.2 7.7 9.4 5.9 12 5.9Z"/></svg>}

function AccountModal({customer,profile,notice,onClose,onSignedIn,onSignedOut}){
  const [mode,setMode]=useState('signin')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState(notice||'')
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')

  const submit=async e=>{
    e.preventDefault();setBusy(true);setMessage('')
    try{
      if(mode==='signup'){
        const result=await signUpCustomer({email,password,fullName:name})
        if(result.session){onSignedIn(result);setMessage('Your Gippi account is ready.')}
        else setMessage('Account created. Check your email to confirm it, then sign in.')
      }else{
        const result=await signInCustomer({email,password})
        onSignedIn(result);setMessage('Welcome back.')
      }
    }catch(error){setMessage(error.message||'Unable to continue.')}
    finally{setBusy(false)}
  }
  const forgot=async()=>{
    if(!email){setMessage('Enter your email address first.');return}
    setBusy(true);try{await recoverCustomer(email);setMessage('Password recovery email sent.')}catch(e){setMessage(e.message)}finally{setBusy(false)}
  }
  const logout=async()=>{setBusy(true);try{await signOutCustomer()}finally{onSignedOut();setBusy(false);onClose()}}
  return <motion.div className="modal-backdrop account-layer" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <motion.div className="account-modal" initial={{opacity:0,y:24,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:18,scale:.98}}>
      <button className="close" onClick={onClose}>×</button>
      <div className="account-brand-panel"><a className="brand">Gippi<Sparkle/></a><div><p className="kicker">Your Gippi account</p><h2>Save your place in a brighter digital workspace.</h2><p>Sign in for a more personal store experience and a foundation for purchases, downloads and future customer tools.</p></div><div className="account-trust"><span>Secure Supabase authentication</span><span>Google or email access</span><span>Your account data stays protected</span></div></div>
      <div className="account-form-panel">
        {customer?<div className="account-profile">
          <div className="profile-avatar">{profile?.avatar_url?<img src={profile.avatar_url} alt=""/>:<span>{(profile?.full_name||customer.email||'G').slice(0,1).toUpperCase()}</span>}</div>
          <p className="eyebrow">Signed in</p><h3>{profile?.full_name||'Welcome to Gippi'}</h3><p>{customer.email}</p>
          <div className="profile-meta"><span>Provider <b>{profile?.provider||customer.app_metadata?.provider||'email'}</b></span><span>Account <b>Active</b></span></div>
          <button className="btn dark full" disabled={busy} onClick={logout}>Sign out</button>
        </div>:<>
          <div className="auth-switch"><button className={mode==='signin'?'active':''} onClick={()=>{setMode('signin');setMessage('')}}>Sign in</button><button className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setMessage('')}}>Create account</button></div>
          <button className="google-auth-btn" onClick={()=>startGoogleCustomerOAuth()}><GoogleMark/><span>Continue with Google</span></button>
          <div className="or-divider"><span>or continue with email</span></div>
          <form className="customer-auth-form" onSubmit={submit}>
            {mode==='signup'&&<label>Full name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Your name" required/></label>}
            <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required/></label>
            <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='signup'?'new-password':'current-password'} minLength="8" placeholder="8+ characters" required/></label>
            <button className="btn primary full" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create Gippi account':'Sign in to Gippi'}</button>
          </form>
          {mode==='signin'&&<button className="forgot-link" onClick={forgot}>Forgot your password?</button>}
          {message&&<p className="auth-message">{message}</p>}
          <p className="account-terms">By continuing, you agree to use Gippi responsibly. We never expose your password to the storefront.</p>
        </>}
      </div>
    </motion.div>
  </motion.div>
}

function Footer({socials}){return <footer><div className="footer-brand"><a className="brand" href="#top">Gippi<Sparkle/></a><p>Premium digital systems for brighter work.</p>{socials?.length>0&&<div className="social-links" aria-label="Gippi social media">{socials.map(s=><a key={s.id||s.platform} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label||s.platform}><span>{(s.label||s.platform||'?').slice(0,1).toUpperCase()}</span>{s.label||s.platform}</a>)}</div>}</div><div><b>Explore</b><a href="#collection">Shop</a><a href="#bundle">Complete suite</a><a href="#why">Why Gippi</a></div><div><b>Discover</b><a href="./collections/business-tools/">Business tools</a><a href="./collections/productivity-planners/">Productivity systems</a><a href="./collections/creative-templates/">Creative templates</a><a href="./collections/career-tools/">Career tools</a></div><div><b>Support</b><a href="#faq">FAQ</a><a href="./guides/best-digital-business-tools/">Guides</a><a href="#faq">Digital delivery</a></div><div className="footer-bottom"><span>© 2026 Gippi</span><span>Designed for digital-first business.</span></div></footer>}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
