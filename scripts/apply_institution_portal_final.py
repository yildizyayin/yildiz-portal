from pathlib import Path

app_path = Path('src/AppFinal.tsx')
api_path = Path('src/index-final.ts')
s = app_path.read_text()
b = api_path.read_text()


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f'anchor not found: {label}')
    return text.replace(old, new, 1)


cosmic = '''function CosmicLogo({compact=false}:{compact?:boolean}){return <div className={`cosmic-logo ${compact?'compact':''}`} aria-label="Yıldız Yayın"><div className="cosmic-orbit orbit-one"><span className="cosmic-planet planet-one"/><span className="cosmic-book book-one"><BookOpen size={compact?9:12}/></span></div><div className="cosmic-orbit orbit-two"><span className="cosmic-planet planet-two"/><span className="cosmic-book book-two"><BookOpen size={compact?8:11}/></span></div><div className="cosmic-core">★</div></div>}
function BrandLockup({compact=false}:{compact?:boolean}){return <div className={`brand-lockup ${compact?'compact':''}`}><CosmicLogo compact={compact}/><div className="brand-copy"><b>YILDIZ YAYIN</b><span>BASIM DAĞITIM HİZMETLERİ</span><small>Bilginin Yörüngesinde.</small></div></div>}

'''
s = replace_once(s, 'export default function App(){', cosmic + 'export default function App(){', 'insert cosmic logo')
s = replace_once(s,
    'function Splash({text}:{text:string}){return <div className="splash"><div className="brand-orbit"><span>★</span></div><strong>Yıldız Deneme Platformu</strong><small>{text}</small></div>}',
    'function Splash({text}:{text:string}){return <div className="splash"><BrandLockup/><strong>Yıldız Deneme Platformu</strong><small>{text}</small></div>}',
    'splash logo')
s = replace_once(s,
    '<div className="login-brand"><div className="star-logo">★</div><div><h1>Yıldız Deneme</h1><p>Takvim · Satış · Tedarik · Teslimat</p></div></div>',
    '<div className="login-brand"><BrandLockup/><div className="login-product"><h1>Yıldız Deneme</h1><p>Takvim · Sipariş · Tedarik · Teslimat</p></div></div>',
    'login logo')
s = replace_once(s,
    '<div className="brand"><div className="brand-icon">★</div><div><b>Yıldız Deneme</b><small>Operasyon Platformu</small></div></div>',
    '<div className="brand"><BrandLockup compact/></div>',
    'sidebar logo')

institution_nav = '''const institutionNav=[
 {key:'dashboard',label:'Ana Sayfa',icon:Home},
 {key:'exams',label:'Denemeler',icon:BookOpen,subs:['Deneme Seç','Takvimim']},
 {key:'operations',label:'Operasyon',icon:Truck,subs:['Gelen / Gelecek Denemeler']}
];
'''
s = replace_once(s, 'const nav=[', institution_nav + 'const nav=[', 'institution nav')
s = replace_once(s,
    "const visible=nav.filter(n=>!n.roles||n.roles.includes(user.role));",
    "const visible=user.role==='KURUM'?institutionNav:nav.filter(n=>!n.roles||n.roles.includes(user.role));",
    'role nav')

old_content = '''<div className="content">{section==='dashboard'&&<Dashboard user={user}/>} {section==='exams'&&<Exams boot={boot} sub={sub} user={user}/>} {section==='institutions'&&<Institutions boot={boot} sub={sub} user={user} refreshBoot={refreshBoot}/>} {section==='sales'&&<Sales boot={boot} sub={sub} user={user}/>} {section==='publishers'&&<Publishers boot={boot} sub={sub} user={user} refreshBoot={refreshBoot}/>} {section==='operations'&&<Operations boot={boot} sub={sub}/>} {section==='reports'&&<Reports/>} {section==='management'&&<Management boot={boot} sub={sub} refreshBoot={refreshBoot}/>}</div>'''
new_content = '''<div className="content">{user.role==='KURUM'?<>{section==='dashboard'&&<InstitutionDashboard boot={boot}/>} {section==='exams'&&(sub==='Takvimim'?<InstitutionCalendar boot={boot} user={user}/>:<PlanBuilder boot={boot} user={user}/>)} {section==='operations'&&<InstitutionOperations/>}</>:<>{section==='dashboard'&&<Dashboard user={user}/>} {section==='exams'&&<Exams boot={boot} sub={sub} user={user}/>} {section==='institutions'&&<Institutions boot={boot} sub={sub} user={user} refreshBoot={refreshBoot}/>} {section==='sales'&&<Sales boot={boot} sub={sub} user={user}/>} {section==='publishers'&&<Publishers boot={boot} sub={sub} user={user} refreshBoot={refreshBoot}/>} {section==='operations'&&<Operations boot={boot} sub={sub}/>} {section==='reports'&&<Reports/>} {section==='management'&&<Management boot={boot} sub={sub} refreshBoot={refreshBoot}/>}</>}</div>'''
s = replace_once(s, old_content, new_content, 'shell role content')

