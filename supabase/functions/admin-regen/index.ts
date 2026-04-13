import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STYLE_GUIDE = `# 🏛️ Charte Visuelle V2 (Timalaus Premium)
L'objectif est de créer des VISUELS DE HAUTE VOLÉE, ÉVOCATEURS.
1. MÉDIUM ARTISTIQUE : Si l'utilisateur demande "Bande dessinée", "Peinture", "Miyazaki", etc., TU DOIS ABSOLUMENT ABANDONNER L'ASPECT PHOTOGRAPHIQUE. Le prompt final doit explicitement interdire le "photorealisme" et forcer des termes comme "illustration", "drawn", "painted".
2. TEXTURES : Doit correspondre au médium (ex: coups de pinceaux pour la peinture, hachures pour le dessin, grain pour la photo).
3. CADRAGE CINÉMATIQUE : Liberté de plan, souffle et perspective forte.
4. RÈGLES D'OR : INTERDICTION de texte lisible, de lunettes modernes ou montres.`;

const LEGAL_GUIDE = `# ⚖️ Protocole "Droit à l'Image & Sécurité Juridique" (Optimisé IA)
Ce document est une CONTRAINTE ABSOLUE. ZÉRO RISQUE JURIDIQUE.
1. Immunité Personnalités : Interdit de ressembler à une personne réelle (Messi, Obama). Utilise des visages génériques, silhouettes, plans de dos.
2. Neutralité Marques : Zéro logo. Vêtements unbranded.
3. Architecture/Pop Culture : Interdit les monuments sous copyright ou personnages de fiction.
4. Pas de dates lisibles.
=> Si actif, force these tokens: "unbranded equipment, anonymous faces, cinematic silhouette, no logos, plain clothing, generic architecture"`;

const IP_AVOIDANCE_GUIDE = `🌟 PROTOCOLE D'ÉVITEMENT IP CRÉATIF :
Si le sujet contient une licence ou un personnage de fiction protégé :
1. NE JAMAIS mentionner le nom de la marque ou du personnage dans le flux_prompt.
2. Privilégier systématiquement une représentation LITTÉRALE et NATURELLE du sujet (ex: l'animal réel ou l'objet du quotidien dont il est inspiré) plutôt qu'un design de personnage de fiction.
3. Éviter toute ressemblance avec la charte graphique de la licence (couleurs iconiques, accessoires typiques).
4. En cas de blocage, basculer sur une représentation SYMBOLIQUE ou MÉTONYMIQUE (un objet lié au métier ou à l'univers mais non déposé).`;

