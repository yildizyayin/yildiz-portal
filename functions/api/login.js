export async function onRequestPost(context) {
    try {
        const { password } = await context.request.json();
        const db = context.env.DB; // Cloudflare D1 veritabanı bağlantısı

        if (!password) {
            return new Response(JSON.stringify({ error: 'Şifre gereklidir.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // D1 veritabanından şifreyi kontrol et
        const stmt = db.prepare("SELECT * FROM schools WHERE access_password = ?");
        const school = await stmt.bind(password).first();

        if (!school) {
            return new Response(JSON.stringify({ error: 'Hatalı şifre. Lütfen okulunuzdan aldığınız kodu kontrol edin.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Başarılı eşleşme
        return new Response(JSON.stringify({ 
            success: true, 
            school_code: school.school_code,
            school_name: school.school_name 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: 'Sunucu hatası: ' + err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
