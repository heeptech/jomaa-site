const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const MarkdownIt = require("markdown-it");
const multer = require("multer");
const slugify = require("slugify");
const {
  ensureDataFiles,
  readArticles,
  writeArticles,
  readSettings,
  writeSettings
} = require("./src/storage");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "replace-this-secret";
const isProduction = process.env.NODE_ENV === "production";
const frontendDir = path.join(__dirname, "..", "frontend");
const dashboardDir = path.join(__dirname, "..", "dashboard");
const publicDir = path.join(frontendDir, "public");
const uploadsDir = path.join(publicDir, "uploads");
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

ensureDataFiles();
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

if (isProduction && (SESSION_SECRET === "replace-this-secret" || ADMIN_PASS === "admin123") && !ADMIN_PASS_HASH) {
  throw new Error("Set strong SESSION_SECRET and ADMIN_PASS or ADMIN_PASS_HASH before running in production.");
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      cb(null, `${file.fieldname}-${Date.now()}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (allowedTypes.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Only image files are allowed."));
  },
  limits: { fileSize: 1024 * 1024 * 3 }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts. Please try again later."
});

function ensureCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  return req.session.csrfToken;
}

function csrfProtection(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if ((req.headers["content-type"] || "").startsWith("multipart/form-data")) return next();
  const expected = req.session.csrfToken;
  const received = req.body && req.body._csrf;
  if (expected && received && safeCompare(received, expected)) {
    return next();
  }
  return res.status(403).render("404", { title: "طلب غير صالح" });
}

function safeCompare(a = "", b = "") {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

async function verifyAdminPassword(password = "") {
  if (ADMIN_PASS_HASH) return bcrypt.compare(password, ADMIN_PASS_HASH);
  return safeCompare(password, ADMIN_PASS);
}

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.set("view engine", "ejs");
app.set("views", [
  path.join(frontendDir, "views"),
  path.join(dashboardDir, "views")
]);
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(express.static(publicDir, { maxAge: "1h", etag: true }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  session({
    name: "jomaa.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

function getPublishedArticles() {
  return readArticles()
    .filter((article) => article.status === "published")
    .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
}

function enrichLocals(req, res, next) {
  res.locals.settings = readSettings();
  res.locals.currentPath = req.path;
  res.locals.isAuthed = Boolean(req.session.admin);
  res.locals.isDashboard = req.path.startsWith("/dashboard");
  res.locals.csrfToken = ensureCsrfToken(req);
  res.locals.formatDate = formatDate;
  next();
}

function requireAuth(req, res, next) {
  if (req.session.admin) return next();
  return res.redirect("/dashboard/login");
}

function noStoreDashboard(req, res, next) {
  if (req.path.startsWith("/dashboard")) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  }
  next();
}

function makeSlug(title) {
  const base = slugify(title || "article", {
    lower: true,
    strict: true,
    locale: "ar",
    trim: true
  });
  return base || `article-${crypto.randomUUID().slice(0, 8)}`;
}

function formatDate(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function uploadedPath(file) {
  return file ? `/uploads/${file.filename}` : "";
}

function withInlineImage(body, file) {
  const imagePath = uploadedPath(file);
  if (!imagePath) return body.trim();
  return `${body.trim()}\n\n![صورة داخل المقال](${imagePath})`;
}

function normalizeMenu(menuText) {
  return menuText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, href] = line.split("|").map((part) => part.trim());
      return { label, href: href || "/" };
    });
}

function normalizeSocialLinks(socialText) {
  return socialText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((part) => part.trim());
      return { label, url };
    })
    .filter((item) => item.label && item.url);
}

function normalizeCategories(categoriesText) {
  return categoriesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function socialIcon(label = "", url = "") {
  const name = label.trim().toLowerCase();
  const link = url.trim().toLowerCase();
  const detectPlatform = (value) => {
    if (value.includes("facebook") || value.includes("faceook") || value.includes("fb.com")) return "facebook";
    if (value.includes("instagram")) return "instagram";
    if (value.includes("linkedin")) return "linkedin";
    if (value.includes("youtube") || value.includes("youtu.be")) return "youtube";
    if (value.includes("whatsapp") || value.includes("wa.me")) return "whatsapp";
    if (value.includes("telegram") || value.includes("t.me")) return "telegram";
    if (value.includes("mailto:") || value.includes("email")) return "email";
    if (value === "x" || value.startsWith("x ") || value.includes("x.com") || value.includes("twitter")) return "x";
    return "";
  };
  const key = (() => {
    return detectPlatform(name) || detectPlatform(link) || "website";
  })();
  const icons = {
    facebook:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.1 8.4h-2V7.1c0-.6.4-.8.8-.8h1.2V3.9l-1.9-.1c-2.1 0-3.4 1.3-3.4 3.6v1H7.6V11h2.2v9h3.3v-9h1.8l.2-2.6Z"/></svg>',
    fb:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.1 8.4h-2V7.1c0-.6.4-.8.8-.8h1.2V3.9l-1.9-.1c-2.1 0-3.4 1.3-3.4 3.6v1H7.6V11h2.2v9h3.3v-9h1.8l.2-2.6Z"/></svg>',
    x:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 10.8 20.5 3h-1.6l-5.6 6.7L8.8 3H3.6l6.8 10.1L3.6 21h1.6l5.9-6.9 4.7 6.9H21l-7-10.2Zm-2.1 2.4-.7-1L5.8 4.3H8l4.4 6.4.7 1 5.7 8.2h-2.2l-4.7-6.7Z"/></svg>',
    twitter:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 10.8 20.5 3h-1.6l-5.6 6.7L8.8 3H3.6l6.8 10.1L3.6 21h1.6l5.9-6.9 4.7 6.9H21l-7-10.2Zm-2.1 2.4-.7-1L5.8 4.3H8l4.4 6.4.7 1 5.7 8.2h-2.2l-4.7-6.7Z"/></svg>',
    linkedin:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 8.8H3.7V20h3.1V8.8ZM5.2 7.3c1 0 1.7-.7 1.7-1.6S6.3 4.1 5.3 4.1 3.6 4.8 3.6 5.7s.6 1.6 1.6 1.6ZM20.4 20v-6.3c0-3.1-1.6-5.1-4.2-5.1-1.9 0-2.8 1.1-3.3 1.9V8.8H9.8V20h3.1v-6.2c0-1.6.8-2.6 2.1-2.6s2.2 1 2.2 2.7V20h3.2Z"/></svg>',
    instagram:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3.8h8A4.2 4.2 0 0 1 20.2 8v8a4.2 4.2 0 0 1-4.2 4.2H8A4.2 4.2 0 0 1 3.8 16V8A4.2 4.2 0 0 1 8 3.8Zm0 2.1A2.1 2.1 0 0 0 5.9 8v8A2.1 2.1 0 0 0 8 18.1h8a2.1 2.1 0 0 0 2.1-2.1V8A2.1 2.1 0 0 0 16 5.9H8Zm4 2.2a3.9 3.9 0 1 1 0 7.8 3.9 3.9 0 0 1 0-7.8Zm0 2.1a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Zm4.1-2.5a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Z"/></svg>',
    youtube:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.1a3 3 0 0 0-2.1-2.2C17 5.4 12 5.4 12 5.4s-5 0-6.9.5A3 3 0 0 0 3 8.1 31 31 0 0 0 2.5 12c0 1.3.2 2.6.5 3.9a3 3 0 0 0 2.1 2.2c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.2c.3-1.3.5-2.6.5-3.9S21.3 9.4 21 8.1ZM10.1 15.2V8.8l5.5 3.2-5.5 3.2Z"/></svg>',
    whatsapp:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.1 3.5a8.4 8.4 0 0 0-7.2 12.8L4 20.5l4.3-1.1a8.4 8.4 0 1 0 3.8-15.9Zm0 15.2c-1.3 0-2.5-.3-3.6-1l-.3-.2-2.5.7.7-2.4-.2-.3a6.8 6.8 0 1 1 5.9 3.2Zm3.8-5.1c-.2-.1-1.2-.6-1.4-.7-.2-.1-.4-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1a5.5 5.5 0 0 1-2.7-2.4c-.2-.3 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5l-.6-1.4c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.1s1 2.5 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.5.6.2 1.2.1 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.2-.2-.2-.4-.3Z"/></svg>',
    telegram:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20.8 4.2-3.2 15.1c-.2 1.1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5 12.7 0 11.1c-1.1-.3-1.1-1.1.2-1.6L19.6 2c.9-.3 1.7.2 1.2 2.2Z"/></svg>',
    email:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5h15A2.5 2.5 0 0 1 22 7.5v9A2.5 2.5 0 0 1 19.5 19h-15A2.5 2.5 0 0 1 2 16.5v-9A2.5 2.5 0 0 1 4.5 5Zm15 2.4L12 12.7 4.5 7.4v9.1h15V7.4ZM6.2 7l5.8 4.1L17.8 7H6.2Z"/></svg>',
    website:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8a9.2 9.2 0 1 0 0 18.4 9.2 9.2 0 0 0 0-18.4Zm6.7 8.1h-3.2a13.6 13.6 0 0 0-1.2-5.1 7.3 7.3 0 0 1 4.4 5.1ZM12 5.1c.7 1 1.4 2.9 1.6 5.8h-3.2c.2-2.9.9-4.8 1.6-5.8Zm-2.3.7a13.6 13.6 0 0 0-1.2 5.1H5.3a7.3 7.3 0 0 1 4.4-5.1ZM5.3 13h3.2c.2 2 .6 3.8 1.2 5.1A7.3 7.3 0 0 1 5.3 13Zm6.7 5.8c-.7-1-1.4-2.9-1.6-5.8h3.2c-.2 2.9-.9 4.8-1.6 5.8Zm2.3-.7c.6-1.3 1-3.1 1.2-5.1h3.2a7.3 7.3 0 0 1-4.4 5.1Z"/></svg>'
  };

  return icons[key] || icons.website;
}

app.use(enrichLocals);
app.use(noStoreDashboard);
app.use(csrfProtection);

app.get("/", (req, res) => {
  const articles = getPublishedArticles();
  res.render("home", {
    title: res.locals.settings.siteName,
    featured: articles[0],
    latestArticles: articles.slice(0, 6)
  });
});

app.get("/articles", (req, res) => {
  const query = String(req.query.q || "").trim().toLowerCase();
  const category = String(req.query.category || "").trim();
  const articles = getPublishedArticles();
  const filtered = articles.filter((article) => {
    const matchesQuery = query
      ? [article.title, article.excerpt, article.body, article.author, article.category]
          .join(" ")
          .toLowerCase()
          .includes(query)
      : true;
    const matchesCategory = category ? article.category === category : true;
    return matchesQuery && matchesCategory;
  });

  res.render("articles", {
    title: "المقالات",
    query,
    category,
    categories: res.locals.settings.categories || [],
    articles: filtered
  });
});

app.get("/articles/:id", (req, res) => {
  const article = getPublishedArticles().find(
    (item) => item.id === req.params.id || item.slug === req.params.id
  );

  if (!article) return res.status(404).render("404", { title: "المقال غير موجود" });

  res.render("article", {
    title: article.title,
    article: {
      ...article,
      html: markdown.render(article.body || "")
    },
    shareUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`
  });
});

