import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { userId, levelCompleted, xpReward, heartsReward } = await req.json();

    // Validation des paramètres
    if (!userId || !levelCompleted || xpReward === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: userId, levelCompleted, xpReward" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Récupérer le profil actuel du joueur
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("xp_total, title_key, parties_per_day, current_streak, best_streak, last_play_date, games_played, high_score")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found", details: profileError?.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Valider que le joueur a l'XP nécessaire pour ce niveau
    // Importer la logique de calcul de rang depuis le client (à adapter côté serveur)
    // Pour l'instant, on utilise une validation simple basée sur l'XP
    const currentXp = profile.xp_total || 0;
    
    // Tableau des seuils XP par niveau (à synchroniser avec le client)
    const levelThresholds = [
      0,      // Niveau 1
      100,    // Niveau 2
      300,    // Niveau 3
      600,    // Niveau 4
      1000,   // Niveau 5
      1500,   // Niveau 6
      2100,   // Niveau 7
      2800,   // Niveau 8
      3600,   // Niveau 9
      4500,   // Niveau 10
    ];

    const requiredXpForLevel = levelThresholds[levelCompleted - 1] || 0;
    
    // Vérification : le joueur doit avoir au moins l'XP requis pour le niveau précédent
    const requiredXpForPreviousLevel = levelCompleted > 1 ? levelThresholds[levelCompleted - 2] : 0;
    
    if (currentXp < requiredXpForPreviousLevel) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid level completion", 
          message: `Player XP (${currentXp}) is insufficient for level ${levelCompleted}`,
          requiredXp: requiredXpForPreviousLevel
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Calculer le nouveau XP et le nouveau rang
    const newXp = currentXp + xpReward;
    
    // Déterminer le nouveau rang basé sur le nouveau XP
    let newLevel = 1;
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
      if (newXp >= levelThresholds[i]) {
        newLevel = i + 1;
        break;
      }
    }

    // Mapping des niveaux aux titres (à synchroniser avec le client)
    const levelTitles = [
      "page",
      "écuyer",
      "chevalier",
      "seigneur",
      "baron",
      "vicomte",
      "comte",
      "marquis",
      "duc",
      "prince",
    ];
    
    const newTitleKey = levelTitles[newLevel - 1] || "page";

    // 4. Mettre à jour le profil avec la récompense
    const updatePayload: any = {
      xp_total: newXp,
      title_key: newTitleKey,
      updated_at: new Date().toISOString(),
    };

    // Ajouter les cœurs si fournis
    if (heartsReward && heartsReward > 0) {
      // Note: Il faut vérifier si la table profiles a un champ hearts ou parties_restantes
      // Pour l'instant, on utilise parties_restantes comme proxy
      updatePayload.parties_restantes = (profile.parties_restantes || 0) + heartsReward;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update profile", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Retourner le résultat
    return new Response(
      JSON.stringify({
        success: true,
        newXp,
        newLevel,
        newTitleKey,
        xpReward,
        heartsReward,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
