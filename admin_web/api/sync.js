
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = 'pierrusthemaboul';
  const REPO_NAME = 'kiko';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Le token GitHub (GITHUB_TOKEN) n\'est pas configuré dans les variables d\'environnement.' });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Timalaus-Admin'
      },
      body: JSON.stringify({
        event_type: 'sync_3d_data'
      })
    });

    if (response.ok || response.status === 204) {
      return res.status(200).json({ message: 'Synchronisation lancée avec succès !' });
    } else {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || 'Erreur lors de l\'appel à GitHub API' });
    }
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur' });
  }
}
