const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "..", "data");
const articlesPath = path.join(dataDir, "articles.json");
const settingsPath = path.join(dataDir, "settings.json");

const defaultSettings = {
  siteName: "مركز جمعة للدراسات",
  authorName: "د. جمعة",
  logoUrl: "",
  heroImageUrl: "",
  heroTitle: "قراءات سياسية رصينة وتحليلات معمقة",
  heroSubtitle:
    "منصة شخصية لنشر المقالات والدراسات السياسية بلغة واضحة، وتصميم رسمي يليق بالمحتوى وصاحبه.",
  aboutBody:
    "هذه المساحة مخصصة للتعريف بالباحث، مسيرته الأكاديمية والسياسية، واهتماماته البحثية. يمكن تعديل هذا النص بالكامل من لوحة التحكم.",
  footerText: "جميع الحقوق محفوظة.",
  socialLinks: [],
  categories: ["مقالات", "دراسات", "تحليلات"],
  menu: [
    { label: "الرئيسية", href: "/" },
    { label: "المقالات", href: "/articles" },
    { label: "من نحن", href: "/about" }
  ]
};

const defaultArticles = [
  {
    id: "sample-article",
    slug: "sample-article",
    title: "عنوان مقال نموذجي للتحرير",
    excerpt: "ملخص قصير يظهر في صفحة المقالات والصفحة الرئيسية ويمكن استبداله من لوحة التحكم.",
    author: "د. جمعة",
    category: "مقالات",
    coverImage: "",
    body:
      "هذا نص تجريبي لمقال سياسي. يمكن استخدام تنسيق Markdown البسيط داخل جسم المقال، مثل العناوين والقوائم والروابط.\n\n## عنوان فرعي\n\nاكتب هنا الفكرة الأساسية، ثم وسعها بفقرات واضحة ومترابطة.",
    status: "published",
    createdAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z",
    publishedAt: "2026-06-21T00:00:00.000Z"
  }
];

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(articlesPath)) writeJson(articlesPath, defaultArticles);
  if (!fs.existsSync(settingsPath)) writeJson(settingsPath, defaultSettings);
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

function readArticles() {
  return readJson(articlesPath, []);
}

function writeArticles(articles) {
  writeJson(articlesPath, articles);
}

function readSettings() {
  return { ...defaultSettings, ...readJson(settingsPath, defaultSettings) };
}

function writeSettings(settings) {
  writeJson(settingsPath, {
    ...defaultSettings,
    ...settings,
    menu: settings.menu && settings.menu.length ? settings.menu : defaultSettings.menu,
    socialLinks: settings.socialLinks || [],
    categories: settings.categories && settings.categories.length ? settings.categories : defaultSettings.categories
  });
}

module.exports = {
  ensureDataFiles,
  readArticles,
  writeArticles,
  readSettings,
  writeSettings
};
