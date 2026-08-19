-- İSTEĞE BAĞLI DEMO VERİSİ. Production migration zincirine dahil değildir.
INSERT INTO publishers (id,name,short_name,contact_person,phone,minimum_order,default_discount,payment_terms,delivery_days,is_active,created_at,updated_at) VALUES
('pub_demo_3d','3D Yayınları','3D','Demo Temsilci','05000000001',50,25,'30 gün',7,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pub_demo_bilgi','Bilgi Sarmal Yayınları','Bilgi Sarmal','Demo Temsilci','05000000002',50,20,'30 gün',7,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('pub_demo_hiz','Hız Yayınları','Hız','Demo Temsilci','05000000003',50,20,'30 gün',7,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO exams (id,publisher_id,season_id,grade_level_id,name,code,list_price,purchase_price,default_sale_price,minimum_order,last_order_date,estimated_ship_date,application_start_date,application_end_date,status,is_active,created_at,updated_at) VALUES
('exam_demo_5_1','pub_demo_3d','season_2026_2027','grade_5','5. Sınıf Türkiye Geneli 1','3D-5-TG1',15000,9000,12000,50,'2026-09-05','2026-09-10','2026-09-15','2026-09-18','ACTIVE',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('exam_demo_6_1','pub_demo_bilgi','season_2026_2027','grade_6','6. Sınıf Türkiye Geneli 1','BS-6-TG1',15000,9000,12000,50,'2026-09-08','2026-09-12','2026-09-18','2026-09-21','ACTIVE',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('exam_demo_7_1','pub_demo_hiz','season_2026_2027','grade_7','7. Sınıf Türkiye Geneli 1','HIZ-7-TG1',14500,8500,11500,50,'2026-09-10','2026-09-14','2026-09-22','2026-09-25','ACTIVE',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('exam_demo_8_1','pub_demo_3d','season_2026_2027','grade_8','8. Sınıf Türkiye Geneli 1','3D-8-TG1',16000,9500,13000,50,'2026-09-12','2026-09-16','2026-09-26','2026-09-29','ACTIVE',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('exam_demo_tyt_1','pub_demo_3d','season_2026_2027','grade_tyt','TYT Türkiye Geneli 1','3D-TYT-TG1',18000,11000,15000,50,'2026-09-15','2026-09-20','2026-10-03','2026-10-06','ACTIVE',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO institutions (id,name,code,type,is_private,province,district,contact_person,estimated_capacity,is_active,created_at,updated_at) VALUES
('inst_demo_abc','Özel ABC Koleji','ABC2026','Kolej',1,'İstanbul','Kartal','Kurum Yetkilisi',650,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('inst_demo_xyz','XYZ Kurs Merkezi','XYZ2026','Kurs Merkezi',1,'İstanbul','Pendik','Kurum Yetkilisi',420,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('inst_demo_def','DEF Anadolu Lisesi','DEF2026','Lise',0,'İstanbul','Tuzla','Kurum Yetkilisi',800,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
