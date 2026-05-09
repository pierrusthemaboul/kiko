import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { eventIds, numClusters = 5 } = await req.json();

    if (!eventIds || !Array.isArray(eventIds)) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: eventIds (array)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer les embeddings des événements
    const { data: embeddings, error: embeddingsError } = await supabase
      .from("evenements_embeddings")
      .select("id, embedding_768")
      .in("id", eventIds)
      .eq("source_type", "image")
      .not("embedding_768", "is", null);

    if (embeddingsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch embeddings", details: embeddingsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!embeddings || embeddings.length === 0) {
      // Si pas d'embeddings, retourner des clusters aléatoires
      const shuffled = [...eventIds].sort(() => Math.random() - 0.5);
      const clusters: any[] = [];
      for (let i = 0; i < numClusters; i++) {
        clusters.push({
          clusterId: i,
          eventIds: shuffled.slice(i * Math.ceil(shuffled.length / numClusters), (i + 1) * Math.ceil(shuffled.length / numClusters))
        });
      }
      return new Response(
        JSON.stringify({ clusters }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Algorithme de clustering K-means simplifié
    const vectors = embeddings.map((e: any) => e.embedding_768);
    const ids = embeddings.map((e: any) => e.id);

    // Initialiser les centroïdes aléatoirement
    const centroids: number[][] = [];
    for (let i = 0; i < numClusters; i++) {
      const randomIndex = Math.floor(Math.random() * vectors.length);
      centroids.push([...vectors[randomIndex]]);
    }

    // K-means itérations (5 itérations pour la performance)
    for (let iter = 0; iter < 5; iter++) {
      const clusters: number[][] = Array.from({ length: numClusters }, () => []);

      // Assigner chaque vecteur au centroïde le plus proche
      for (let i = 0; i < vectors.length; i++) {
        let minDist = Infinity;
        let closestCluster = 0;

        for (let c = 0; c < numClusters; c++) {
          let dist = 0;
          for (let d = 0; d < vectors[i].length; d++) {
            const diff = vectors[i][d] - centroids[c][d];
            dist += diff * diff;
          }
          dist = Math.sqrt(dist);

          if (dist < minDist) {
            minDist = dist;
            closestCluster = c;
          }
        }

        clusters[closestCluster].push(i);
      }

      // Recalculer les centroïdes
      for (let c = 0; c < numClusters; c++) {
        if (clusters[c].length === 0) continue;

        const newCentroid = new Array(vectors[0].length).fill(0);
        for (const idx of clusters[c]) {
          for (let d = 0; d < vectors[idx].length; d++) {
            newCentroid[d] += vectors[idx][d];
          }
        }

        for (let d = 0; d < newCentroid.length; d++) {
          newCentroid[d] /= clusters[c].length;
        }

        centroids[c] = newCentroid;
      }
    }

    // 3. Assigner les événements aux clusters finaux
    const finalClusters: number[][] = Array.from({ length: numClusters }, () => []);
    for (let i = 0; i < vectors.length; i++) {
      let minDist = Infinity;
      let closestCluster = 0;

      for (let c = 0; c < numClusters; c++) {
        let dist = 0;
        for (let d = 0; d < vectors[i].length; d++) {
          const diff = vectors[i][d] - centroids[c][d];
          dist += diff * diff;
        }
        dist = Math.sqrt(dist);

        if (dist < minDist) {
          minDist = dist;
          closestCluster = c;
        }
      }

      finalClusters[closestCluster].push(i);
    }

    // 4. Formater la réponse
    const clusters = finalClusters.map((clusterIndices, clusterId) => ({
      clusterId,
      eventIds: clusterIndices.map(idx => ids[idx]),
    }));

    return new Response(
      JSON.stringify({ clusters }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
