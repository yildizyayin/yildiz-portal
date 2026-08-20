from pathlib import Path

APP=Path('src/AppFinal.tsx')
API=Path('src/index-final.ts')
s=APP.read_text(); b=API.read_text()

old="const sectionAllowed=(k:string)=>k==='exams'?(permitted(boot,'CATALOG_VIEW')||permitted(boot,'DIGITAL_VIEW')):k==='institutions'?permitted(boot,'INSTITUTIONS_VIEW'):k==='sales'?(permitted(boot,'OPPORTUNITIES_VIEW')||permitted(boot,'ORDERS_VIEW')||permitted(boot,'ORDERS_CREATE')):k==='publishers'?permitted(boot,'PUBLISHERS_VIEW'):k==='operations'?permitted(boot,'OPERATIONS_VIEW'):k==='reports'?permitted(boot,'REPORTS_VIEW'):true;const visible=user.role==='KURUM'?institutionNav:nav.filter(n=>(!n.roles||n.roles.includes(user.role))&&sectionAllowed(n.key));const choose=(k:string,s='')=>{setSection(k);setSub(s);setMobile(false)};"
new="const sectionAllowed=(k:string)=>k==='exams'?(permitted(boot,'CATALOG_VIEW')||permitted(boot,'DIGITAL_VIEW')):k==='institutions'?permitted(boot,'INSTITUTIONS_VIEW'):k==='sales'?(permitted(boot,'OPPORTUNITIES_VIEW')||permitted(boot,'ORDERS_VIEW')||permitted(boot,'ORDERS_CREATE')):k==='publishers'?(permitted(boot,'PUBLISHERS_VIEW')||permitted(boot,'OPERATIONS_VIEW')):k==='operations'?permitted(boot,'OPERATIONS_VIEW'):k==='reports'?permitted(boot,'REPORTS_VIEW'):true;const allowedSub=(k:string,x:string)=>k==='exams'?(x==='Cevap Anahtarları'?permitted(boot,'DIGITAL_VIEW'):permitted(boot,'CATALOG_VIEW')):k==='sales'?(x==='Satış Fırsatları'?permitted(boot,'OPPORTUNITIES_VIEW'):x==='Kuruma Sipariş Gir'?isAdmin(user)&&permitted(boot,'ORDERS_CREATE'):permitted(boot,'ORDERS_VIEW')):k==='publishers'?(x==='Sipariş Listeleri'?permitted(boot,'OPERATIONS_VIEW'):permitted(boot,'PUBLISHERS_VIEW')):true;const subsFor=(n:any)=>(n.subs||[]).filter((x:string)=>allowedSub(n.key,x));const visible=user.role==='KURUM'?institutionNav:nav.filter(n=>(!n.roles||n.roles.includes(user.role))&&sectionAllowed(n.key)&&(!n.subs||subsFor(n).length>0));const choose=(k:string,s='')=>{const node=(user.role==='KURUM'?institutionNav:nav).find(n=>n.key===k) as any;const ss=node?subsFor(node):[];setSection(k);setSub(s&&ss.includes(s)?s:(ss[0]||''));setMobile(false)};"
if old not in s: raise SystemExit('shell permission anchor missing')
s=s.replace(old,new,1)
s=s.replace("onClick={()=>choose(n.key,n.subs?.[0]||'')}","onClick={()=>choose(n.key,subsFor(n)[0]||'')}",1)
s=s.replace("{section===n.key&&n.subs&&<div className=\"subnav\">{n.subs.filter(s=>!(s==='Kuruma Sipariş Gir'&&!isAdmin(user))).map(s=><button key={s} className={sub===s?'active':''} onClick={()=>setSub(s)}>{s}</button>)}</div>}","{section===n.key&&subsFor(n).length>0&&<div className=\"subnav\">{subsFor(n).map((s:string)=><button key={s} className={sub===s?'active':''} onClick={()=>setSub(s)}>{s}</button>)}</div>}",1)

old_gate="else if(p.startsWith('/api/orders')) code=m==='GET'?'ORDERS_VIEW':m==='POST'?'ORDERS_CREATE':m==='DELETE'?'ORDERS_DELETE':'ORDERS_EDIT';"
new_gate="else if(p.startsWith('/api/orders')){if(m==='GET')code='ORDERS_VIEW';else if(m==='POST')code='ORDERS_CREATE';else if(m==='DELETE')code='ORDERS_DELETE';else{const edit=await hasPermission(c.env.DB,u,'ORDERS_EDIT'),ops=await hasPermission(c.env.DB,u,'OPERATIONS_MANAGE');if(!edit&&!ops)return fail(c,'Sipariş düzenleme yetkiniz yok.',403);return next()}}"
if old_gate not in b: raise SystemExit('order permission gate anchor missing')
b=b.replace(old_gate,new_gate,1)

APP.write_text(s); API.write_text(b)