institution_dashboard = '''function InstitutionDashboard({boot}:{boot:Bootstrap}){const orders=useAsync(()=>api('/api/orders'),[]),plans=useAsync(()=>{const season=boot.seasons.find(s=>s.is_active)?.id||'';return api(`/api/plans?season_id=${season}`)},[]);if(orders.loading||plans.loading)return <Loading/>;const os=((orders.data as any)?.items||[]).filter((x:any)=>x.status!=='IPTAL'),ps=(plans.data as any)?.items||[];const arrived=os.filter((x:any)=>x.delivered_at),coming=os.filter((x:any)=>!x.delivered_at);return <><div className="institution-hero"><BrandLockup/><div><span className="pill gold"><Sparkles size={14}/> Kurum Deneme Merkezi</span><h1>Denemelerinizi seçin, siparişinizi onaylayın ve teslimatı takip edin.</h1><p>Bu panel yalnız kurumunuzun deneme planı, takvimi, siparişleri ve gelen/gelecek denemelerini gösterir.</p></div></div><div className="kpi-grid"><Kpi icon={CalendarDays} label="Planlanan Deneme" value={ps.length} sub="Kurum takviminizde"/><Kpi icon={ShoppingCart} label="Onaylı Sipariş" value={os.length} sub={`${os.reduce((t:number,x:any)=>t+Number(x.quantity||0),0)} adet`}/><Kpi icon={Truck} label="Gelecek Deneme" value={coming.length} sub="Teslimat bekliyor"/><Kpi icon={PackageCheck} label="Gelen Deneme" value={arrived.length} sub="Kuruma teslim edildi"/></div><Panel title="Yaklaşan siparişleriniz" icon={Clock3}>{coming.length?<DataTable cols={['Sınıf','Yayınevi','Deneme','Adet','Tahmini Sevk','Uygulama']} rows={coming.slice(0,8).map((x:any)=>[x.grade_name,x.publisher_name,x.exam_name,x.quantity,fmtDate(x.estimated_ship_date),`${fmtShort(x.application_start_date)}–${fmtShort(x.application_end_date)}`])}/>:<Empty text="Bekleyen deneme siparişiniz yok."/>}</Panel></>}

'''
s = replace_once(s, 'function Dashboard({user}:{user:User}){', institution_dashboard + 'function Dashboard({user}:{user:User}){', 'institution dashboard')

pending_component = '''function InstitutionPendingOrders({refreshKey}:{refreshKey:string}){const q=useAsync(()=>api('/api/order-pending'),[refreshKey]);const confirmOrder=async(x:any)=>{if(!confirm(`${x.exam_name} için ${x.planned_quantity} adet siparişi onaylıyor musunuz?`))return;await api('/api/orders',{method:'POST',body:JSON.stringify({exam_id:x.exam_id,quantity:Number(x.planned_quantity)})});q.reload()};const items=(q.data as any)?.items||[];return <section className="institution-order-confirm"><div className="panel-head"><div><ShoppingCart size={18}/><h3>Sipariş Onayı Bekleyen Denemeler</h3></div></div><p className="muted">Takvime eklediğiniz denemeleri burada siparişe dönüştürüp onaylayabilirsiniz.</p>{q.loading?<Loading/>:items.length?<DataTable cols={['Sınıf','Yayınevi','Deneme','Adet','Son Sipariş','']} rows={items.map((x:any)=>[x.grade_name,x.publisher_name,x.exam_name,x.planned_quantity,fmtDate(x.last_order_date),<button key="o" className="btn primary tiny" onClick={()=>confirmOrder(x)}><Check size={14}/> Siparişi Onayla</button>])}/>:<Empty text="Sipariş onayı bekleyen deneme yok."/>}</section>}

'''
s = replace_once(s, 'function QuantityModal({boot,exams,close,save}', pending_component + 'function QuantityModal({boot,exams,close,save}', 'institution order confirm component')
s = replace_once(s,
    '{qtyModal&&<QuantityModal boot={boot} exams={selectedItems} close={()=>setQtyModal(false)} save={save}/>}</>}',
    "{qtyModal&&<QuantityModal boot={boot} exams={selectedItems} close={()=>setQtyModal(false)} save={save}/>} {user.role==='KURUM'&&<InstitutionPendingOrders refreshKey={msg}/>}</>}",
    'pending orders in plan builder')