app.get("/about", (req, res) => {
  res.render("about", {
    title: "من نحن",
    aboutHtml: markdown.render(res.locals.settings.aboutBody || ""),
    socialLinks: res.locals.settings.socialLinks || [],
    socialIcon
  });
});

app.get("/dashboard/login", (req, res) => {
  res.render("dashboard/login", {
    title: "تسجيل الدخول",
    error: null
  });
});

app.post("/dashboard/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (safeCompare(username || "", ADMIN_USER) && await verifyAdminPassword(password || "")) {
    req.session.regenerate((error) => {
      if (error) return res.status(500).render("404", { title: "خطأ في الجلسة" });
      req.session.admin = { username };
      ensureCsrfToken(req);
      return res.redirect("/dashboard");
    });
    return;
  }

  return res.status(401).render("dashboard/login", {
    title: "Login",
    error: "Invalid username or password."
  });
});

app.post("/dashboard/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("jomaa.sid");
    res.redirect("/");
  });
});


app.get("/dashboard", requireAuth, (req, res) => {
  const articles = readArticles().sort(
    (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  );

  res.render("dashboard/index", {
    title: "لوحة التحكم",
    articles
  });
});

app.get("/dashboard/articles/new", requireAuth, (req, res) => {
  res.render("dashboard/article-form", {
    title: "مقال جديد",
    article: null,
    categories: res.locals.settings.categories || []
  });
});

const articleUpload = upload.fields([
  { name: "coverImage", maxCount: 1 },
  { name: "inlineImage", maxCount: 1 }
]);

app.post("/dashboard/articles", requireAuth, articleUpload, csrfProtection, (req, res) => {
  const articles = readArticles();
  const now = new Date().toISOString();
  const coverFile = req.files && req.files.coverImage ? req.files.coverImage[0] : null;
  const inlineFile = req.files && req.files.inlineImage ? req.files.inlineImage[0] : null;
  const article = {
    id: crypto.randomUUID().slice(0, 12),
    slug: makeSlug(req.body.title),
    title: req.body.title.trim(),
    excerpt: req.body.excerpt.trim(),
    author: req.body.author.trim() || res.locals.settings.authorName,
    category: (req.body.category || "").trim(),
    coverImage: uploadedPath(coverFile) || (req.body.coverImageUrl || "").trim(),
    body: withInlineImage(req.body.body, inlineFile),
    status: req.body.status === "draft" ? "draft" : "published",
    createdAt: now,
    updatedAt: now,
    publishedAt: req.body.status === "draft" ? "" : now
  };

  articles.unshift(article);
  writeArticles(articles);
  res.redirect("/dashboard");
});

app.get("/dashboard/articles/:id/edit", requireAuth, (req, res) => {
  const article = readArticles().find((item) => item.id === req.params.id);
  if (!article) return res.status(404).render("404", { title: "المقال غير موجود" });

  res.render("dashboard/article-form", {
    title: "تعديل مقال",
    article,
    categories: res.locals.settings.categories || []
  });
});

app.post("/dashboard/articles/:id", requireAuth, articleUpload, csrfProtection, (req, res) => {
  const articles = readArticles();
  const index = articles.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).render("404", { title: "المقال غير موجود" });

  const previous = articles[index];
  const status = req.body.status === "draft" ? "draft" : "published";
  const coverFile = req.files && req.files.coverImage ? req.files.coverImage[0] : null;
  const inlineFile = req.files && req.files.inlineImage ? req.files.inlineImage[0] : null;
  articles[index] = {
    ...previous,
    slug: previous.title === req.body.title ? previous.slug : makeSlug(req.body.title),
    title: req.body.title.trim(),
    excerpt: req.body.excerpt.trim(),
    author: req.body.author.trim() || res.locals.settings.authorName,
    category: (req.body.category || "").trim(),
    coverImage: uploadedPath(coverFile) || (req.body.coverImageUrl || "").trim() || previous.coverImage || "",
    body: withInlineImage(req.body.body, inlineFile),
    status,
    updatedAt: new Date().toISOString(),
    publishedAt: status === "published" ? previous.publishedAt || new Date().toISOString() : ""
  };

  writeArticles(articles);
  res.redirect("/dashboard");
});

