import fs from 'fs';
import path from 'path';
import { UMAP } from 'umap-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testUmap() {
  const dataPath = path.join(__dirname, '..', '..', 'data_for_viz.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8')).slice(0, 100);
  const embeddings = data.map(item => item.vector);

  const umap = new UMAP({ nComponents: 3 });
  console.log("Testing UMAP with 100 points...");
  const fitting = umap.fit(embeddings);
  console.log("Success! First result:", fitting[0]);
}

testUmap();
