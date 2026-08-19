from pathlib import Path

# Backend fixes
p = Path('src/index-final.ts')
s = p.read_text(encoding='utf-8')
repls = [
(
"const b:any=await c.req.json();if(!b.name||!b.code)return fail(c,'Kurum adı ve kurum kodu gerekli.');const code=normalizeCode(b.code),rid=uid('inst');let staff=b.staff_id||null;if(!staff)staff=await fallbackOwner(c.env.DB,rid);",
"const b:any=await c.req.json();if(!b.name||!b.code)return fail(c,'Kurum adı ve kurum kodu gerekli.');if(!b.portal_password)return fail(c,'Kurum ilk oluşturulurken kurum giriş şifresi gerekli.');const code=normalizeCode(b.code),rid=uid('inst');let staff=b.staff_id||null;if(!staff)staff=await fallbackOwner(c.env.DB,rid);"
),
(
"let staff=b.staff_id===undefined?old.staff_id:b.staff_id;if(!staff)staff=await fallbackOwner(c.env.DB,rid);",
"let staff=b.staff_id===undefined?old.staff_id:b.staff_id;if(!staff){const admin=await c.env.DB.prepare(`SELECT id FROM users WHERE role='SUPER_ADMIN' AND status='ACTIVE' AND deleted_at IS NULL ORDER BY created_at LIMIT 1`).first<{id:string}>();staff=admin?.id||null;}"
),
(
"await c.env.DB.prepare(`UPDATE institutions SET erp_external_id=?,name=?,code=?,type=?,is_private=?,province=?,district=?,phone=?,email=?,contact_person=?,staff_id=?,estimated_capacity=?,is_active=?,notes=?,updated_at=? WHERE id=?`).bind(n.erp_external_id||null,n.name,n.code,n.type||null,n.is_private?1:0,n.province||null,n.district||null,n.phone||null,n.email||null,n.contact_person||null,n.staff_id||null,Number(n.estimated_capacity||0),n.is_active?1:0,n.notes||null,now(),rid).run();if(Array.isArray(b.grade_level_ids))",
"await c.env.DB.prepare(`UPDATE institutions SET erp_external_id=?,name=?,code=?,type=?,is_private=?,province=?,district=?,phone=?,email=?,contact_person=?,staff_id=?,estimated_capacity=?,is_active=?,notes=?,updated_at=? WHERE id=?`).bind(n.erp_external_id||null,n.name,n.code,n.type||null,n.is_private?1:0,n.province||null,n.district||null,n.phone||null,n.email||null,n.contact_person||null,n.staff_id||null,Number(n.estimated_capacity||0),n.is_active?1:0,n.notes||null,now(),rid).run();await c.env.DB.prepare(`UPDATE users SET login_code=?,updated_at=? WHERE institution_id=? AND role='KURUM' AND deleted_at IS NULL`).bind(n.code,now(),rid).run();if(Array.isArray(b.grade_level_ids))"
),
(
"Number(x.list_price||0),Number(x.purchase_price||0),Number(x.sale_price||x.default_sale_price||0)",
"Math.round(Number(x.list_price||0)*100),Math.round(Number(x.purchase_price||0)*100),Math.round(Number(x.sale_price||x.default_sale_price||0)*100)"
),
(
"WHERE o.id IS NULL`;const vals:any[]=[];",
"WHERE o.id IS NULL AND p.planned_quantity IS NOT NULL AND p.planned_quantity>0`;const vals:any[]=[];"
),
]
for old,new in repls:
    if old not in s:
        raise SystemExit(f'Backend target not found: {old[:90]}')
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Frontend fixes
p = Path('src/AppFinal.tsx')
s = p.read_text(encoding='utf-8')
repls = [
("list_price:15000,purchase_price:9000,sale_price:12000", "list_price:150,purchase_price:90,sale_price:120"),
("{section==='operations'&&<Operations boot={boot}/>} ", "{section==='operations'&&<Operations boot={boot} sub={sub}/>} "),
("function Operations({boot}:{boot:Bootstrap}){const[tab,setTab]=useState<'supply'|'delivery'>('supply');return <>", "function Operations({boot,sub}:{boot:Bootstrap;sub:string}){const[tab,setTab]=useState<'supply'|'delivery'>(sub==='Teslimatlar'?'delivery':'supply');useEffect(()=>setTab(sub==='Teslimatlar'?'delivery':'supply'),[sub]);return <>")
]
for old,new in repls:
    if old not in s:
        raise SystemExit(f'Frontend target not found: {old[:90]}')
    s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# Clean temporary automation files before committing
for path in ['scripts/post-final-fixes.py','.github/workflows/apply-post-final-fixes.yml','.apply-post-final-fixes']:
    q=Path(path)
    if q.exists(): q.unlink()