app.post("/dashboard/articles/:id/delete", requireAuth, (req, res) => {
  const articles = readArticles().filter((item) => item.id !== req.params.id);
  writeArticles(articles);
  res.redirect("/dashboard");
});

app.get("/dashboard/settings", requireAuth, (req, res) => {
  const settings = readSettings();
  res.render("dashboard/settings", {
    title: "إعدادات الموقع",
    settings,
    menuText: settings
      .menu.map((item) => `${item.label} | ${item.href}`)
      .join("\n"),
    socialText: (settings.socialLinks || [])
      .map((item) => `${item.label} | ${item.url}`)
      .join("\n"),
    categoriesText: (settings.categories || []).join("\n")
  });
});

const settingsUpload = upload.fields([
  { name: "logoFile", maxCount: 1 },
  { name: "heroImageFile", maxCount: 1 }
]);

app.post("/dashboard/settings", requireAuth, settingsUpload, csrfProtection, (req, res) => {
  const currentSettings = readSettings();
  const logoFile = req.files && req.files.logoFile ? req.files.logoFile[0] : null;
  const heroImageFile = req.files && req.files.heroImageFile ? req.files.heroImageFile[0] : null;
  const nextSettings = {
    siteName: req.body.siteName.trim(),
    authorName: req.body.authorName.trim(),
    logoUrl: uploadedPath(logoFile) || (req.body.logoUrl || currentSettings.logoUrl || "").trim(),
    heroImageUrl: uploadedPath(heroImageFile) || (req.body.heroImageUrl || currentSettings.heroImageUrl || "").trim(),
    heroTitle: req.body.heroTitle.trim(),
    heroSubtitle: req.body.heroSubtitle.trim(),
    aboutBody: req.body.aboutBody.trim(),
    footerText: req.body.footerText.trim(),
    menu: normalizeMenu(req.body.menu || ""),
    socialLinks: normalizeSocialLinks(req.body.socialLinks || ""),
    categories: normalizeCategories(req.body.categories || "")
  };

  writeSettings(nextSettings);
  res.redirect("/dashboard/settings?saved=1");
});

app.use((req, res) => {
  res.status(404).render("404", { title: "الصفحة غير موجودة" });
});

app.listen(PORT, () => {
  console.log(`Site is running on http://localhost:${PORT}`);
});
