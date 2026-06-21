# موقع الباحث

موقع عربي رسمي وبسيط للمقالات السياسية، مع لوحة تحكم لإدارة المقالات ونصوص الموقع والقائمة.

## التشغيل المحلي

```bash
npm install
npm start
```

ثم افتح:

```text
http://localhost:3000
```

## بيانات لوحة التحكم

انسخ `.env.example` إلى `.env` وعدل القيم:

```text
PORT=3000
SESSION_SECRET=change-this-long-random-secret
ADMIN_USER=admin
ADMIN_PASS=change-this-password
```

في الإنتاج استخدم `SESSION_SECRET` طويل وعشوائي، وغيّر `ADMIN_PASS`. يمكن أيضاً استخدام كلمة مرور مشفرة بدل النص الصريح:

```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 12))"
```

ثم ضع الناتج في:

```text
ADMIN_PASS_HASH=...
```

رابط لوحة التحكم:

```text
http://localhost:3000/dashboard
```

## المحتوى

- المقالات محفوظة في `data/articles.json`.
- إعدادات الموقع والقائمة وصفحة "من نحن" محفوظة في `data/settings.json`.
- كل مقال يملك `id` ثابتاً، ويمكن فتحه أيضاً عبر الرابط المقروء `slug`.

## بنية المشروع

```text
backend/    السيرفر، تسجيل الدخول، حفظ المقالات والإعدادات
frontend/   صفحات الموقع العامة والملفات الثابتة
dashboard/  قوالب لوحة التحكم
data/       المقالات وإعدادات الموقع
```

## النشر على Dokploy

استخدم إعدادات التطبيق التالية:

```text
Repository: https://github.com/ammarlaheeb-rgb/jomaa-site
Branch: main
Build Type: Dockerfile
Dockerfile Path: ./Dockerfile
Port: 3000
```

أضف Environment Variables:

```text
PORT=3000
SESSION_SECRET=ضع-نص-طويل-عشوائي
ADMIN_USER=اسم-المستخدم
ADMIN_PASS=كلمة-المرور
```

للحفاظ على المقالات واللوغو بعد كل deploy، أضف Volumes:

```text
/app/data
/app/frontend/public/uploads
```
