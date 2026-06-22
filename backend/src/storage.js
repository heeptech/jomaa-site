const fs = require("fs");
const path = require("path");

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "..", "data");
const articlesPath = path.join(dataDir, "articles.json");
const settingsPath = path.join(dataDir, "settings.json");
const backupsDir = path.join(dataDir, "backups");
const maxBackupsPerFile = Number(process.env.MAX_DATA_BACKUPS || 60);

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
  backupJson(filePath);
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

function backupJson(filePath) {
  if (!fs.existsSync(filePath)) return;
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const parsed = path.parse(filePath);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupsDir, `${parsed.name}-${stamp}.json`);
  fs.copyFileSync(filePath, backupPath);

  const prefix = `${parsed.name}-`;
  const backups = fs
    .readdirSync(backupsDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .sort()
    .reverse();

  backups.slice(maxBackupsPerFile).forEach((name) => {
    fs.rmSync(path.join(backupsDir, name), { force: true });
  });
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
