import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

interface ReviewPayload {
  image_url: string;
  titre: string;
  date?: string;
  description_detaillee?: string;
}

interface GeminiReview {
  note_sur_10: number;
  points_forts: string[];
  points_faibles: string[];
  resume: string;
}

const buildPrompt = ({ titre, date, description_detaillee }: ReviewPayload) => `
Tu es un agent expert en direction artistique d'illustrations historiques pour Timalaus.

Contexte de l'événement:
- Titre: ${titre}
- Date: ${date || "non renseignée"}
- Description détaillée: ${description_detaillee || "non renseignée"}

Tâche:
1) Analyse la qualité et la pertinence de l'illustration par rapport au contexte.
2) Donne une note globale stricte sur 10.
3) Liste 3 à 5 points forts.
4) Liste 3 à 5 points faibles.
5) Ajoute un résumé actionnable en 2 phrases max.

Réponds UNIQUEMENT en JSON valide avec ce schéma exact:
{
  "note_sur_10": 0,
  "points_forts": ["..."],
  "points_faibles": ["..."],
  "resume": "..."
}
`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReviewPayload;
    const { image_url, titre, date, description_detaillee } = body;

    if (!image_url || !titre) {
      return new Response(
        JSON.stringify({ error: "Paramètres requis manquants: image_url, titre" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Secret GEMINI_API_KEY introuvable" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageRes = await fetch(image_url);
    if (!imageRes.ok) {
      throw new Error(`Impossible de récupérer l'image (status ${imageRes.status})`);
    }

    const contentType = imageRes.headers.get("content-type") || "image/webp";
    const imageBuffer = await imageRes.arrayBuffer();
    const imageBase64 = base64Encode(new Uint8Array(imageBuffer));

    const model = "gemini-2.0-flash";
    const prompt = buildPrompt({ image_url, titre, date, description_detaillee });

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: contentType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    if (geminiData.error) {
      throw new Error(`Gemini API Error: ${geminiData.error.message}`);
    }

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Gemini n'a renvoyé aucun contenu exploitable.");
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Réponse JSON introuvable dans la sortie Gemini.");
    }

    const review = JSON.parse(jsonMatch[0]) as GeminiReview;

    return new Response(JSON.stringify({ review }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
