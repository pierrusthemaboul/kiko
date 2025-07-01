// ==============================================================================
// MISE À JOUR DES APPELS API DANS vuevalid.tsx
// ==============================================================================

// Si vous choisissez l'approche FICHIER UNIQUE, remplacez ces fonctions 
// dans le composant RegenerationButton de vuevalid.tsx :

// ==============================================================================
// APPELS API MODIFIÉS POUR L'APPROCHE UNIFIÉE
// ==============================================================================

// Analyser l'image actuelle avec GPT-4o-mini
const analyzeCurrentImage = async (imageUrl: string, titre: string, year: number) => {
  try {
    const response = await fetch('/api/validation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'analyze',
        imageUrl, 
        titre, 
        year 
      })
    });

    if (!response.ok) throw new Error('Erreur analyse image');
    return await response.json();
  } catch (error) {
    console.error('Erreur analyse image:', error);
    throw new Error('Impossible d\'analyser l\'image actuelle');
  }
};

// Générer un nouveau prompt avec GPT-4o
const generateImprovedPrompt = async (titre: string, year: number, currentProblems: string[]) => {
  try {
    const response = await fetch('/api/validation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'generatePrompt',
        titre, 
        year, 
        currentProblems 
      })
    });

    if (!response.ok) throw new Error('Erreur génération prompt');
    const data = await response.json();
    return data.prompt;
  } catch (error) {
    console.error('Erreur génération prompt:', error);
    throw new Error('Impossible de générer un nouveau prompt');
  }
};

// Générer nouvelle image avec Flux-schnell
const generateNewImage = async (prompt: string) => {
  try {
    const response = await fetch('/api/validation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'generateImage',
        prompt,
        model: 'flux-schnell',
        num_inference_steps: 8,
        output_quality: 90
      })
    });

    if (!response.ok) throw new Error('Erreur génération image');
    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Erreur Flux:', error);
    throw new Error('Impossible de générer la nouvelle image');
  }
};

// Valider la nouvelle image
const validateNewImage = async (imageUrl: string, titre: string, year: number) => {
  try {
    const response = await fetch('/api/validation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'validate',
        imageUrl, 
        titre, 
        year 
      })
    });

    if (!response.ok) throw new Error('Erreur validation');
    return await response.json();
  } catch (error) {
    console.error('Erreur validation:', error);
    throw new Error('Impossible de valider la nouvelle image');
  }
};

// ==============================================================================
// VERSION ENCORE PLUS SIMPLE : RÉGÉNÉRATION EN UN SEUL APPEL
// ==============================================================================

// Alternative : Utiliser l'action 'regenerate' qui fait tout en une fois
const regenerateImageOneCall = async (imageUrl: string, titre: string, year: number) => {
  try {
    const response = await fetch('/api/validation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'regenerate',
        imageUrl,
        titre,
        year,
        model: 'flux-schnell',
        num_inference_steps: 8,
        output_quality: 90
      })
    });

    if (!response.ok) throw new Error('Erreur régénération');
    const result = await response.json();
    
    return {
      success: true,
      newImageUrl: result.newImageUrl,
      improvedPrompt: result.improvedPrompt,
      validation: result.validation,
      analysis: result.analysis
    };
  } catch (error) {
    console.error('Erreur régénération:', error);
    throw new Error('Impossible de régénérer l\'image');
  }
};

// ==============================================================================
// FONCTION DE RÉGÉNÉRATION SIMPLIFIÉE (REMPLACE LA VERSION COMPLEXE)
// ==============================================================================

// Dans le composant RegenerationButton, remplacer la fonction regenerateImage par :
const regenerateImage = async () => {
  setState(prev => ({ ...prev, isRegenerating: true, error: null, progress: 0 }));

  try {
    setState(prev => ({ ...prev, currentStep: 'Régénération complète en cours...', progress: 50 }));
    
    // Un seul appel API qui fait tout !
    const result = await regenerateImageOneCall(currentImageUrl, titre, year);
    
    setState(prev => ({ ...prev, currentStep: 'Sauvegarde...', progress: 90 }));
    
    // Sauvegarder en base
    const { error } = await supabase
      .from('goju')
      .update({
        illustration_url: result.newImageUrl,
        prompt_flux: result.improvedPrompt,
        validation_status: result.validation.overallValid ? 'validated' : 'needs_image_change',
        validation_notes: `Régénérée: ${result.validation.feedback}`,
        validated_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (error) throw error;

    setState(prev => ({ ...prev, currentStep: 'Terminé !', progress: 100 }));
    
    setLastResult(result);
    onImageUpdated(result.newImageUrl);

    return result;

  } catch (error) {
    setState(prev => ({ 
      ...prev, 
      error: error.message, 
      isRegenerating: false 
    }));
    return { success: false, error: error.message };
  } finally {
    setTimeout(() => {
      setState(prev => ({ ...prev, isRegenerating: false, progress: 0, currentStep: '' }));
    }, 2000);
  }
};

// ==============================================================================
// STRUCTURE DE DOSSIERS SELON L'APPROCHE CHOISIE
// ==============================================================================

/*
APPROCHE 1 - FICHIERS SÉPARÉS (recommandée Next.js):
app/
├── api/
│   ├── analyze-image/
│   │   └── route.ts
│   ├── generate-prompt/
│   │   └── route.ts
│   ├── generate-image/
│   │   └── route.ts
│   └── validate-image/
│       └── route.ts
└── (tabs)/
    └── vuevalid.tsx

APPROCHE 2 - FICHIER UNIQUE (plus simple):
app/
├── api/
│   └── validation/
│       └── route.ts
└── (tabs)/
    └── vuevalid.tsx
*/

// ==============================================================================
// AVANTAGES DE CHAQUE APPROCHE
// ==============================================================================

/*
📁 FICHIERS SÉPARÉS:
✅ Séparation des responsabilités
✅ Plus facile à débugger
✅ Approche Next.js standard
✅ Cacheable séparément
❌ Plus de fichiers à gérer

🔗 FICHIER UNIQUE:
✅ Un seul fichier à déployer
✅ Fonctions partagées
✅ Action 'regenerate' tout-en-un
✅ Documentation intégrée (GET endpoint)
❌ Fichier plus gros
❌ Moins modulaire

RECOMMANDATION: Fichier unique pour simplifier !
*/