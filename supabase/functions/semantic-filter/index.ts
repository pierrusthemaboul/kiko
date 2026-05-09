import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { refEventId, candidateIds, similarityThreshold = 0.75 } = await req.json();

    if (!refEventId || !candidateIds || !Array.isArray(candidateIds)) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: refEventId, candidateIds (array)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer l'embedding de l'événement de référence (image)
    const { data: refEmbedding, error: refError } = await supabase
      .from("evenements_embeddings")
      .select("embedding_768")
      .eq("id", refEventId)
      .eq("source_type", "image")
      .not("embedding_768", "is", null)
      .single();

    if (refError || !refEmbedding || !refEmbedding.embedding_768) {
      // Si pas d'embedding, retourner tous les candidats comme diverses
      return new Response(
        JSON.stringify({
          results: candidateIds.map((id: string) => ({
            eventId: id,
            isDiverse: true,
            similarityScore: 0.0,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Récupérer les embeddings des candidats
    const { data: candidateEmbeddings, error: candidatesError } = await supabase
      .from("evenements_embeddings")
      .select("id, embedding_768")
      .in("id", candidateIds)
      .eq("source_type", "image")
      .not("embedding_768", "is", null);

    if (candidatesError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch candidate embeddings", details: candidatesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Calculer la similarité pour chaque candidat
    const results = candidateIds.map((candidateId: string) => {
      const candidate = candidateEmbeddings?.find((e: any) => e.id === candidateId);
      
      if (!candidate || !candidate.embedding_768) {
        return {
          eventId: candidateId,
          isDiverse: true,
          similarityScore: 0.0,
        };
      }

      // Calculer la similarité cosinus (1 - distance)
      const refVector = refEmbedding.embedding_768;
      const candVector = candidate.embedding_768;
      
      // Distance euclidienne (pgvector <=> operator)
      let distance = 0;
      for (let i = 0; i < refVector.length; i++) {
        const diff = refVector[i] - candVector[i];
        distance += diff * diff;
      }
      distance = Math.sqrt(distance);
      
      // Convertir en similarité (approximation)
      const similarityScore = Math.max(0, 1 - (distance / Math.sqrt(refVector.length)));
      
      const isDiverse = similarityScore < similarityThreshold;

      return {
        eventId: candidateId,
        isDiverse,
        similarityScore,
      };
    });

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
