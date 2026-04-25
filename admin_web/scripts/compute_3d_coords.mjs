import fs from 'fs';
import path from 'path';
import { UMAP } from 'umap-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function computeCoords() {
  const dataPath = path.join(__dirname, '..', '..', 'data_for_viz.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error("❌ Erreur : data_for_viz.json introuvable. Lance d'abord l'export.");
    return;
  }

  console.log("📖 Lecture de data_for_viz.json...");
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const data = JSON.parse(rawData);

  if (data.length === 0) {
    console.log("⚠️ Aucun événement à traiter.");
    return;
  }

  console.log(`🧠 Préparation de l'algorithme UMAP pour ${data.length} vecteurs...`);
  
  const embeddings = data.map(item => item.vector);

  // Configuration UMAP pour la 3D
  const umap = new UMAP({
    nComponents: 3,
    nNeighbors: 15,
    minDist: 0.1,
    spread: 1.0,
  });

  console.log("⚙️ Calcul de la réduction de dimension...");
  const startTime = Date.now();
  
  // Initialiser UMAP
  umap.initializeFit(embeddings);
  
  const nEpochs = umap.getNEpochs();
  console.log(`⏳ Optimisation sur ${nEpochs} époques...`);
  
  for (let i = 0; i < nEpochs; i++) {
    umap.step();
    if (i % 50 === 0 || i === nEpochs - 1) {
      console.log(`📊 Progrès : ${((i / nEpochs) * 100).toFixed(0)}%...`);
    }
  }
  
  const fitting = umap.getEmbedding();
  
  const endTime = Date.now();
  console.log(`✅ Calcul terminé en ${((endTime - startTime) / 1000).toFixed(2)}s.`);

  // Mettre à jour les données
  const updatedData = data.map((item, index) => {
    const [x, y, z] = fitting[index];
    // On enlève le gros vecteur pour alléger le JSON final de la web app
    const { vector, ...rest } = item;
    return {
      ...rest,
      x: parseFloat(x.toFixed(4)),
      y: parseFloat(y.toFixed(4)),
      z: parseFloat(z.toFixed(4))
    };
  });

  console.log("💾 Sauvegarde du fichier mis à jour...");
  fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2));
  
  console.log(`🎉 Succès ! data_for_viz.json contient maintenant les coordonnées X, Y, Z.`);
}

computeCoords().catch(err => {
  console.error("❌ Erreur fatale :", err.message);
  if (err.message.includes("Cannot find module 'umap-js'")) {
    console.log("💡 Essaie d'installer la lib avec : npm install umap-js");
  }
});
