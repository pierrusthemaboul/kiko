import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const localDb = createClient(
    process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BATCH_SIZE = 20;          // événements par appel IA
const SEUIL_ECART = 5;          // écart en années accepté avant flagging
const PAGE_SIZE = 1000;         // pagination Supabase
const LIMIT = 0;              // max événements à traiter (0 = tous)
// ──────────────────────────────────────────────────────────────────────────────

async function verifierDatesAvecIA(batch) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY manquante');

    const listeEvenements = batch.map((e, i) =>
        `${i + 1}. [ID:${e.id}] "${e.titre}"${e.description ? ` — ${e.description.slice(0, 120)}` : ''}`
    ).join('\n');

    const prompt = `Tu es un historien expert et vérificateur de faits pour un jeu de quiz chronologique.

Pour chaque événement ci-dessous, donne l'année RÉELLE à laquelle il s'est produit, en te basant UNIQUEMENT sur tes connaissances (sans tenir compte d'aucune date fournie).

RÈGLES :
- Réponds avec l'année entière (ex: 1789, 44, 1969).
- Si l'événement est très connu, sois précis.
- Si tu as un doute sérieux sur l'exactitude, indique-le dans "incertain: true".
- Ne devine pas : si l'événement est trop obscur pour être certain, mets "incertain: true" et donne un intervalle.

ÉVÉNEMENTS :
${listeEvenements}

Réponds UNIQUEMENT en JSON valide :
{
  "resultats": [
    {
      "id": 123,
      "annee_estimee": 1789,
      "annee_min": 1787,
      "annee_max": 1791,
      "incertain": false,
      "note": "Prise de la Bastille, date scolaire connue."
    }
  ]
}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' }
        })
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(text);
    return Array.isArray(parsed.resultats) ? parsed.resultats : [];
}

async function runAuditDates() {
    console.log('======================================================');
    console.log('📅  AUDIT DES DATES — CROSS-VALIDATION IA');
    console.log('======================================================\n');

    let totalVerifies = 0;
    let totalSuspects = 0;
    let totalIncertains = 0;
    let totalErreurs = 0;
    const suspects = [];

    let offset = 0;
    let totalSeen = 0;
    let pageIndex = 0;

    while (true) {
        if (LIMIT > 0 && totalSeen >= LIMIT) break;

        const pageStart = offset;
        const pageEnd = offset + PAGE_SIZE - 1;

        let query = localDb
            .from('labo')
            .select('id, titre, year, description')
            .order('id', { ascending: true })
            .range(pageStart, pageEnd);

        const { data: page, error } = await query;
        if (error) {
            console.error('❌ Erreur accès DB Locale:', error.message);
            return;
        }

        if (!page || page.length === 0) {
            if (totalSeen === 0) console.log('✅ Aucun événement à auditer dans labo.');
            break;
        }

        pageIndex++;
        console.log(`\n� Page ${pageIndex} — ${page.length} events (offset ${offset})`);

        // 2. Traitement par batch (dans la page)
        for (let i = 0; i < page.length; i += BATCH_SIZE) {
            const remainingAllowed = LIMIT > 0 ? Math.max(0, LIMIT - totalSeen) : null;
            if (remainingAllowed !== null && remainingAllowed <= 0) break;

            const batch = page.slice(i, i + BATCH_SIZE);
            if (remainingAllowed !== null && batch.length > remainingAllowed) {
                batch.length = remainingAllowed;
            }

            const batchNumGlobal = Math.floor(totalSeen / BATCH_SIZE) + 1;
            process.stdout.write(`Batch ${batchNumGlobal} (${batch.length} events)... `);

            let resultats = [];
            try {
                resultats = await verifierDatesAvecIA(batch);
            } catch (err) {
                console.error(`\n❌ Erreur IA batch ${batchNumGlobal}:`, err.message);
                totalErreurs += batch.length;
                totalSeen += batch.length;
                await new Promise(r => setTimeout(r, 3000));
                continue;
            }

            const idToResultat = {};
            for (const r of resultats) {
                idToResultat[r.id] = r;
            }

            for (const event of batch) {
                const res = idToResultat[event.id];
                if (!res) {
                    totalErreurs++;
                    totalSeen++;
                    continue;
                }

                const ecart = Math.abs((res.annee_estimee || 0) - (event.year || 0));
                const estSuspect = !res.incertain && ecart > SEUIL_ECART;
                const estIncertain = res.incertain === true;

                const validationNote = {
                    audit_date: new Date().toISOString(),
                    annee_stockee: event.year,
                    annee_estimee: res.annee_estimee,
                    annee_min: res.annee_min,
                    annee_max: res.annee_max,
                    ecart: ecart,
                    incertain: estIncertain,
                    note_ia: res.note || null,
                    verdict: estSuspect ? 'SUSPECT' : estIncertain ? 'INCERTAIN' : 'OK'
                };

                if (estSuspect) {
                    totalSuspects++;
                    suspects.push({
                        id: event.id,
                        titre: event.titre,
                        annee_stockee: event.year,
                        annee_estimee: res.annee_estimee,
                        ecart,
                        note: res.note
                    });

                    await localDb
                        .from('labo')
                        .update({
                            status: 'DATE_SUSPECT',
                            error_log: `ECART_DATE:${event.year}→estimé:${res.annee_estimee}(±${ecart}ans)`,
                            validation_notes: validationNote
                        })
                        .eq('id', event.id);

                } else if (estIncertain) {
                    totalIncertains++;

                    await localDb
                        .from('labo')
                        .update({ validation_notes: validationNote })
                        .eq('id', event.id);

                } else {
                    totalVerifies++;

                    await localDb
                        .from('labo')
                        .update({ validation_notes: validationNote })
                        .eq('id', event.id);
                }

                totalSeen++;
            }

            console.log('✓');

            if (i + BATCH_SIZE < page.length) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }

        offset += PAGE_SIZE;
    }

    // 2. Traitement par batch
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(events.length / BATCH_SIZE);

        process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} events)... `);

        let resultats = [];
        try {
            resultats = await verifierDatesAvecIA(batch);
        } catch (err) {
            console.error(`\n❌ Erreur IA batch ${batchNum}:`, err.message);
            totalErreurs += batch.length;
            await new Promise(r => setTimeout(r, 3000));
            continue;
        }

        // 3. Comparaison et mise à jour
        const idToResultat = {};
        for (const r of resultats) {
            idToResultat[r.id] = r;
        }

        for (const event of batch) {
            const res = idToResultat[event.id];
            if (!res) {
                totalErreurs++;
                continue;
            }

            const ecart = Math.abs((res.annee_estimee || 0) - (event.year || 0));
            const estSuspect = !res.incertain && ecart > SEUIL_ECART;
            const estIncertain = res.incertain === true;

            const validationNote = {
                audit_date: new Date().toISOString(),
                annee_stockee: event.year,
                annee_estimee: res.annee_estimee,
                annee_min: res.annee_min,
                annee_max: res.annee_max,
                ecart: ecart,
                incertain: estIncertain,
                note_ia: res.note || null,
                verdict: estSuspect ? 'SUSPECT' : estIncertain ? 'INCERTAIN' : 'OK'
            };

            if (estSuspect) {
                totalSuspects++;
                suspects.push({
                    id: event.id,
                    titre: event.titre,
                    annee_stockee: event.year,
                    annee_estimee: res.annee_estimee,
                    ecart,
                    note: res.note
                });

                await localDb
                    .from('labo')
                    .update({
                        status: 'DATE_SUSPECT',
                        error_log: `ECART_DATE:${event.year}→estimé:${res.annee_estimee}(±${ecart}ans)`,
                        validation_notes: validationNote
                    })
                    .eq('id', event.id);

            } else if (estIncertain) {
                totalIncertains++;

                await localDb
                    .from('labo')
                    .update({ validation_notes: validationNote })
                    .eq('id', event.id);

            } else {
                totalVerifies++;

                await localDb
                    .from('labo')
                    .update({ validation_notes: validationNote })
                    .eq('id', event.id);
            }
        }

        console.log('✓');

        // Pause pour respecter les rate limits
        if (i + BATCH_SIZE < events.length) {
            await new Promise(r => setTimeout(r, 1500));
        }
    }

    // 4. Rapport final
    console.log('\n======================================================');
    console.log('📋  RAPPORT D\'AUDIT DES DATES');
    console.log('======================================================');
    console.log(`✅ Dates confirmées (OK)      : ${totalVerifies}`);
    console.log(`⚠️  Dates incertaines          : ${totalIncertains}`);
    console.log(`❌ Dates suspectes (écart >±${SEUIL_ECART}an) : ${totalSuspects}`);
    console.log(`💥 Erreurs IA                 : ${totalErreurs}`);
    console.log(`📦 Total traité               : ${totalSeen}`);

    if (suspects.length > 0) {
        console.log('\n📌 SUSPECTS À CORRIGER MANUELLEMENT :');
        console.log('-'.repeat(60));
        for (const s of suspects) {
            console.log(`  [ID:${s.id}] "${s.titre}"`);
            console.log(`    Stocké: ${s.annee_stockee}  |  Estimé: ${s.annee_estimee}  |  Écart: ±${s.ecart} ans`);
            if (s.note) console.log(`    Note IA: ${s.note}`);
        }
    }

    console.log('\n💡 Les événements STATUS=DATE_SUSPECT sont à corriger ou supprimer');
    console.log('   avant de passer à l\'étape suivante du pipeline.');
    console.log('======================================================\n');
}

runAuditDates().catch(err => {
    console.error('❌ Erreur fatale :', err);
    process.exit(1);
});