inst_ops = '''function InstitutionOperations(){const q=useAsync(()=>api('/api/orders'),[]);if(q.loading)return <Loading/>;if(q.error)return <ErrorState text={q.error} retry={q.reload}/>;const all=((q.data as any)?.items||[]).filter((x:any)=>x.status!=='IPTAL');const arrived=all.filter((x:any)=>x.delivered_at);const coming=all.filter((x:any)=>!x.delivered_at);const status=(x:any)=>x.delivered_at?'Geldi':x.sent_to_institution_at?'Yolda':x.status==='URUN_GELDI'?'Gönderime Hazırlanıyor':'Tedarik / Hazırlık';return <><div className="institution-ops-head"><div><h2>Deneme Operasyonum</h2><p>Yalnız kurumunuzun sipariş verdiği denemeler gösterilir.</p></div><div className="ops-counts"><span><b>{coming.length}</b> gelecek</span><span><b>{arrived.length}</b> gelen</span></div></div><div className="institution-ops-grid"><Panel title="Gelecek Denemeler" icon={Truck}>{coming.length?<DataTable cols={['Sınıf','Yayınevi','Deneme','Adet','Tahmini Sevk','Uygulama','Durum']} rows={coming.map((x:any)=>[x.grade_name,x.publisher_name,x.exam_name,x.quantity,fmtDate(x.estimated_ship_date),`${fmtShort(x.application_start_date)}–${fmtShort(x.application_end_date)}`,<Badge key="s" text={status(x)} tone={x.sent_to_institution_at?'info':'warn'}/>])}/>:<Empty text="Gelecek deneme bulunmuyor."/>}</Panel><Panel title="Gelen Denemeler" icon={PackageCheck}>{arrived.length?<DataTable cols={['Sınıf','Yayınevi','Deneme','Adet','Teslim Tarihi','Uygulama Durumu']} rows={arrived.map((x:any)=>[x.grade_name,x.publisher_name,x.exam_name,x.quantity,fmtDate(String(x.delivered_at).slice(0,10)),x.exam_applied_at?<Badge key="a" text="Uygulandı" tone="good"/>:<Badge key="a" text="Uygulama Bekliyor" tone="info"/>])}/>:<Empty text="Henüz kuruma ulaşmış deneme bulunmuyor."/>}</Panel></div></>}

'''
s = replace_once(s, 'function Operations({boot,sub}:{boot:Bootstrap;sub:string}){', inst_ops + 'function Operations({boot,sub}:{boot:Bootstrap;sub:string}){', 'institution operations')

