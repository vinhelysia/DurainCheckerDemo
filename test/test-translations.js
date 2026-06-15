import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mainJsPath = path.join(__dirname, '../demo/main.js');
const indexHtmlPath = path.join(__dirname, '../demo/index.html');

const mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

const copyDataStartIndex = mainJsContent.indexOf('const copyData = {');
const copyDataEndIndex = mainJsContent.indexOf('// ==========================================================================\r\n// 2. Batch Supply Chain Datasets');
// Fallback for different line endings
const copyDataEndIndexUnix = mainJsContent.indexOf('// ==========================================================================\n// 2. Batch Supply Chain Datasets');
const endIndex = copyDataEndIndex !== -1 ? copyDataEndIndex : copyDataEndIndexUnix;

if (copyDataStartIndex === -1 || endIndex === -1) {
  console.error("Could not locate copyData block");
  process.exit(1);
}

const copyDataString = mainJsContent.substring(copyDataStartIndex, endIndex);
// Evaluate the variable definition
const evalObj = new Function('return ' + copyDataString.replace('const copyData =', ''))();

const vi = evalObj.vi;
const en = evalObj.en;

// Helper to get all nested keys of an object as dotted paths
function getKeys(obj, prefix = '') {
  let paths = [];
  for (const key in obj) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      paths = paths.concat(getKeys(obj[key], newPrefix));
    } else if (Array.isArray(obj[key])) {
      paths.push(newPrefix);
      obj[key].forEach((item, idx) => {
        if (typeof item === 'object' && item !== null) {
          paths = paths.concat(getKeys(item, `${newPrefix}[${idx}]`));
        }
      });
    } else {
      paths.push(newPrefix);
    }
  }
  return paths;
}

const viKeys = getKeys(vi);
const enKeys = getKeys(en);

function resolvePath(obj, path) {
  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  let curr = obj;
  for (const part of parts) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[part];
  }
  return curr;
}

console.log('Comparing vi and en translation keys...');
const missingInEn = viKeys.filter(k => {
  return resolvePath(en, k) === undefined;
});

const missingInVi = enKeys.filter(k => {
  return resolvePath(vi, k) === undefined;
});

console.log('VI keys count:', viKeys.length);
console.log('EN keys count:', enKeys.length);

let failed = false;

if (missingInEn.length > 0) {
  console.error('FAIL: Keys in vi but missing in en:', missingInEn);
  failed = true;
} else {
  console.log('PASS: No keys in vi missing in en.');
}

if (missingInVi.length > 0) {
  console.error('FAIL: Keys in en but missing in vi:', missingInVi);
  failed = true;
} else {
  console.log('PASS: No keys in en missing in vi.');
}

// Find data-i18n attributes in index.html
const dataI18nRegex = /data-i18n="([^"]+)"/g;
let match;
const htmlKeys = new Set();
while ((match = dataI18nRegex.exec(indexHtmlContent)) !== null) {
  htmlKeys.add(match[1]);
}

console.log('\nChecking index.html data-i18n attributes against copyData...');
const missingHtmlKeysInVi = [];
const missingHtmlKeysInEn = [];

for (const key of htmlKeys) {
  const viVal = resolvePath(vi, key);
  const enVal = resolvePath(en, key);
  if (viVal === undefined) {
    missingHtmlKeysInVi.push(key);
  }
  if (enVal === undefined) {
    missingHtmlKeysInEn.push(key);
  }
}

if (missingHtmlKeysInVi.length > 0) {
  console.error('FAIL: HTML data-i18n keys missing in vi:', missingHtmlKeysInVi);
  failed = true;
} else {
  console.log('PASS: All HTML data-i18n keys exist in vi.');
}

if (missingHtmlKeysInEn.length > 0) {
  console.error('FAIL: HTML data-i18n keys missing in en:', missingHtmlKeysInEn);
  failed = true;
} else {
  console.log('PASS: All HTML data-i18n keys exist in en.');
}

// Check other keys queried dynamically in main.js
console.log('\nChecking dynamic key uses in main.js...');
const dynamicKeysUsed = [
  'footer.sourcesLabel',
  'timeline.statusRecorded',
  'timeline.statusPending',
  'aiResult.kicker',
  'aiResult.title',
  'aiResult.sourceChain',
  'aiResult.confidence',
  'aiResult.cadmium',
  'aiResult.threshold',
  'aiResult.yellowO',
  'ai.gradeLabel',
  'ai.ripeness',
  'hashProof.label',
  'qr.stopCamera',
  'qr.startCamera',
  'qr.invalidQr',
  'qr.scanSuccess',
  'qr.loadBatch',
  'qr.arbitraryQr',
  'qr.invalidBatch',
  'ai.scanningFibers',
  'ai.checkingCadmium',
  'ai.checkingYellowO',
  'ai.finalizing',
  'ai.success',
  'aiResult.riskLabels.low',
  'aiResult.riskLabels.medium',
  'aiResult.riskLabels.high',
  'demo.riskNames.low',
  'demo.riskNames.medium',
  'demo.riskNames.high',
  'demo.riskSubnames.low',
  'demo.riskSubnames.medium',
  'demo.riskSubnames.high',
];

for (const key of dynamicKeysUsed) {
  const viVal = resolvePath(vi, key);
  const enVal = resolvePath(en, key);
  if (viVal === undefined) {
    console.error(`FAIL: Dynamic key "${key}" missing in vi.`);
    failed = true;
  }
  if (enVal === undefined) {
    console.error(`FAIL: Dynamic key "${key}" missing in en.`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('ALL TRANSLATION TESTS PASSED!');
  process.exit(0);
}
