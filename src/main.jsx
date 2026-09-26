import React, {useEffect, useMemo, useState} from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { products, categories } from './data'
import './styles.css'

const money = v => `${v}`
const productHref = p => `./digital-products/${p.seoSlug}/`

function Sparkle(){ return <span className="sparkle" aria-hidden>✦</span> }

function App(){
  const [filter,setFilter]=useState('All')
  const [query,setQuery]=useState('')
  const [quick,setQuick]=useState(null)
  const [cart,setCart]=useState(()=>JSON.parse(localStorage.getItem('gippi-cart')||'[]'))
  const [cartOpen,setCartOpen]=useState(false)
  const [menu,setMenu]=useState(false)

  useEffect(()=>localStorage.setItem('gippi-cart',JSON.stringify(cart)),[cart])
  const filtered=useMemo(()=>products.filter(p=>
    (filter==='All'||p.category===filter) && (`${p.name} ${p.tagline} ${p.category}`).toLowerCase().includes(query.toLowerCase())
  ),[filter,query])

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
          <div className="chips">{categories.map(c=><button className={filter===c?'chip active':'chip'} onClick={()=>setFilter(c)} key={c}>{c}</button>)}</div>
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
      <Bundle addAll={()=>{setCart(products);setCartOpen(true)}}/>
      <SeoDiscovery/>
      <FAQ/>
      <Newsletter/>
    </main>
    <Footer/>
    <AnimatePresence>{quick&&<QuickView p={quick} onClose={()=>setQuick(null)} onAdd={()=>add(quick)}/>}</AnimatePresence>
    <AnimatePresence>{cartOpen&&<CartDrawer cart={cart} setCart={setCart} total={total} onClose={()=>setCartOpen(false)}/>}</AnimatePresence>
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
      <p className="eyebrow">{p.eyebrow}</p><h3><a href={productHref(p)}>{p.name}</a></h3><p>{p.tagline}</p>
      <a className="seo-details" href={productHref(p)}>View full product details →</a>
      <div className="price-row"><div><b>{money(p.price)}</b><s>{money(p.compareAt)}</s></div><button className="add" onClick={onAdd}>Add to cart +</button></div>
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

function SeoDiscovery(){return <section className="seo-discovery section" aria-labelledby="shop-by-workflow">
  <div className="section-head"><div><p className="kicker">Shop by workflow</p><h2 id="shop-by-workflow">Find the right <em>digital system</em> faster.</h2></div><p className="section-copy">Explore focused collections for business operations, productivity, creative publishing and career growth, plus practical guides explaining which digital product fits each workflow.</p></div>
  <div className="seo-link-grid">
    <a href="./collections/business-tools/"><span>Business tools</span><strong>Spreadsheet dashboards, CRM, invoicing & course creation</strong><small>Explore business digital products →</small></a>
    <a href="./collections/productivity-planners/"><span>Productivity</span><strong>Digital planners, Notion systems & life organization</strong><small>Explore productivity systems →</small></a>
    <a href="./collections/creative-templates/"><span>Creative templates</span><strong>Canva templates, ebook systems & design assets</strong><small>Explore creative digital products →</small></a>
    <a href="./collections/career-tools/"><span>Career tools</span><strong>ATS resumes, CV templates & job-search systems</strong><small>Explore career resources →</small></a>
  </div>
  <div className="guide-links">
    <a href="./guides/best-digital-business-tools/">Best digital business tools for small businesses</a>
    <a href="./guides/digital-planner-vs-notion-vs-spreadsheet/">Digital planner vs Notion vs spreadsheet</a>
    <a href="./guides/how-to-build-a-small-business-operating-system/">How to build a small-business operating system</a>
  </div>
</section>}

function FAQ(){const items=[['How are products delivered?','Digitally, immediately after purchase through the checkout provider connected to the store.'],['Can I edit the files?','Where a product is designed to be editable, the package includes editable formats or clear access instructions.'],['Can I resell the original files?','No. Standard products are licensed for personal and internal business use unless a product-specific commercial license says otherwise.'],['Do I need special software?','Each product clearly identifies its compatible software before purchase. Many include PDF, spreadsheet or editable-template formats.']];return <section id="faq" className="faq section"><p className="kicker">Questions, answered</p><h2>Everything you need to know.</h2><div className="faq-list">{items.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>}

function Newsletter(){return <section className="newsletter section"><div><p className="kicker">Gippi dispatch</p><h2>New systems. Better workflows.<br/><em>Zero clutter.</em></h2></div><form onSubmit={e=>e.preventDefault()}><input type="email" placeholder="Email address" aria-label="Email address"/><button className="btn primary">Join the list ↗</button></form></section>}

function QuickView({p,onClose,onAdd}){const [img,setImg]=useState(p.gallery[0]);return <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>e.target===e.currentTarget&&onClose()}><motion.div className="quick-modal" initial={{opacity:0,y:24,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:20,scale:.98}}><button className="close" onClick={onClose}>×</button><div className="quick-gallery"><img className="quick-main" src={img} alt={p.name}/>{p.gallery.length>1&&<div className="thumbs">{p.gallery.map(g=><button key={g} className={img===g?'active':''} onClick={()=>setImg(g)}><img src={g}/></button>)}</div>}</div><div className="quick-copy"><p className="eyebrow">{p.eyebrow}</p><h2>{p.name}</h2><p className="lead">{p.description}</p><ul>{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul><div className="quick-buy"><div><b>{money(p.price)}</b><s>{money(p.compareAt)}</s></div><button className="btn dark" onClick={onAdd}>Add to cart</button></div><small>Digital product · instant delivery after checkout</small></div></motion.div></motion.div>}

function CartDrawer({cart,setCart,total,onClose}){return <motion.div className="cart-layer" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>e.target===e.currentTarget&&onClose()}><motion.aside className="cart-drawer" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',stiffness:240,damping:28}}><div className="cart-head"><div><p className="kicker">Your collection</p><h2>Cart <span>{cart.length}</span></h2></div><button className="close" onClick={onClose}>×</button></div><div className="cart-items">{cart.length===0?<div className="empty"><span>◇</span><h3>Your cart is beautifully empty.</h3><p>Add a premium system to get started.</p></div>:cart.map(p=><div className="cart-item" key={p.id}><img src={p.image}/><div><b>{p.name}</b><span>{money(p.price)}</span></div><button onClick={()=>setCart(c=>c.filter(x=>x.id!==p.id))}>Remove</button></div>)}</div><div className="cart-footer"><div className="cart-total"><span>Total</span><b>{money(total)}</b></div><button className="btn dark full" onClick={()=>alert('Connect your preferred checkout URL in the store configuration to activate payments.')}>Continue to checkout ↗</button><small>Secure checkout URL can be connected to Payhip, Lemon Squeezy, Shopify or another provider.</small></div></motion.aside></motion.div>}

function Footer(){return <footer><div className="footer-brand"><a className="brand" href="#top">Gippi<Sparkle/></a><p>Premium digital systems for brighter work.</p></div><div><b>Explore</b><a href="#collection">Shop</a><a href="#bundle">Complete suite</a><a href="#why">Why Gippi</a></div><div><b>Discover</b><a href="./collections/business-tools/">Business tools</a><a href="./collections/productivity-planners/">Productivity systems</a><a href="./collections/creative-templates/">Creative templates</a><a href="./collections/career-tools/">Career tools</a></div><div><b>Support</b><a href="#faq">FAQ</a><a href="./guides/best-digital-business-tools/">Guides</a><a href="#faq">Digital delivery</a></div><div className="footer-bottom"><span>© 2026 Gippi</span><span>Designed for digital-first business.</span></div></footer>}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
