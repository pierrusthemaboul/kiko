import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_PROD_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const CONCURRENCY = Number(process.env.IMG_AUDIT_CONCURRENCY || 8);
const WARN_THRESHOLD_KB = Number(process.env.IMG_AUDIT_WARN_KB || 500);
const CRITICAL_THRESHOLD_KB = Number(process.env.IMG_AUDIT_CRITICAL_KB || 1000);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variables manquantes: SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function parseBytesFromHeaders(headers) {
  const contentLength = headers.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength)) {
    return Number(contentLength);
  }

  const contentRange = headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)$/);
    if (match) return Number(match[1]);
  }

  return null;
}

async function fetchHeadOrRange(url) {
  const tryHead = await fetch(url, {
    method: 'HEAD',
    redirect: 'follow'
  });

  let bytes = parseBytesFromHeaders(tryHead.headers);
  let contentType = tryHead.headers.get('content-type');

  if (bytes !== null || tryHead.ok) {
    return {
      ok: tryHead.ok,
      status: tryHead.status,
      bytes,
      contentType,
      finalUrl: tryHead.url || url,
      method: 'HEAD'
    };
  }

  const tryRange = await fetch(url, {
    method: 'GET',
    headers: { Range: 'bytes=0-0' },
    redirect: 'follow'
  });

  bytes = parseBytesFromHeaders(tryRange.headers);
  contentType = contentType || tryRange.headers.get('content-type');

  return {
    ok: tryRange.ok,
    status: tryRange.status,
    bytes,
    contentType,
    finalUrl: tryRange.url || url,
    method: 'GET_RANGE'
  };
}

async function readEventsWithIllustration() {
  const candidates = ['illustration_url', 'illustrations_url'];

  for (const column of candidates) {
    const { data, error } = await supabase
      .from('evenements')
      .select(`id, titre, ${column}`)
      .not(column, 'is', null)
      .order('date', { ascending: false })
      .limit(5000);

    if (!error) {
      const rows = (data || [])
        .filter((row) => typeof row[column] === 'string' && row[column].trim().length > 0)
        .map((row) => ({
          id: row.id,
          titre: row.titre,
          url: row[column],
          column
        }));

      return { rows, usedColumn: column };
    }
  }

  throw new Error("Impossible de lire 'illustration_url' ou 'illustrations_url' dans la table evenements.");
}

function runWithConcurrency(items, worker, concurrency) {
  return new Promise((resolve) => {
    const results = new Array(items.length);
    let index = 0;
    let active = 0;

    const next = () => {
      if (index >= items.length && active === 0) {
        resolve(results);
        return;
      }

      while (active < concurrency && index < items.length) {
        const currentIndex = index++;
        active++;

        Promise.resolve(worker(items[currentIndex], currentIndex))
          .then((value) => {
            results[currentIndex] = value;
          })
          .catch((error) => {
            results[currentIndex] = { error: error.message };
          })
          .finally(() => {
            active--;
            next();
          });
      }
    };

    next();
  });
}

function formatKb(bytes) {
  if (bytes == null) return 'unknown';
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

async function main() {
  const startedAt = Date.now();
  console.log('🔎 Audit des illustrations d\'événements...');

  const { rows, usedColumn } = await readEventsWithIllustration();
  console.log(`📦 ${rows.length} événements trouvés avec ${usedColumn}`);

  const audited = await runWithConcurrency(
    rows,
    async (row, idx) => {
      const info = await fetchHeadOrRange(row.url);
      if ((idx + 1) % 50 === 0 || idx === rows.length - 1) {
        console.log(`   ... ${idx + 1}/${rows.length}`);
      }

      const extension = row.url.split('?')[0].split('.').pop()?.toLowerCase() || '';
      const contentType = (info.contentType || '').toLowerCase();
      const extensionLooksWebp = extension === 'webp';
      const contentTypeLooksWebp = contentType.includes('image/webp');

      return {
        ...row,
        status: info.status,
        ok: info.ok,
        bytes: info.bytes,
        contentType: info.contentType,
        method: info.method,
        finalUrl: info.finalUrl,
        extension,
        mismatchFormat: extensionLooksWebp && !contentTypeLooksWebp
      };
    },
    CONCURRENCY
  );

  const success = audited.filter((r) => r && r.ok && typeof r.bytes === 'number');
  const missingSize = audited.filter((r) => r && r.ok && r.bytes == null);
  const failed = audited.filter((r) => !r || !r.ok);

  const byteValues = success.map((r) => r.bytes);
  const totalBytes = byteValues.reduce((sum, n) => sum + n, 0);
  const avgBytes = byteValues.length ? totalBytes / byteValues.length : 0;
  const medianBytes = median(byteValues);

  const heavy = success
    .filter((r) => r.bytes >= WARN_THRESHOLD_KB * 1024)
    .sort((a, b) => b.bytes - a.bytes);

  const critical = success
    .filter((r) => r.bytes >= CRITICAL_THRESHOLD_KB * 1024)
    .sort((a, b) => b.bytes - a.bytes);

  const mismatches = success.filter((r) => r.mismatchFormat);

  console.log('\n=== RÉSUMÉ ===');
  console.log(`✅ Mesurées: ${success.length}`);
  console.log(`⚠️ Taille inconnue: ${missingSize.length}`);
  console.log(`❌ En échec: ${failed.length}`);
  console.log(`📊 Poids moyen: ${formatKb(avgBytes)}`);
  console.log(`📊 Poids médian: ${formatKb(medianBytes)}`);
  console.log(`📊 Poids total: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`🔥 >= ${WARN_THRESHOLD_KB} KB: ${heavy.length}`);
  console.log(`🚨 >= ${CRITICAL_THRESHOLD_KB} KB: ${critical.length}`);
  console.log(`🧪 Extension .webp mais content-type non-webp: ${mismatches.length}`);

  if (critical.length) {
    console.log('\n=== TOP IMAGES CRITIQUES ===');
    for (const row of critical.slice(0, 20)) {
      console.log(`- ${row.id} | ${formatKb(row.bytes)} | ${row.titre}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    usedColumn,
    thresholds: {
      warnKb: WARN_THRESHOLD_KB,
      criticalKb: CRITICAL_THRESHOLD_KB
    },
    summary: {
      totalRows: rows.length,
      measured: success.length,
      unknownSize: missingSize.length,
      failed: failed.length,
      averageBytes: avgBytes,
      medianBytes,
      totalBytes,
      heavyCount: heavy.length,
      criticalCount: critical.length,
      mismatchCount: mismatches.length
    },
    topCritical: critical.slice(0, 100),
    formatMismatches: mismatches.slice(0, 100),
    failed: failed.slice(0, 100)
  };

  const reportDir = path.join(process.cwd(), 'scripts', 'maintenance', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `illustrations-audit-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`\n📝 Rapport écrit: ${reportPath}`);
}

main().catch((error) => {
  console.error('❌ Audit interrompu:', error.message);
  process.exit(1);
});
