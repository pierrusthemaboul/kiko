import fs from 'fs';
import path from 'path';
import { UMAP } from 'umap-js';
import { PCA } from 'ml-pca';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function computeCoords() {
  const dataPath = path.join(__dirname, '..', '..', 'data_for_viz.json');
  
  console.log("📖 Lecture de data_for_viz.json...");
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  console.log("🧪 Préparation des vecteurs (Parsing des strings en arrays)...");
  const embeddings = data.map(item => {
    if (typeof item.vector === 'string') {
      return JSON.parse(item.vector);
    }
    return item.vector;
  });

  console.log(`🧠 Étape 1 : Réduction PCA (1536D -> 50D) pour ${data.length} vecteurs...`);
  const startTimePca = Date.now();
  
  const pca = new PCA(embeddings);
  const reducedEmbeddings = pca.predict(embeddings, { nComponents: 50 }).to2DArray();
  
  console.log(`✅ PCA terminée en ${((Date.now() - startTimePca) / 1000).toFixed(2)}s.`);

  console.log("🧠 Étape 2 : Réduction UMAP (50D -> 3D)...");
  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: 15,
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
