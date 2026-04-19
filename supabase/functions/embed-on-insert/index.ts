/**
 * embed-on-insert
 *
 * Appelée par un trigger PostgreSQL (via pg_net) à chaque INSERT ou UPDATE
 * sur la table evenements. Génère et insère les 3 types d'embeddings dans
 * evenements_embeddings sans toucher à la table principale.
 *
 * Body attendu : { id: string, titre: string, description_detaillee: string | null }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "text-embedding-3-small";

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

async function upsert(
  supabase: ReturnType<typeof createClient>,
  id: string,
  sourceType: string,
  vector: number[]
) {
  const { error } = await supabase
    .from("evenements_embeddings")
    .upsert(
      {
        id,
        source_type: sourceType,
        model_name: MODEL,
        embedding_1536: JSON.stringify(vector),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id,source_type" }
    );
  if (error) throw new Error(`Upsert ${sourceType} failed: ${error.message}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Vérification par secret partagé (depuis trigger pg_net ou appels internes)
    const webhookSecret = Deno.env.get("EMBED_WEBHOOK_SECRET");
    if (webhookSecret) {
      const authHeader = req.headers.get("x-webhook-secret") || req.headers.get("authorization");
      const provided = authHeader?.replace(/^Bearer\s+/i, "");
      if (provided !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { id, titre, description_detaillee } = await req.json();

    if (!id || !titre) {
      return new Response(JSON.stringify({ error: "id and titre are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const desc = (description_detaillee || "").trim();
    const results: string[] = [];

    // 1. Embedding titre (toujours)
    try {
      const vec = await getEmbedding(titre, OPENAI_KEY);
      await upsert(supabase, id, "titre", vec);
      results.push("titre:ok");
    } catch (e: any) {
      results.push(`titre:err(${e.message})`);
    }

    // 2. Embedding description (si non vide)
    if (desc.length >= 5) {
      try {
        const vec = await getEmbedding(desc, OPENAI_KEY);
        await upsert(supabase, id, "description", vec);
        results.push("description:ok");
      } catch (e: any) {
        results.push(`description:err(${e.message})`);
      }
    } else {
      results.push("description:skipped(empty)");
    }

    // 3. Embedding titre_description (si description non vide, sinon fallback titre seul)
    try {
      const text = desc.length >= 5 ? `${titre}\n${desc}` : titre;
      const vec = await getEmbedding(text, OPENAI_KEY);
      await upsert(supabase, id, "titre_description", vec);
      results.push("titre_description:ok");
    } catch (e: any) {
      results.push(`titre_description:err(${e.message})`);
    }

    console.log(`[embed-on-insert] ${id} → ${results.join(", ")}`);

    return new Response(JSON.stringify({ id, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[embed-on-insert] fatal:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
