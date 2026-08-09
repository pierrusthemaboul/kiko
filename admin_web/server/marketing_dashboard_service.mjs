/**
 * marketing_dashboard_service.mjs — Agrège les données marketing:
 * - Buffer (dernier post + métriques par réseau social)
 * - App Store Connect (téléchargements du jour)
 * - Google Play Console (rapports d'installs disponibles)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { GoogleAuth } from 'google-auth-library';
import zlib from 'zlib';
import iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────
// BUFFER
// ─────────────────────────────────────────────────────────

async function bufferGraphQL(query, variables) {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) throw new Error('BUFFER_ACCESS_TOKEN manquant');

  const res = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) {
    throw new Error(data.errors.map((e) => e.message).join('; '));
  }
  return data.data;
}

/**
 * Corrige le mojibake (UTF-8 mal décodé en Latin-1) présent dans certains
 * posts historiques créés par un script de publication à l'encodage défaillant.
 */
function fixMojibake(text) {
  if (!text || !/Ã|Â|â€/.test(text)) return text;
  try {
    const fixed = iconv.decode(iconv.encode(text, 'win1252'), 'utf8');
    if (fixed.includes('\uFFFD')) return text;
    return fixed;
  } catch {
    return text;
  }
}

function extractMetrics(metrics) {
  const empty = {
    views: null,
    likes: null,
    comments: null,
    shares: null,
    reach: null,
    engagementRate: null,
  };
  if (!metrics) return empty;
  const m = {};
  for (const item of metrics) {
    m[item.name] = item.value;
  }
  return {
    views: m.Views ?? null,
    likes: m.Reactions ?? null,
    comments: m.Comments ?? null,
    shares: m.Shares ?? null,
    reach: m.Reach ?? null,
    engagementRate: m['Eng. Rate'] ?? null,
  };
}

export async function getBufferOverview() {
  const orgData = await bufferGraphQL(
    'query { account { organizations { id } } }'
  );
  const orgId = orgData.account.organizations[0].id;

  const channelsData = await bufferGraphQL(
    `query($o: OrganizationId!) { channels(input: { organizationId: $o }) { id name service avatar } }`,
    { o: orgId }
  );
  const channels = channelsData.channels;

  const postsQuery = `
    query($input: PostsInput!) {
      posts(input: $input, first: 1) {
        edges {
          node {
            id
            text
            dueAt
            metrics { name value unit }
          }
        }
      }
    }
  `;

  const results = await Promise.all(
    channels.map(async (ch) => {
      try {
        const postsData = await bufferGraphQL(postsQuery, {
          input: {
            organizationId: orgId,
            filter: { channelIds: [ch.id], status: ['sent'] },
          },
        });
        const edges = postsData.posts.edges;
        const lastPost = edges.length > 0 ? edges[0].node : null;

        return {
          id: ch.id,
          name: ch.name,
          service: ch.service,
          avatar: ch.avatar,
          lastPost: lastPost
            ? {
                text: fixMojibake(lastPost.text),
                dueAt: lastPost.dueAt,
                metrics: extractMetrics(lastPost.metrics),
              }
            : null,
          error: null,
        };
      } catch (e) {
        return {
          id: ch.id,
          name: ch.name,
          service: ch.service,
          avatar: ch.avatar,
          lastPost: null,
          error: e.message,
        };
      }
    })
  );

  return results;
}

// ─────────────────────────────────────────────────────────
// APP STORE CONNECT
// ─────────────────────────────────────────────────────────

