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

رابط لوحة التحكم:

```text
http://localhost:3000/dashboard
```

## المحتوى

- المقالات محفوظة في `data/articles.json`.
- إعدادات الموقع والقائمة وصفحة "من نحن" محفوظة في `data/settings.json`.
- كل مقال يملك `id` ثابتاً، ويمكن فتحه أيضاً عبر الرابط المقروء `slug`.
