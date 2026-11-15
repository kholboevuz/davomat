# Davomat tizimi (Next.js + shadcn/ui + JSON database)

## Ishga tushirish
```bash
npm install
cp .env.example .env.local   # parolni o'zgartiring
npm run dev                  # http://localhost:3000
```
Production: `npm run build && npm start`

- Davomat sahifasi: `/`
- Admin panel: `/admin` (parol: `.env.local` dagi `ADMIN_PASSWORD`, standart — `admin123`)

## Admin panel
1. **Tinglovchilar** — Excel yuklang. Ustunlar: `Familiya | Ism | Otasining ismi | Lavozimi`
   (namuna: `public/namuna.xlsx`). "F.I.Sh." bitta ustunda bo'lsa ham tushunadi.
2. **IP sozlama** — ruxsat etilgan IP'lar: `213.230.1.5`, `192.168.1.*`, `10.0.0.0/24`.
   Ro'yxat bo'sh bo'lsa — sayt hamma uchun ochiq.
3. **QR kod** — sayt manzili uchun QR, PNG yuklab olish yoki chop etish.
4. **Davomat** — sana bo'yicha: keldi / o'rniga keldi / kelmadi, qidiruv, Excel'ga eksport.

## Himoya qoidalari
- Bitta qurilmadan kuniga faqat **bitta** odam belgilanadi (qurilma cookie orqali aniqlanadi).
- Bitta tinglovchi kuniga faqat bir marta belgilanadi.
- Ruxsat etilmagan IP'dan sahifa ham, API ham ishlamaydi.

## Ma'lumotlar
Hammasi `data/db.json` faylida saqlanadi (backup uchun shu faylni nusxalang).

## Muhim (serverga qo'yganda)
- IP to'g'ri aniqlanishi uchun Nginx'da: `proxy_set_header X-Forwarded-For $remote_addr;`
- Wi-Fi orqali kirilganda tashqi (public) IP ko'rinadi — admin paneldagi
  "Sizning hozirgi IP" tugmasi bilan o'quv xonasidan turib qo'shib qo'ying.
- Vercel kabi serverless hostingda JSON fayl saqlanmaydi — VPS (yoki oddiy server) ishlating.
