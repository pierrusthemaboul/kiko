import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type SourceTable = "sas" | "evenements" | "antichambre";

interface ApplyPayload {
  id: string;
  source: SourceTable;
  prompt: string;
  legal_safety?: boolean;
  anti_franchise?: boolean;
  force_cinematic?: boolean;
  bypass_gemini?: boolean;
}

interface DebugEntry {
  ts: string;
  step: string;
  data?: unknown;
}

const isSourceTable = (value: string): value is SourceTable =>
  value === "sas" || value === "evenements" || value === "antichambre";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ANTI_FRANCHISE_NOISE_TERMS = [
  "prioritaire",
  "consigne",
  "reglages",
  "réglages",
  "style",
  "contraintes",
  "constraint",
  "barriers",
  "empty lanes",
  "signage supports",
  "objects",
  "film, animation",
];

const isLikelyFranchiseProperNoun = (term: string) => {
  const cleaned = term.replace(/["'`]/g, "").trim();
  if (cleaned.length < 3 || cleaned.length > 80) return false;
  const lower = cleaned.toLowerCase();
  if (ANTI_FRANCHISE_NOISE_TERMS.some((noise) => lower.includes(noise))) return false;

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 10) return false;

  const significant = words.filter((w) => /[A-Za-zÀ-ÿ]/.test(w));
  const upperLikeCount = significant.filter((w) => /^[A-ZÀ-Ý0-9]/.test(w)).length;
  const hasAllCapsToken = significant.some((w) => /^[A-Z0-9]{2,}$/.test(w));

  return upperLikeCount >= 2 || hasAllCapsToken;
};

const extractAntiFranchiseTerms = (prompt: string) => {
  const terms = new Set<string>();

  const quotedMatches = prompt.matchAll(/"([^"]{3,120})"/g);
  for (const match of quotedMatches) {
    const value = (match[1] || "").trim();
    if (!value) continue;
    const phraseMatches = value.match(/\b(?:[A-ZÀ-Ý][\wÀ-ÿ'-]*|[A-Z0-9]{2,})(?:\s+(?:[A-ZÀ-Ý][\wÀ-ÿ'-]*|[A-Z0-9]{2,}|of|the|de|du|des|la|le|d')){0,6}\b/g) || [];
    phraseMatches.forEach((candidate) => {
      if (isLikelyFranchiseProperNoun(candidate)) terms.add(candidate.trim());
    });
    if (isLikelyFranchiseProperNoun(value)) terms.add(value);
  }

  const parenthesisMatches = prompt.matchAll(/\(([^)]{2,80})\)/g);
  for (const match of parenthesisMatches) {
    const value = (match[1] || "").trim();
    if (value && /[a-z]/i.test(value) && isLikelyFranchiseProperNoun(value)) terms.add(value);
  }

  const genericProperNounMatches = prompt.match(/\b(?:[A-ZÀ-Ý][\wÀ-ÿ'-]*|[A-Z0-9]{2,})(?:\s+(?:[A-ZÀ-Ý][\wÀ-ÿ'-]*|[A-Z0-9]{2,}|of|the|de|du|des|la|le|d')){1,5}\b/g) || [];
  genericProperNounMatches.forEach((candidate) => {
    if (isLikelyFranchiseProperNoun(candidate)) terms.add(candidate.trim());
  });

  return Array.from(terms)
    .map((v) => v.replace(/\s+/g, " ").replace(/[.,;:!?]+$/g, "").trim())
    .filter((v) => v.length >= 3)
    .slice(0, 24);
};

const sanitizeAntiFranchisePrompt = (prompt: string, forbiddenTerms: string[]) => {
  let output = prompt;
  const replacedTerms = new Set<string>();

  const explicitRiskPatterns: RegExp[] = [
    /\bGrand\s+Theft\s+Auto\b/gi,
    /\bRockstar(?:\s+Games|\s+North)?\b/gi,
    /\bPlayStation\s*\d*\b/gi,
    /\bXbox\s*(?:360|One|Series\s*[XS])?\b/gi,
  ];

  for (const pattern of explicitRiskPatterns) {
    const matches = output.match(pattern);
    if (matches) matches.forEach((m) => replacedTerms.add(m));
    output = output.replace(pattern, "fictional property");
  }

  const orderedForbiddenTerms = [...forbiddenTerms].sort((a, b) => b.length - a.length);
  for (const term of orderedForbiddenTerms) {
    const escaped = escapeRegExp(term);
    const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = output.match(pattern);
    if (matches) matches.forEach((m) => replacedTerms.add(m));
    output = output.replace(pattern, "fictional property");
  }

  output = output
    .replace(/\s{2,}/g, " ")
    .replace(/fictional property(?:\s+fictional property)+/gi, "fictional property")
    .trim();

  return {
    prompt: output,
    replacedTerms: Array.from(replacedTerms).slice(0, 50),
  };
};

const detectPromptConstraintFlags = (prompt: string) => {
  const lower = prompt.toLowerCase();
  const noHuman =
    lower.includes("no humans") ||
    lower.includes("sans humain") ||
    lower.includes("no person") ||
    lower.includes("no crowd") ||
    lower.includes("environment and objects only");
  const metonymy =
    lower.includes("métonymie") ||
    lower.includes("metonymy") ||
    lower.includes("indices matériels") ||
    lower.includes("symbolic objects");
  return { noHuman, metonymy };
};

const callGeminiForFluxPrompt = async (
  geminiApiKey: string,
  promptFr: string,
  legalSafety: boolean,
  antiFranchise: boolean,
  forbiddenTerms: string[]
) => {
  const flags = detectPromptConstraintFlags(promptFr);
  const legalClause = legalSafety
    ? "Keep strict right-to-image safety: no exact likeness of real identifiable people, no logos, no copyrighted characters."
    : "Keep a standard safety level and avoid exact 1:1 likeness of a real identifiable person.";

  const coherenceRules = [
    "Never introduce scene elements that conflict with constraints in the source prompt.",
    flags.noHuman
      ? "No-human mode detected: never add people, crowd, queue, spectators, audience, faces, silhouettes, or any human presence."
      : "If humans are allowed, keep them generic and non-identifiable.",
    flags.metonymy
      ? "Metonymy mode detected: represent the event through symbolic objects, environment clues, and indirect narrative markers; avoid literal scene depiction."
      : "Use a direct yet concise scene description.",
    "Keep all hard constraints explicit in the final output prompt.",
    antiFranchise
      ? "Anti-franchise mode detected: do not copy any title, brand, studio, product line, logo name, or proper noun from the source prompt; use neutral generic wording only."
      : "Franchise references can stay only if legally safe.",
    antiFranchise
      ? "Preserve event spirit in a legally-safe way: keep event type, historical period, emotional tone, and concrete non-branded object cues."
      : "Preserve event spirit and specificity.",
    antiFranchise
      ? "Avoid over-generic wording like 'major thing'; prefer descriptive non-branded anchors (domain, era, setting, object-level clues)."
      : "Use concise and specific wording.",
  ].join("\n- ");

  const antiFranchiseList = antiFranchise && forbiddenTerms.length > 0
    ? `Forbidden proper nouns/titles to avoid in output: ${forbiddenTerms.join("; ")}`
    : "";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Transform this French visual prompt into a concise, high-quality ENGLISH prompt optimized for Flux Schnell image generation.

Rules:
- Preserve intent and historical context.
- Keep legal constraints strict.
- Enforce internal consistency across all constraints.
- No markdown, no explanation, only JSON.
- Output format: {"flux_prompt":"..."}

Legal constraints: ${legalClause}

Coherence constraints:
- ${coherenceRules}
${antiFranchiseList ? `- ${antiFranchiseList}` : ""}

French prompt:
${promptFr}`,
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

  const data = await res.json();
  if (data.error) throw new Error(`Gemini API Error: ${data.error.message}`);

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Gemini n'a renvoyé aucun contenu exploitable.");

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Réponse JSON introuvable dans la sortie Gemini.");

  const parsed = JSON.parse(jsonMatch[0]) as { flux_prompt?: string };
  if (!parsed.flux_prompt || !parsed.flux_prompt.trim()) {
    throw new Error("Gemini n'a pas renvoyé de flux_prompt valide.");
  }

  return parsed.flux_prompt.trim();
};

const generateWithFluxSchnell = async (replicateApiToken: string, fluxPrompt: string) => {
  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${replicateApiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "black-forest-labs/flux-schnell",
      input: {
        prompt: fluxPrompt,
        aspect_ratio: "16:9",
      },
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(createData?.detail || createData?.error || "Erreur création prédiction Replicate");
  }

  const pollTrace: Array<{ iteration: number; status: string }> = [];

  for (let i = 0; i < 45; i += 1) {
    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${createData.id}`, {
      headers: { Authorization: `Token ${replicateApiToken}` },
    });
    const pollData = await pollRes.json();
    pollTrace.push({ iteration: i + 1, status: String(pollData?.status || "unknown") });

    if (pollData.status === "succeeded") {
      const output = pollData.output;
      if (Array.isArray(output) && output.length > 0) {
        return { imageUrl: output[0] as string, predictionId: String(createData.id), pollTrace };
      }
      if (typeof output === "string") {
        return { imageUrl: output, predictionId: String(createData.id), pollTrace };
      }
      throw new Error("Réponse Flux invalide: output vide.");
    }

    if (pollData.status === "failed" || pollData.status === "canceled") {
      throw new Error("Génération Flux Schnell échouée.");
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  throw new Error("Timeout Flux Schnell (polling). ");
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const debugTrace: DebugEntry[] = [];
  const pushLog = (step: string, data?: unknown) => {
    const entry: DebugEntry = { ts: new Date().toISOString(), step, data };
    debugTrace.push(entry);
    console.log(`[admin-retouch-apply][${requestId}] ${step}`, data === undefined ? "" : JSON.stringify(data));
  };

  try {
    const payload = (await req.json()) as ApplyPayload;
    const {
      id,
      source,
      prompt,
      legal_safety = true,
      anti_franchise = false,
      force_cinematic = false,
      bypass_gemini = false,
    } = payload;
    pushLog("request_received", {
      id,
      source,
      legal_safety,
      anti_franchise,
      force_cinematic,
      bypass_gemini,
      prompt_length: prompt?.length || 0,
    });

    if (!id || !source || !prompt) {
      return new Response(JSON.stringify({ error: "Paramètres requis: id, source, prompt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isSourceTable(source)) {
      return new Response(JSON.stringify({ error: "Source invalide (sas/evenements/antichambre)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !REPLICATE_API_TOKEN) {
      return new Response(JSON.stringify({ error: "Secrets manquants côté serveur (Supabase/Replicate)." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const promptReceivedFromFrontend = String(prompt).trim();
    pushLog("prompt_received_from_frontend", { prompt: promptReceivedFromFrontend });

    const forbiddenTerms = anti_franchise ? extractAntiFranchiseTerms(promptReceivedFromFrontend) : [];
    if (anti_franchise) {
      pushLog("anti_franchise_terms_detected", { forbidden_terms: forbiddenTerms });
    }

    let fluxPromptAfterGemini = GEMINI_API_KEY && !bypass_gemini
      ? await callGeminiForFluxPrompt(
        GEMINI_API_KEY,
        promptReceivedFromFrontend,
        legal_safety,
        anti_franchise,
        forbiddenTerms
      )
      : promptReceivedFromFrontend;

    if (anti_franchise) {
      const sanitizedAfterGemini = sanitizeAntiFranchisePrompt(fluxPromptAfterGemini, forbiddenTerms);
      fluxPromptAfterGemini = sanitizedAfterGemini.prompt;
      pushLog("anti_franchise_sanitization_after_gemini", {
        replaced_terms: sanitizedAfterGemini.replacedTerms,
      });
    }
    pushLog("prompt_after_gemini", {
      prompt: fluxPromptAfterGemini,
      gemini_used: Boolean(GEMINI_API_KEY && !bypass_gemini),
      bypass_gemini,
    });

    let finalFluxPrompt = fluxPromptAfterGemini;

    if (force_cinematic) {
      finalFluxPrompt = `${finalFluxPrompt}. Hard constraint: cinematic live-action photoreal frame, not illustration, not cartoon, not comic, not sketch, not painting, realistic skin texture, realistic lens depth, film still realism.`;
    }

    if (anti_franchise) {
      const sanitizedFinal = sanitizeAntiFranchisePrompt(finalFluxPrompt, forbiddenTerms);
      finalFluxPrompt = sanitizedFinal.prompt;
      pushLog("anti_franchise_sanitization_final", {
        replaced_terms: sanitizedFinal.replacedTerms,
      });
      finalFluxPrompt = `${finalFluxPrompt}. Hard constraint: no franchise names, no brand names, no logos, no wordmarks, no copyrighted product title text.`;
    }

    pushLog("prompt_final_sent_to_replicate", { prompt: finalFluxPrompt });

    const { imageUrl, predictionId, pollTrace } = await generateWithFluxSchnell(REPLICATE_API_TOKEN, finalFluxPrompt);
    pushLog("replicate_prediction_completed", { prediction_id: predictionId, poll_trace: pollTrace, image_url: imageUrl });

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error(`Impossible de récupérer l'image générée (status ${imageRes.status})`);
    const imageBuffer = await imageRes.arrayBuffer();

    const fileName = `retouch_${source}_${id}_${Date.now()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from("evenements-image")
      .upload(fileName, imageBuffer, { contentType: "image/webp" });

    if (uploadError) throw new Error(`Upload storage échoué: ${uploadError.message}`);

    const {
      data: { publicUrl },
    } = supabase.storage.from("evenements-image").getPublicUrl(fileName);
    pushLog("storage_upload_done", { file_name: fileName, public_url: publicUrl });

    const { error: updateError } = await supabase
      .from(source)
      .update({ illustration_url: publicUrl })
      .eq("id", id);

    if (updateError) throw new Error(`Update table échoué: ${updateError.message}`);
    pushLog("table_update_done", { source, id, illustration_url: publicUrl });

    return new Response(JSON.stringify({
      request_id: requestId,
      publicUrl,
      source,
      id,
      force_cinematic,
      prompt_received_from_frontend: promptReceivedFromFrontend,
      flux_prompt_after_gemini: fluxPromptAfterGemini,
      flux_prompt_sent_to_replicate: finalFluxPrompt,
      flux_prompt: finalFluxPrompt,
      replicate_prediction_id: predictionId,
      replicate_poll_trace: pollTrace,
      debug_trace: debugTrace,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    pushLog("request_failed", { error: err?.message || "Erreur inconnue" });
    console.error(`[admin-retouch-apply][${requestId}] failed`, err);
    return new Response(JSON.stringify({
      request_id: requestId,
      error: err.message || "Erreur inconnue",
      debug_trace: debugTrace,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
