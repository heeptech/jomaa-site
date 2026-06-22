# موقع الباحث

موقع عربي رسمي وبسيط للمقالات والدراسات، مع لوحة تحكم لإدارة المقالات والصور ونصوص الموقع والقائمة.

## التشغيل المحلي

```bash
npm install
npm start
```

ثم افتح:

```text
http://localhost:3000
```

## متغيرات البيئة

```text
PORT=3000
SESSION_SECRET=change-this-long-random-secret
ADMIN_USER=admin
ADMIN_PASS=change-this-password
DATA_DIR=/app/data
UPLOADS_DIR=/app/frontend/public/uploads
MAX_DATA_BACKUPS=60
```

## حماية البيانات

المقالات والإعدادات محفوظة في:

```text
data/articles.json
data/settings.json
```

الصور المرفوعة محفوظة في:

```text
frontend/public/uploads
```

عند كل حفظ من الداشبورد، التطبيق ينشئ نسخة احتياطية تلقائية داخل:

```text
data/backups
```

يبقى آخر 60 نسخة لكل ملف افتراضياً، ويمكن تغيير العدد عبر `MAX_DATA_BACKUPS`.

## النشر على Dokploy

إعدادات التطبيق:

```text
Repository: https://github.com/heeptech/jomaa-site
Branch: main
Build Type: Dockerfile
Dockerfile Path: ./Dockerfile
Port: 3000
```

Environment Variables:

```text
PORT=3000
NODE_ENV=production
SESSION_SECRET=ضع-نص-طويل-عشوائي
ADMIN_USER=اسم-المستخدم
ADMIN_PASS=كلمة-المرور
DATA_DIR=/app/data
UPLOADS_DIR=/app/frontend/public/uploads
MAX_DATA_BACKUPS=60
```

## مهم جداً في Dokploy

حتى لا تضيع المقالات أو الصور بعد سنة أو بعد أي Rebuild/Deploy، يجب إضافة Persistent Volumes لهذين المسارين:

```text
/app/data
/app/frontend/public/uploads
```

بدون هذه الـ volumes، أي منصة Docker يمكن أن تستبدل ملفات الحاوية عند إعادة البناء، وهذا قد يسبب فقدان المقالات أو الصور المرفوعة.
