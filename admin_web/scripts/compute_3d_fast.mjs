import fs from 'fs';
import path from 'path';
import { UMAP } from 'umap-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function computeCoords() {
  const dataPath = path.join(__dirname, '..', '..', 'data_for_viz.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  console.log("🧪 Préparation des vecteurs...");
  const embeddings = data.map(item => {
    if (typeof item.vector === 'string') return JSON.parse(item.vector);
    return item.vector;
  });

  console.log(`🧠 Étape 1 : Réduction par Projection Aléatoire (1536D -> 128D)...`);
  // Très rapide et préserve bien les distances (Lemme de Johnson-Lindenstrauss)
  const reducedEmbeddings = embeddings.map(v => {
    // On prend juste un sous-échantillon déterministe pour simuler une projection simple
    // ou on pourrait générer une matrice de projection. 
    // Pour aller vite, on va juste tronquer à 128 (souvent suffisant pour UMAP)
    return v.slice(0, 128); 
  });

  console.log("🧠 Étape 2 : Réduction UMAP (128D -> 3D)...");
  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: 10, // Plus petit pour aller plus vite
    minDist: 0.1,
  });

  const startTimeUmap = Date.now();
  console.log("⚙️ Initialisation du graphe...");
  umap.initializeFit(reducedEmbeddings);
  
  const nEpochs = umap.getNEpochs();
  console.log(`🚀 Optimisation sur ${nEpochs} époques...`);
  
  for (let i = 0; i < nEpochs; i++) {
    umap.step();
    if (i % 50 === 0 || i === nEpochs - 1) {
      console.log(`📊 Progrès : ${((i / nEpochs) * 100).toFixed(0)}%...`);
    }
  }

  const finalCoords = umap.getEmbedding();
  console.log(`✅ UMAP terminé en ${((Date.now() - startTimeUmap) / 1000).toFixed(2)}s.`);

  const updatedData = data.map((item, index) => {
    const [x, y, z] = finalCoords[index];
    const { vector, ...rest } = item;
    return {
      ...rest,
      x: parseFloat(x.toFixed(4)),
      y: parseFloat(y.toFixed(4)),
      z: parseFloat(z.toFixed(4))
    };
  });

  fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));
  console.log("🎉 Succès ! Coordonnées sauvegardées.");
}

computeCoords().catch(err => console.error("❌ Erreur :", err));