css_anchor = '.error-box>div{margin:3px 0}@media(max-width:900px)'
css_extra = '''.error-box>div{margin:3px 0}.brand-lockup{display:flex;align-items:center;gap:10px}.brand-copy{display:grid;line-height:1.06}.brand-copy>b{font-size:14px;letter-spacing:.08em;color:#f7faff}.brand-copy>span{font-size:8px;letter-spacing:.12em;color:#a7b4cb;margin-top:2px}.brand-copy>small{font-size:10px;color:#45d7ff;margin-top:4px}.brand-lockup.compact .brand-copy>b{font-size:12px}.brand-lockup.compact .brand-copy>span{font-size:7px}.brand-lockup.compact .brand-copy>small{font-size:9px}.cosmic-logo{position:relative;width:64px;height:64px;flex:0 0 64px;filter:drop-shadow(0 0 12px rgba(69,215,255,.35))}.cosmic-logo.compact{width:46px;height:46px;flex-basis:46px}.cosmic-core{position:absolute;inset:28%;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#fff 0,#45d7ff 35%,#1e8bff 65%,#725cff 100%);color:#fff;font-size:22px;box-shadow:0 0 22px rgba(69,215,255,.75),0 0 42px rgba(114,92,255,.35);z-index:3}.compact .cosmic-core{font-size:16px}.cosmic-orbit{position:absolute;border:1px solid rgba(69,215,255,.38);border-radius:50%;animation:yd-orbit 8s linear infinite}.orbit-one{inset:7%;transform:rotate(12deg)}.orbit-two{inset:18% -2%;animation-duration:11s;animation-direction:reverse;transform:rotate(-22deg)}.cosmic-planet,.cosmic-book{position:absolute;display:flex;align-items:center;justify-content:center}.cosmic-planet{width:7px;height:7px;border-radius:50%;background:#45d7ff;box-shadow:0 0 9px #45d7ff}.planet-one{top:-4px;left:48%}.planet-two{right:-4px;top:58%;background:#725cff;box-shadow:0 0 9px #725cff}.cosmic-book{padding:2px;border-radius:5px;background:#07152d;color:#f7faff;border:1px solid rgba(69,215,255,.65);box-shadow:0 0 8px rgba(69,215,255,.35)}.book-one{right:-7px;top:24%}.book-two{left:-7px;bottom:22%}@keyframes yd-orbit{to{transform:rotate(372deg)}}.sidebar .brand{padding:17px 14px}.sidebar .brand-lockup{gap:8px}.login-brand{align-items:center!important;gap:16px!important}.login-brand .brand-copy>b{font-size:16px}.login-brand .brand-copy>span{font-size:9px}.login-brand .brand-copy>small{font-size:11px}.login-product{border-left:1px solid rgba(167,180,203,.22);padding-left:14px}.login-product h1{margin:0}.login-product p{margin:4px 0 0}.splash .brand-lockup{margin-bottom:12px}.institution-hero{display:flex;gap:24px;align-items:center;padding:22px 26px;border-radius:22px;margin-bottom:18px;background:radial-gradient(circle at 10% 20%,rgba(30,139,255,.22),transparent 28%),linear-gradient(135deg,#030817,#07152d 58%,#0c2351);color:#f7faff;border:1px solid rgba(69,215,255,.18)}.institution-hero h1{margin:8px 0 6px;font-size:26px}.institution-hero p{margin:0;color:#a7b4cb}.institution-order-confirm{margin-top:22px;padding:18px;border:1px solid #dfe7f1;border-radius:16px;background:#fff}.institution-ops-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:16px}.institution-ops-head h2{margin:0 0 5px}.institution-ops-head p{margin:0;color:#667085}.ops-counts{display:flex;gap:8px}.ops-counts span{padding:9px 12px;border-radius:12px;background:#f3f7fd;color:#475467}.ops-counts b{color:#102a43}.institution-ops-grid{display:grid;gap:18px}.institution-ops-grid .panel{overflow:hidden}@media(max-width:900px)'''
s = replace_once(s, css_anchor, css_extra, 'institution css')

b = b.replace("app.get('/api/opportunities', async c=>", "app.get('/api/opportunities', requireRoles('SUPER_ADMIN','ADMIN','PERSONEL'), async c=>", 1)
b = b.replace("e.name exam_name,e.code exam_code,p.name publisher_name,g.name grade_name", "e.name exam_name,e.code exam_code,e.estimated_ship_date,e.application_start_date,e.application_end_date,p.name publisher_name,g.name grade_name", 1)
b = b.replace("app.get('/api/reports/summary', async c=>", "app.get('/api/reports/summary', requireRoles('SUPER_ADMIN','ADMIN','PERSONEL'), async c=>", 1)

for token in ['institutionNav', 'InstitutionPendingOrders', 'InstitutionOperations', 'Bilginin Yörüngesinde.']:
    if token not in s:
        raise SystemExit(f'missing expected UI token: {token}')
if "app.get('/api/opportunities', requireRoles('SUPER_ADMIN','ADMIN','PERSONEL')" not in b:
    raise SystemExit('opportunity role guard missing')

app_path.write_text(s)
api_path.write_text(b)