export async function getAppStoreStats() {
  const keyId = process.env.APP_STORE_CONNECT_KEY_ID;
  const issuerId = process.env.APP_STORE_CONNECT_ISSUER_ID;
  const vendor = process.env.APP_STORE_CONNECT_VENDOR_NUMBER;
  const keyPath = process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH;

  if (!keyId || !issuerId || !vendor || !keyPath) {
    return { error: 'Configuration App Store Connect incomplète dans .env' };
  }
  if (!fs.existsSync(keyPath)) {
    return { error: `Clé privée introuvable: ${keyPath}` };
  }

  const privateKey = fs.readFileSync(keyPath, 'utf-8');

  const token = jwt.sign(
    { iss: issuerId, aud: 'appstoreconnect-v1' },
    privateKey,
    {
      algorithm: 'ES256',
      expiresIn: '15m',
      keyid: keyId,
    }
  );

  const reportDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const params = new URLSearchParams({
    'filter[frequency]': 'DAILY',
    'filter[reportType]': 'SALES',
    'filter[reportSubType]': 'SUMMARY',
    'filter[reportDate]': reportDate,
    'filter[vendorNumber]': vendor,
  });

  const url = `https://api.appstoreconnect.apple.com/v1/salesReports?${params}`;

  let res;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (e) {
    return { error: `Connexion: ${e.message}` };
  }

  if (res.status === 404) {
    return { date: reportDate, downloads: 0, updates: 0, redownloads: 0 };
  }
  if (!res.ok) {
    return { error: `HTTP ${res.status}` };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  let text;
  try {
    text = zlib.gunzipSync(buf).toString('utf-8');
  } catch (e) {
    return { error: 'Décompression échouée' };
  }

  const lines = text.trim().split('\n');
  if (lines.length < 1) {
    return { date: reportDate, downloads: 0, updates: 0, redownloads: 0 };
  }

  const cols = lines[0].split('\t');
  let downloads = 0;
  let updates = 0;
  let redownloads = 0;
  const countries = new Set();

  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    const row = {};
    cols.forEach((c, i) => (row[c] = cells[i]));

    const title = (row['Title'] || '').toLowerCase();
    const sku = (row['SKU'] || '').toLowerCase();
    if (title.includes('timalaus') || sku.includes('juno')) {
      const units = parseInt(row['Units'] || '0', 10);
      const ptype = row['Product Type Identifier'] || '';
      const country = row['Country Code'] || '?';
      if (ptype === '1') {
        downloads += units;
        countries.add(country);
      } else if (ptype === '7') {
        updates += units;
      } else if (ptype === '1F') {
        redownloads += units;
      }
    }
  }

  return {
    date: reportDate,
    downloads,
    updates,
    redownloads,
    countries: Array.from(countries).sort(),
  };
}

// ─────────────────────────────────────────────────────────
// GOOGLE PLAY CONSOLE
// ─────────────────────────────────────────────────────────

export async function getGooglePlayStats() {
  const bucket = process.env.GOOGLE_PLAY_BUCKET_ID;
  const keyPath = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

  if (!bucket || !keyPath) {
    return { error: 'Configuration Google Play incomplète dans .env' };
  }
  if (!fs.existsSync(keyPath)) {
    return { error: `Clé service account introuvable: ${keyPath}` };
  }

  try {
    const auth = new GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/devstorage.read_only'],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=stats/installs/&maxResults=10`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token.token}` },
    });

    if (res.status === 403) {
      return { error: '403 - Permission refusée sur le bucket' };
    }
    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const items = data.items || [];
    const files = items.map((i) => path.basename(i.name || ''));
    return { files, count: files.length };
  } catch (e) {
    return { error: `Auth: ${e.message}` };
  }
}

// ─────────────────────────────────────────────────────────
// AGGREGATION
// ─────────────────────────────────────────────────────────

export async function getMarketingOverview() {
  const [buffer, appStore, googlePlay] = await Promise.all([
    getBufferOverview().catch((e) => ({ error: e.message })),
    getAppStoreStats().catch((e) => ({ error: e.message })),
    getGooglePlayStats().catch((e) => ({ error: e.message })),
  ]);

  return {
    buffer,
    appStore,
    googlePlay,
    fetchedAt: new Date().toISOString(),
  };
}
