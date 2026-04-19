import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { message, count = 10, mode = 'manual', antiDoublon = true, tripleCheck = true } = await req.json();

    const secrets = {
      GEMINI: Deno.env.get("GEMINI_API_KEY"),
      OPENAI: Deno.env.get("OPENAI_API_KEY"),
      URL: Deno.env.get("SUPABASE_URL"),
      KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    };

    const supabase = createClient(secrets.URL!, secrets.KEY!);
    const logs: string[] = [];

    async function tool_search_events({ query, limit = 10 }: { query: string, limit?: number }) {
      logs.push(`Action: Recherche SQL pour "${query}".`);
      
      // Nettoyage et découpage en mots-clés (min 3 lettres pour éviter le bruit)
      const keywords = query.split(/\s+/).filter(w => w.length >= 3);
      
      let baseQuery = supabase.from('evenements').select('*');
      
      // On applique un filtre pour CHAQUE mot-clé (AND logic)
      for (const word of keywords) {
        const term = `%${word}%`;
        baseQuery = baseQuery.or(`titre.ilike."${term}",date_formatee.ilike."${term}"`);
      }
      
      const { data, error } = await baseQuery.limit(limit);
      
      if (error) return { error: error.message };
      return data;
    }

    async function tool_batch_verify({ titles }: { titles: string[] }) {
      logs.push(`Action: Vérification par lot de ${titles.length} événements.`);
      const results = await Promise.all(titles.map(async (title) => {
        let similarityMatch = null;
        let wikiData = null;

        if (antiDoublon) {
          try {
            const embRes = await fetch("https://api.openai.com/v1/embeddings", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${secrets.OPENAI}` },
              body: JSON.stringify({ model: "text-embedding-3-small", input: title }),
            });
            const { data: [{ embedding }] } = await embRes.json();

            // Priorité : titre_description (plus précis, moins de faux positifs)
            // Fallback : titre seul si titre_description non encore généré pour cet événement
            let matches: any[] | null = null;
            const { data: matchesTD } = await supabase.rpc("match_evenements_by_titre_description", {
              query_embedding: embedding,
              match_count: 1,
            });
            if (matchesTD && matchesTD.length > 0) {
              matches = matchesTD;
            } else {
              const { data: matchesT } = await supabase.rpc("match_evenements_by_titre", {
                query_embedding: embedding,
                match_count: 1,
              });
              matches = matchesT;
            }
            if (matches?.[0]?.similarity > 0.88) similarityMatch = matches[0];
          } catch (e) { console.error(e); }
        }

        if (tripleCheck) {
          try {
            const wikiRes = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
            if (wikiRes.ok) wikiData = await wikiRes.json();
          } catch (e) { console.error(e); }
        }

        return { title, similarityMatch, wikiData };
      }));

      return results;
    }

    const TOOL_DECLARATIONS = [
      {
        name: "search_events",
        description: "Rechercher des événements existants dans la base de données par titre ou date.",
        parameters: {
          type: "object",
          properties: { 
            query: { type: "string", description: "Le terme de recherche (ex: 'Napoléon', '1914', 'mort')" },
            limit: { type: "number", description: "Nombre max de résultats" }
          },
          required: ["query"],
        },
      },
      {
        name: "batch_verify",
        description: "Vérifier l'existence (doublons) et la biographie (Wikipédia) d'une liste d'événements.",
        parameters: {
          type: "object",
          properties: { titles: { type: "array", items: { type: "string" } } },
          required: ["titles"],
        },
      }
    ];

    // --- RAPID CONTEXT ---
    const SYSTEM_PROMPT = `Tu es l'Expert Assistant Timalaus. 
    Ta mission : Rechercher ou générer des événements historiques dans la base de données.
    
    RÈGLES :
    1. RECHERCHE : Utilise TOUJOURS 'search_events' pour trouver des données. Exprime-toi via l'outil.
    2. RÉPONSE FINALE : Réponds TOUJOURS en JSON : { "text": "...", "events": [] }.
    3. ANALYSE : Si l'outil ne renvoie rien, explique-le et suggère d'autres mots-clés.`;

    const model_name = "gemini-2.0-flash";
    let contents = [{ role: "user", parts: [{ text: message }] }];

    async function callGemini(currentContents: any[], forceTool: boolean = false, forceJson: boolean = false) {
      const config: any = {
        contents: currentContents,
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        tools: [{ function_declarations: TOOL_DECLARATIONS }],
      };
      
      if (forceTool) {
        config.tool_config = { function_calling_config: { mode: "ANY" } };
      }
      if (forceJson) {
        config.generationConfig = { response_mime_type: "application/json" };
      }

      const gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model_name}:generateContent?key=${secrets.GEMINI}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      return await gRes.json();
    }

    // Détection d'intention de recherche pour forcer l'outil
    const isSearch = /trouve|cherche|qui|quand|mort|guerre|révolution|napoléon|moyen-âge/i.test(message);
    let resData = await callGemini(contents, isSearch, false);
    
    let iterations = 0;
    const allFoundEvents: any[] = [];

    while (iterations < 5) {
      const candidate = resData.candidates?.[0];
      if (!candidate) break;

      const parts = candidate.content.parts || [];
      const functionCalls = parts.filter((p: any) => p.functionCall);

      if (functionCalls.length === 0) break;

      iterations++;
      contents.push(candidate.content);

      const toolResults = await Promise.all(functionCalls.map(async (part: any) => {
        const { name, args } = part.functionCall;
        let result;
        if (name === "search_events") {
            result = await tool_search_events(args);
            if (Array.isArray(result)) allFoundEvents.push(...result);
        }
        else if (name === "batch_verify") result = await tool_batch_verify(args);
        return { role: "function", parts: [{ functionResponse: { name, response: { result } } }] };
      }));

      contents.push(...toolResults);
      resData = await callGemini(contents, false, false);
    }

    // Réponse finale structurée
    contents.push({ role: 'user', parts: [{ text: "Génère ta réponse finale. Inclus les événements trouvés dans le champ 'events' du JSON { \"text\": \"...\", \"events\": [...] }." }] });
    resData = await callGemini(contents, false, true);

    const finalContent = resData.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || "{}";
    let finalJson;
    try {
      finalJson = JSON.parse(finalContent);
    } catch (e) {
      finalJson = { text: finalContent, events: [] };
    }

    // --- SAFETY NET ---
    // Si l'IA a oublié de mettre les événements dans le JSON mais qu'on en a trouvé, on les rajoute de force.
    if ((!finalJson.events || finalJson.events.length === 0) && allFoundEvents.length > 0) {
        finalJson.events = allFoundEvents;
    }

    return new Response(JSON.stringify({ ...finalJson, logs }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
