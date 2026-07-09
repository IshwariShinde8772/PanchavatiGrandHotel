import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "src");

globalThis.localStorage = {
  values: new Map(),
  getItem(key) { return this.values.get(key) ?? null; },
  setItem(key, value) { this.values.set(key, String(value)); },
};
globalThis.document = { documentElement: { lang: "" } };

const { resources, resolveSavedLanguage, supportedLanguages } = await import("../src/i18n/index.js");

function flatten(value, prefix = "", result = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flatten(child, next, result);
    else result.set(next, child);
  }
  return result;
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(fullPath));
    else if (/\.(js|jsx)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

const expectedLanguages = [
  ["en", "English"],
  ["hi", "हिन्दी"],
  ["mr", "मराठी"],
];
const actualLanguages = supportedLanguages.map(({ code, label }) => [code, label]);
if (JSON.stringify(actualLanguages) !== JSON.stringify(expectedLanguages)) {
  throw new Error(`Unsupported language selector configuration: ${JSON.stringify(actualLanguages)}`);
}

if (resolveSavedLanguage(null) !== "en" || resolveSavedLanguage("fr") !== "en" || resolveSavedLanguage("mr") !== "mr") {
  throw new Error("Language persistence fallback validation failed.");
}

const languageMaps = Object.fromEntries(
  expectedLanguages.map(([code]) => [code, flatten(resources[code].translation)])
);
const englishKeys = [...languageMaps.en.keys()].sort();

for (const [code] of expectedLanguages.slice(1)) {
  const keys = [...languageMaps[code].keys()].sort();
  const missing = englishKeys.filter((key) => !languageMaps[code].has(key));
  const extra = keys.filter((key) => !languageMaps.en.has(key));
  if (missing.length || extra.length) {
    throw new Error(`${code} key mismatch. Missing: ${missing.join(", ")}; extra: ${extra.join(", ")}`);
  }
}

for (const [code, map] of Object.entries(languageMaps)) {
  const empty = [...map].filter(([, value]) => value === null || value === undefined || String(value).trim() === "");
  if (empty.length) throw new Error(`${code} contains empty translations: ${empty.map(([key]) => key).join(", ")}`);
}

const missingUsage = [];
const keyPattern = /\bt\(\s*["'`]([^"'`$]+)["'`]/g;
for (const file of await sourceFiles(sourceRoot)) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(keyPattern)) {
    const key = match[1];
    if (!languageMaps.en.has(key)) {
      missingUsage.push(`${path.relative(root, file)}: ${key}`);
    }
  }
}
if (missingUsage.length) {
  throw new Error(`Translation keys used but not defined:\n${missingUsage.join("\n")}`);
}

console.log(`i18n verification passed: 3 languages, ${englishKeys.length} matched keys, fallback/persistence rules valid.`);
