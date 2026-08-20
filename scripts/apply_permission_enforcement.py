from pathlib import Path

APP=Path('src/AppFinal.tsx')
API=Path('src/index-final.ts')
s=APP.read_text(); b=API.read_text()

old="const visible=user.role==='KURUM'?institutionNav:nav.filter(n=>!n.roles||n.roles.includes(user.role));const choose=(k:string,s='')=>{setSection(k);setSub(s);setMobile(false)};"
new="const sectionAllowed=(k:string)=>k==='exams'?(permitted(boot,'CATALOG_VIEW')||permitted(boot,'DIGITAL_VIEW')):k==='institutions'?permitted(boot,'INSTITUTIONS_VIEW'):k==='sales'?(permitted(boot,'OPPORTUNITIES_VIEW')||permitted(boot,'ORDERS_VIEW')||permitted(boot,'ORDERS_CREATE')):k==='publishers'?permitted(boot,'PUBLISHERS_VIEW'):k==='operations'?permitted(boot,'OPERATIONS_VIEW'):k==='reports'?permitted(boot,'REPORTS_VIEW'):true;const visible=user.role==='KURUM'?institutionNav:nav.filter(n=>(!n.roles||n.roles.includes(user.role))&&sectionAllowed(n.key));const choose=(k:string,s='')=>{setSection(k);setSub(s);setMobile(false)};"
if old not in s: raise SystemExit('shell visibility anchor not found')
s=s.replace(old,new,1)
s=s.replace('<MyTasksButton user={user}/>','<MyTasksButton user={user} boot={boot}/>',1)
s=s.replace("function MyTasksButton({user}:{user:User}){if(user.role==='KURUM')return null;","function MyTasksButton({user,boot}:{user:User;boot:Bootstrap}){if(user.role==='KURUM'||!permitted(boot,'TASKS_VIEW'))return null;",1)

# Hide admin-only order entry from non-admin sales submenu while keeping other filters.
oldmap="{section===n.key&&n.subs&&<div className=\"subnav\">{n.subs.map(s=><button key={s} className={sub===s?'active':''} onClick={()=>setSub(s)}>{s}</button>)}</div>}"
newmap="{section===n.key&&n.subs&&<div className=\"subnav\">{n.subs.filter(s=>!(s==='Kuruma Sipariş Gir'&&!isAdmin(user))).map(s=><button key={s} className={sub===s?'active':''} onClick={()=>setSub(s)}>{s}</button>)}</div>}"
if oldmap in s: s=s.replace(oldmap,newmap,1)

# API-wide permission gate after role middleware definition.
anchor="async function institutionAllowed(db: D1Database, user: UserRow, institutionId: string) {"
gate=r'''app.use('/api/*', async (c,next)=>{
  const u=c.get('user') as UserRow|undefined;
  if(!u) return next();
  const p=c.req.path,m=c.req.method;
  let code:string|null=null;
  if(p.startsWith('/api/exams')) code=m==='GET'?'CATALOG_VIEW':'EXAMS_MANAGE';
  else if(p.startsWith('/api/digital-assets')) code=m==='GET'?'DIGITAL_VIEW':'DIGITAL_MANAGE';
  else if(p==='/api/publishers'||p.startsWith('/api/publishers/')) code=m==='GET'?'PUBLISHERS_VIEW':'PUBLISHERS_MANAGE';
  else if(p.startsWith('/api/opportunities')) code='OPPORTUNITIES_VIEW';
  else if(p.startsWith('/api/order-pending')) code='ORDERS_VIEW';
  else if(p.startsWith('/api/orders')) code=m==='GET'?'ORDERS_VIEW':m==='POST'?'ORDERS_CREATE':m==='DELETE'?'ORDERS_DELETE':'ORDERS_EDIT';
  else if(p.startsWith('/api/reports')) code='REPORTS_VIEW';
  else if(p.startsWith('/api/order-lists')||p.startsWith('/api/publisher-orders')||p.startsWith('/api/goods-receipts')||p.startsWith('/api/deliveries')) code=m==='GET'?'OPERATIONS_VIEW':'OPERATIONS_MANAGE';
  else if(p.startsWith('/api/tasks')&&u.role!=='SUPER_ADMIN') code='TASKS_VIEW';
  if(code&&!(await hasPermission(c.env.DB,u,code))) return fail(c,'Bu işlem kullanıcı yetkilerinizde kapalı.',403);
  return next();
});

'''
if gate not in b:
    if anchor not in b: raise SystemExit('backend gate anchor not found')
    b=b.replace(anchor,gate+anchor,1)

APP.write_text(s); API.write_text(b)
