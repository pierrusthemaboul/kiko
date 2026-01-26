const RAW_SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const RAW_SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!RAW_SUPABASE_URL || !RAW_SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const SUPABASE_URL = RAW_SUPABASE_URL as string;
const SUPABASE_KEY = RAW_SUPABASE_KEY as string;

const GENERIC_RULES = [
  {
    id: 'entry-war-context',
    test: (title: string) => /entrée en guerre/i.test(title) && !/guerre mondiale|première|seconde|ww|entente|axe/i.test(title),
    recommendation: 'Préciser la guerre ou l’alliance concernée (ex: « dans la Première Guerre mondiale », « aux côtés de l’Entente »).',
  },
  {
    id: 'mobilisation-country',
    test: (title: string) => /^mobilisation générale$/i.test(title),
    recommendation: 'Mentionner le pays et le contexte (mobilisation française de 1939, mobilisation russe de 1914, etc.).',
  },
  {
    id: 'independences-wave',
    test: (title: string) => /indépendances africaines/i.test(title),
    recommendation: 'Exprimer la vague de décolonisation concernée et, si possible, le nombre de pays ou les puissances concernées.',
  },
  {
    id: 'antisemitic-laws',
    test: (title: string) => /lois antisémites/i.test(title) && !/vichy|statut|france|allemagne/i.test(title),
    recommendation: 'Préciser l’autorité qui promulgue le texte (ex: Vichy, Allemagne nazie) et la nature du renforcement.',
  },
  {
    id: 'currency-introduction',
    test: (title: string) => /dollar américain/i.test(title) && !/coinage act|monnaie nationale|adoption/i.test(title),
    recommendation: 'Préciser l’instrument juridique (Coinage Act de 1792) ou le contexte (création de la monnaie nationale).',
  },
];

async function fetchEvents() {
  const pageSize = 1000;
  let from = 0;
  const rows: Array<{ id: string; titre: string; date: string }> = [];
 while (true) {
    const headers: Record<string, string> = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Range: `${from}-${from + pageSize - 1}`,
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/evenements?select=id,titre,date`, {
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase error (${response.status}): ${text}`);
    }

    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function auditTitles(events: Array<{ id: string; titre: string; date: string }>) {
  return events.flatMap(event => {
    const title = event.titre || '';
    const matchedRules = GENERIC_RULES.filter(rule => rule.test(title));
    return matchedRules.map(rule => ({
      id: event.id,
      titre: title,
      date: event.date,
      rule: rule.id,
      recommendation: rule.recommendation,
    }));
  });
}

(async () => {
  try {
    const events = await fetchEvents();
    const findings = auditTitles(events);
    if (findings.length === 0) {
      console.log('✅ Aucun titre ambigu détecté par les règles configurées.');
      return;
    }

    console.log('Titres à clarifier (selon les règles heuristiques) :');
    for (const finding of findings) {
      console.log(`${finding.titre} (${finding.date}) — règle: ${finding.rule}`);
      console.log(`  ↳ ${finding.recommendation}`);
      console.log(`  ↳ id: ${finding.id}`);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
