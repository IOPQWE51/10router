/**
 * CLI i18n — 系统语言检测 + 轻量字典查找(零依赖)
 *
 * 语言解析优先级:
 *   1. TENROUTER_LANG 环境变量显式覆盖(如 zh-CN / zh-TW / en)
 *   2. LC_ALL / LANG(posix 惯例)
 *   3. ICU 默认 locale(Node 全量 ICU 在 Windows 上取自系统 UI 语言)
 *   4. 回退 en
 *
 * 字典按源文件分片存放在 locales/<lang>/*.json(index.js 合并加载),
 * 缺失键回退链:当前语言 → en → 键名本身。占位符用 {name} 语法。
 */
const fs = require("fs");
const path = require("path");

const SUPPORTED = ["en", "zh-CN", "zh-TW"];
const LOCALES_DIR = path.join(__dirname, "locales");

function normalize(raw) {
  if (!raw) return null;
  const loc = String(raw).trim().replace(/_/g, "-").toLowerCase();
  if (/^zh($|-)/.test(loc)) {
    if (/(tw|hk|mo|hant)/.test(loc)) return "zh-TW";
    return "zh-CN";
  }
  if (loc.startsWith("en")) return "en";
  return null;
}

function detectLocale() {
  for (const envKey of ["TENROUTER_LANG", "LC_ALL", "LANG"]) {
    const hit = normalize(process.env[envKey]);
    if (hit) return hit;
  }
  try {
    const hit = normalize(Intl.DateTimeFormat().resolvedOptions().locale);
    if (hit) return hit;
  } catch (e) { /* ICU 不可用时回退 en */ }
  return "en";
}

const locale = detectLocale();

function loadLangDir(lang) {
  const table = {};
  const dir = path.join(LOCALES_DIR, lang);
  let files = [];
  try {
    files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  } catch (e) {
    return table;
  }
  for (const file of files) {
    try {
      Object.assign(table, JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")));
    } catch (e) {
      process.stderr.write(`[10router] i18n: failed to load ${lang}/${file}: ${e.message}\n`);
    }
  }
  return table;
}

const tables = {
  [locale]: locale === "en" ? {} : loadLangDir(locale),
  en: locale === "en" ? loadLangDir("en") : loadLangDir("en"),
};

/**
 * 翻译: t("launcher.exitBanner") / t("tray.portStatus", { port: 20128 })
 */
function t(key, params) {
  let str = tables[locale][key];
  if (str === undefined) str = tables.en[key];
  if (str === undefined) str = key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      str = str.split(`{${name}}`).join(String(value));
    }
  }
  return str;
}

module.exports = { t, locale, detectLocale, SUPPORTED };