const AGENT_EVALUATOR = `# ⚖️ Le Professeur (Expert d'Art V2)
RÉPONDS UNIQUEMENT EN JSON.
{ 
  "score_total": 0, 
  "detailed_eval": { ... },
  "feedback_critique_global": "Résumé synthétique",
  "should_retry": true/false 
}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { id, titre, date, description, source, custom_styles, legal_safety, direct_prompt } = payload;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!;

    const transformStream = new TransformStream();
    const writer = transformStream.writable.getWriter();
    const encoder = new TextEncoder();

    const sendEvent = async (data: any) => {
      try {
        await writer.write(encoder.encode(JSON.stringify(data) + "\n"));
      } catch (e) { console.error("Write error:", e); }
    };

    const callGemini = async (prompt: string, imageData?: string) => {
      const model = "gemini-2.0-flash";
      const contents: any[] = [{ role: "user", parts: [{ text: prompt }] }];
      if (imageData) {
        contents[0].parts.push({
          inlineData: { mimeType: "image/webp", data: imageData }
        });
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, generationConfig: { responseMimeType: "application/json" } })
      });
      const data = await res.json();
      if (data.error) throw new Error("Gemini API Error: " + data.error.message);
      
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Gemini n'a renvoyé aucun contenu (Refus possible).");
      
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Format JSON invalide reçu de Gemini.");
      
      return JSON.parse(jsonMatch[0]);
    };

    (async () => {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        let isAutoMode = !custom_styles || custom_styles.length === 0;
        let maxAttempts = (isAutoMode && !direct_prompt) ? 3 : 1;
        let attempts = 0;
        let bestBuffer: any = null, bestEval: any = null, bestScore = -1, bestBrain = null;

        while (attempts < maxAttempts) {
          attempts++;
          
          let currentBrain: any = {};
          
          if (direct_prompt) {
            await sendEvent({ step: 'brain_thinking', message: `⚡ Utilisation du prompt direct...` });
            currentBrain = { 
              flux_prompt: direct_prompt, 
              reflexion: { concept_visuel: "Prompt direct utilisateur" } 
            };
          } else {
            let styleInstructions = isAutoMode 
              ? `CHARTE VISUELLE V2: ${STYLE_GUIDE}` 
              : `CONTRAINTES CRÉATIVES IMPOSÉES : ${custom_styles.join(', ')}\nTu DOIS impérativement construire ton concept UNIQUEMENT autour de ces choix. Ton prompt final DOIT se focaliser à 100% sur ces styles choisis et abandonner le reste.
                 RÈGLES D'OR APPLICABLES: INTERDICTION de texte lisible, de lunettes modernes ou montres.`;

            let legalPrompt = legal_safety ? `${LEGAL_GUIDE}\n${IP_AVOIDANCE_GUIDE}` : "";

            await sendEvent({ step: 'brain_thinking', message: `🧠 Réflexion stratégique (${attempts}/${maxAttempts})...` });
            
            currentBrain = await callGemini(`
              Évènement: "${titre}" (${date})
              Description: ${description}
              
              ${styleInstructions}
              ${legalPrompt}
              
              Format JSON requis: { 
                 "reflexion": {
                    "analyse_droits_image": "...",
                    "integration_styles": "...",
                    "concept_visuel": "..."
                 }, 
                 "flux_prompt": "Technique English prompt for Flux Schnell. TRADUIS EXACTEMENT les styles imposés au début du prompt. Pas de copyright names." 
              }
            `);

            if (currentBrain.reflexion?.analyse_droits_image) await sendEvent({ step: 'brain_thinking', message: `⚖️ Juridique: ${currentBrain.reflexion.analyse_droits_image}` });
            if (currentBrain.reflexion?.integration_styles) await sendEvent({ step: 'brain_thinking', message: `🧑‍🎨 Style: ${currentBrain.reflexion.integration_styles}` });
            if (currentBrain.reflexion?.concept_visuel) await sendEvent({ step: 'brain_thinking', message: `💡 Concept: ${currentBrain.reflexion.concept_visuel}` });
          }
          
          if (!currentBrain.flux_prompt) throw new Error("Le prompt technique de génération est vide.");
          
          await sendEvent({ step: 'brain_prompt', message: `🌀 Prompt: ${currentBrain.flux_prompt}` });

          await sendEvent({ step: 'generate', message: `🎨 Génération Flux Schnell...` });
          const fluxRes = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ version: "black-forest-labs/flux-schnell", input: { prompt: currentBrain.flux_prompt, aspect_ratio: "16:9" } })
          });
          const fluxData = await fluxRes.json();
          if (fluxData.error) throw new Error("Replicate API Error: " + fluxData.error);
          
          let imageUrl = "";
          for (let i = 0; i < 40; i++) {
            const poll = await fetch(`https://api.replicate.com/v1/predictions/${fluxData.id}`, { headers: { "Authorization": `Token ${REPLICATE_API_TOKEN}` } });
            const pollData = await poll.json();
            if (pollData.status === "succeeded") { imageUrl = pollData.output[0]; break; }
            if (pollData.status === "failed") throw new Error("Flux failed");
            await new Promise(r => setTimeout(r, 1000));
          }

          const imgFetch = await fetch(imageUrl);
          const currentBuffer = await imgFetch.arrayBuffer();
          const base64Img = base64Encode(new Uint8Array(currentBuffer));
          
          let currentEval: any = { score_total: 10 }; // Default score for direct prompt
          
          if (!direct_prompt) {
            await sendEvent({ step: 'evaluate', message: `⚖️ Analyse Professeur...` });
            currentEval = await callGemini(`Évènement: "${titre}" (${date})\n${AGENT_EVALUATOR}`, base64Img);
          }

          const score = currentEval.score_total || 0;
          
          // --- ARCHIVAGE DU LOG ---
          try {
            await supabase.from('generation_logs_archive').insert({
              evenement_id: id,
              titre_evenement: titre,
              attempt_number: attempts,
              brainstorm_data: currentBrain.reflexion,
              flux_prompt: currentBrain.flux_prompt,
              evaluation_data: currentEval,
              final_score: score,
              is_chosen: false 
            });
          } catch (logErr) { console.error("Log error:", logErr); }

          if (score > bestScore) {
            bestScore = score; bestBuffer = currentBuffer; bestEval = currentEval; bestBrain = currentBrain;
          }

          if (score >= 8 || !isAutoMode || direct_prompt) break;
        }

        await sendEvent({ step: 'save', message: `💾 Sauvegarde (${bestScore}/10)...` });
        const fileName = `cloud_${id}_${Date.now()}.webp`;
        await supabase.storage.from("evenements-image").upload(fileName, bestBuffer, { contentType: "image/webp" });
        const { data: { publicUrl } } = supabase.storage.from("evenements-image").getPublicUrl(fileName);

        const targetTable = source || 'evenements';
        await supabase.from(targetTable).update({ illustration_url: publicUrl }).eq("id", id);
        
        // Mark last log as chosen
        try {
           await supabase.from('generation_logs_archive')
            .update({ is_chosen: true })
            .eq('evenement_id', id)
            .eq('attempt_number', attempts);
        } catch (e) {}

        await sendEvent({ step: 'complete', publicUrl });
      } catch (err: any) {
        await sendEvent({ step: 'error', message: `Erreur : ${err.message}` });
      } finally {
        await writer.close();
      }
    })();

    return new Response(transformStream.readable, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
