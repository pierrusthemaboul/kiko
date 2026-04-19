#!/usr/bin/env node

import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Charger les variables d'environnement depuis les deux fichiers .env
config({ path: '.env' });
config({ path: 'credentials/.env' });

console.log('=== AUDIT DES CAPACITÉS ET QUOTAS API ===\n');

// Clés API détectées
const apiKeys = {
  gemini: process.env.GEMINI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  perplexity: process.env.PERPLEXITY_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  mistral: process.env.MISTRAL_API_KEY,
  replicate: process.env.REPLICATE_API_TOKEN
};

console.log('Clés API détectées:');
Object.entries(apiKeys).forEach(([provider, key]) => {
  const status = key ? 'OK' : 'MANQUANTE';
  const keyPreview = key ? `${key.substring(0, 10)}...` : 'N/A';
  console.log(`- ${provider.toUpperCase()}: ${status} (${keyPreview})`);
});

console.log('\n=== TEST DES ENDPOINTS MODELS ===\n');

// Fonction utilitaire pour faire des requêtes HTTP
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Test Google Gemini API
async function testGeminiAPI() {
  console.log('--- GEMINI API ---');
  if (!apiKeys.gemini) {
    console.log('Clé API manquante');
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKeys.gemini}`,
      {
        headers: {
          'User-Agent': 'Kiko-API-Audit/1.0'
        }
      }
    );

    const rateLimits = {
      'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
      'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
      'x-ratelimit-reset': response.headers.get('x-ratelimit-reset')
    };

    if (response.ok) {
      const data = await response.json();
      const models = data.models || [];
      
      console.log(`Status: ${response.status}`);
      console.log(`Modèles disponibles: ${models.length}`);
      
      // Afficher les modèles pertinents
      const relevantModels = models.filter(model => 
        model.name.includes('gemini') && 
        (model.name.includes('flash') || model.name.includes('pro') || model.name.includes('ultra'))
      );
      
      relevantModels.forEach(model => {
        console.log(`  - ${model.name.split('/').pop()}: ${model.displayName || 'N/A'} (${model.description?.substring(0, 50) || ''}...)`);
      });

      console.log('Rate Limits headers:', rateLimits);
      return { provider: 'gemini', models: relevantModels, rateLimits, status: 'success' };
    } else {
      const error = await response.text();
      console.log(`Erreur: ${response.status} - ${error}`);
      return { provider: 'gemini', error: error, status: 'error' };
    }
  } catch (error) {
    console.log(`Erreur de connexion: ${error.message}`);
    return { provider: 'gemini', error: error.message, status: 'error' };
  }
}

// Test OpenAI API
async function testOpenAIAPI() {
  console.log('\n--- OPENAI API ---');
  if (!apiKeys.openai) {
    console.log('Clé API manquante');
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      'https://api.openai.com/v1/models',
      {
        headers: {
          'Authorization': `Bearer ${apiKeys.openai}`,
          'User-Agent': 'Kiko-API-Audit/1.0'
        }
      }
    );

    const rateLimits = {
      'x-ratelimit-limit-requests': response.headers.get('x-ratelimit-limit-requests'),
      'x-ratelimit-remaining-requests': response.headers.get('x-ratelimit-remaining-requests'),
      'x-ratelimit-limit-tokens': response.headers.get('x-ratelimit-limit-tokens'),
      'x-ratelimit-remaining-tokens': response.headers.get('x-ratelimit-remaining-tokens'),
      'x-ratelimit-reset-requests': response.headers.get('x-ratelimit-reset-requests'),
      'x-ratelimit-reset-tokens': response.headers.get('x-ratelimit-reset-tokens')
    };

    if (response.ok) {
      const data = await response.json();
      const models = data.data || [];
      
      console.log(`Status: ${response.status}`);
      console.log(`Modèles disponibles: ${models.length}`);
      
      // Afficher les modèles GPT pertinents
      const relevantModels = models.filter(model => 
        model.id.includes('gpt') && 
        (model.id.includes('gpt-4') || model.id.includes('gpt-3.5') || model.id.includes('o1'))
      );
      
      relevantModels.forEach(model => {
        console.log(`  - ${model.id}: ${model.owned_by || 'OpenAI'}`);
      });

      console.log('Rate Limits headers:', rateLimits);
      return { provider: 'openai', models: relevantModels, rateLimits, status: 'success' };
    } else {
      const error = await response.text();
      console.log(`Erreur: ${response.status} - ${error}`);
      return { provider: 'openai', error: error, status: 'error' };
    }
  } catch (error) {
    console.log(`Erreur de connexion: ${error.message}`);
    return { provider: 'openai', error: error.message, status: 'error' };
  }
}

// Test Perplexity API
async function testPerplexityAPI() {
  console.log('\n--- PERPLEXITY API ---');
  if (!apiKeys.perplexity) {
    console.log('Clé API manquante');
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      'https://api.perplexity.ai/models',
      {
        headers: {
          'Authorization': `Bearer ${apiKeys.perplexity}`,
          'User-Agent': 'Kiko-API-Audit/1.0'
        }
      }
    );

    const rateLimits = {
      'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
      'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
      'x-ratelimit-reset': response.headers.get('x-ratelimit-reset')
    };

    if (response.ok) {
      const data = await response.json();
      const models = data.data || [];
      
      console.log(`Status: ${response.status}`);
      console.log(`Modèles disponibles: ${models.length}`);
      
      models.forEach(model => {
        console.log(`  - ${model.id}: ${model.name || 'N/A'} (Context: ${model.context_length || 'N/A'})`);
      });

      console.log('Rate Limits headers:', rateLimits);
      return { provider: 'perplexity', models, rateLimits, status: 'success' };
    } else {
      const error = await response.text();
      console.log(`Erreur: ${response.status} - ${error}`);
      return { provider: 'perplexity', error: error, status: 'error' };
    }
  } catch (error) {
    console.log(`Erreur de connexion: ${error.message}`);
    return { provider: 'perplexity', error: error.message, status: 'error' };
  }
}

// Test Anthropic Claude API
async function testAnthropicAPI() {
  console.log('\n--- ANTHROPIC CLAUDE API ---');
  if (!apiKeys.anthropic) {
    console.log('Clé API manquante');
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      'https://api.anthropic.com/v1/models',
      {
        headers: {
          'x-api-key': apiKeys.anthropic,
          'anthropic-version': '2023-06-01',
          'User-Agent': 'Kiko-API-Audit/1.0'
        }
      }
    );

    const rateLimits = {
      'anthropic-ratelimit-requests-limit': response.headers.get('anthropic-ratelimit-requests-limit'),
      'anthropic-ratelimit-requests-remaining': response.headers.get('anthropic-ratelimit-requests-remaining'),
      'anthropic-ratelimit-tokens-limit': response.headers.get('anthropic-ratelimit-tokens-limit'),
      'anthropic-ratelimit-tokens-remaining': response.headers.get('anthropic-ratelimit-tokens-remaining')
    };

    if (response.ok) {
      const data = await response.json();
      const models = data.data || [];
      
      console.log(`Status: ${response.status}`);
      console.log(`Modèles disponibles: ${models.length}`);
      
      models.forEach(model => {
        console.log(`  - ${model.id}: ${model.display_name || 'N/A'}`);
      });

      console.log('Rate Limits headers:', rateLimits);
      return { provider: 'anthropic', models, rateLimits, status: 'success' };
    } else {
      const error = await response.text();
      console.log(`Erreur: ${response.status} - ${error}`);
      return { provider: 'anthropic', error: error, status: 'error' };
    }
  } catch (error) {
    console.log(`Erreur de connexion: ${error.message}`);
    return { provider: 'anthropic', error: error.message, status: 'error' };
  }
}

// Test Mistral API
async function testMistralAPI() {
  console.log('\n--- MISTRAL API ---');
  if (!apiKeys.mistral) {
    console.log('Clé API manquante');
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      'https://api.mistral.ai/v1/models',
      {
        headers: {
          'Authorization': `Bearer ${apiKeys.mistral}`,
          'User-Agent': 'Kiko-API-Audit/1.0'
        }
      }
    );

    const rateLimits = {
      'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
      'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
      'x-ratelimit-reset': response.headers.get('x-ratelimit-reset')
    };

    if (response.ok) {
      const data = await response.json();
      const models = data.data || [];
      
      console.log(`Status: ${response.status}`);
      console.log(`Modèles disponibles: ${models.length}`);
      
      models.forEach(model => {
        console.log(`  - ${model.id}: ${model.object || 'model'}`);
      });

      console.log('Rate Limits headers:', rateLimits);
      return { provider: 'mistral', models, rateLimits, status: 'success' };
    } else {
      const error = await response.text();
      console.log(`Erreur: ${response.status} - ${error}`);
      return { provider: 'mistral', error: error, status: 'error' };
    }
  } catch (error) {
    console.log(`Erreur de connexion: ${error.message}`);
    return { provider: 'mistral', error: error.message, status: 'error' };
  }
}

// Fonction principale
async function main() {
  const results = [];

  // Tester tous les APIs
  const tests = [
    testGeminiAPI(),
    testOpenAIAPI(),
    testPerplexityAPI(),
    testAnthropicAPI(),
    testMistralAPI()
  ];

  const testResults = await Promise.allSettled(tests);
  
  testResults.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      results.push(result.value);
    } else {
      const providers = ['gemini', 'openai', 'perplexity', 'anthropic', 'mistral'];
      results.push({
        provider: providers[index],
        error: result.reason?.message || 'Test failed',
        status: 'error'
      });
    }
  });

  // Générer le rapport final
  console.log('\n=== RAPPORT SYNTHÈSE ===\n');
  
  console.log('Résumé des capacités:');
  results.forEach(result => {
    const status = result.status === 'success' ? 'OK' : 'ERREUR';
    const modelCount = result.models ? result.models.length : 0;
    console.log(`- ${result.provider.toUpperCase()}: ${status} (${modelCount} modèles)`);
  });

  console.log('\n=== RECOMMANDATIONS POUR 2700 ÉVÉNEMENTS ===\n');
  
  // Analyser les résultats et donner des recommandations
  const successfulProviders = results.filter(r => r.status === 'success');
  
  if (successfulProviders.length === 0) {
    console.log('Aucun provider n\'est accessible. Vérifiez vos clés API.');
    return;
  }

  console.log('Analyse des providers disponibles:');
  
  successfulProviders.forEach(provider => {
    let recommendation = '';
    let robustness = '';
    
    switch (provider.provider) {
      case 'gemini':
        recommendation = 'gemini-2.0-flash (rapide) ou gemini-2.5-flash (plus intelligent)';
        robustness = 'Excellent - Google offre des quotas généreux et bonne stabilité';
        break;
      case 'openai':
        recommendation = 'gpt-4o-mini (économie) ou gpt-4o (qualité)';
        robustness = 'Bon - Mais quotas plus stricts, risque 429 élevé';
        break;
      case 'perplexity':
        recommendation = 'sonar ou sonar-pro';
        robustness = 'Moyen - Spécialisé recherche, quotas modérés';
        break;
      case 'anthropic':
        recommendation = 'claude-3-5-haiku (rapide) ou claude-3-5-sonnet (qualité)';
        robustness = 'Excellent - Très fiable, bons quotas';
        break;
      case 'mistral':
        recommendation = 'mistral-tiny ou mistral-small';
        robustness = 'Bon - Provider européen, quotas raisonnables';
        break;
    }
    
    console.log(`\n${provider.provider.toUpperCase()}:`);
    console.log(`  Modèle recommandé: ${recommendation}`);
    console.log(`  Robustesse: ${robustness}`);
    
    if (provider.rateLimits && Object.values(provider.rateLimits).some(v => v)) {
      console.log(`  Rate limits détectés: ${JSON.stringify(provider.rateLimits)}`);
    }
  });

  console.log('\n=== RECOMMANDATION FINALE ===\n');
  
  const geminiResult = successfulProviders.find(r => r.provider === 'gemini');
  const anthropicResult = successfulProviders.find(r => r.provider === 'anthropic');
  const openaiResult = successfulProviders.find(r => r.provider === 'openai');
  
  if (geminiResult) {
    console.log('RECOMMANDÉ: Google Gemini');
    console.log('Modèle: gemini-2.0-flash pour le traitement en lot');
    console.log('Raisons:');
    console.log('- Très bon ratio intelligence/quota');
    console.log('- Faible probabilité d\'erreurs 429');
    console.log('- Traitement rapide adapté pour 2700 événements');
    console.log('- Coût par requête très compétitif');
  } else if (anthropicResult) {
    console.log('RECOMMANDÉ: Anthropic Claude');
    console.log('Modèle: claude-3-5-haiku pour le traitement en lot');
    console.log('Raisons:');
    console.log('- Excellente fiabilité');
    console.log('- Bonnes capacités d\'analyse');
    console.log('- Quotas généreux');
  } else if (openaiResult) {
    console.log('RECOMMANDÉ: OpenAI (avec précautions)');
    console.log('Modèle: gpt-4o-mini');
    console.log('ATTENTION: Implémentez des délais et retry pour éviter les 429');
    console.log('- Considérer diviser en lots plus petits');
    console.log('- Surveiller les rate limits');
  } else {
    console.log('Utilisez le premier provider fonctionnel avec des précautions anti-429');
  }

  console.log('\n=== STRATÉGIES ANTI-429 ===\n');
  console.log('1. Implémenter des délais entre les requêtes (100-500ms)');
  console.log('2. Utiliser exponential backoff pour les retries');
  console.log('3. Diviser le traitement en lots de 100-200 événements');
  console.log('4. Paralléliser avec un maximum de 3-5 requêtes simultanées');
  console.log('5. Sauvegarder la progression pour reprise en cas d\'erreur');
}

// Exécuter le script
main().catch(console.error);
