#!/usr/bin/env node

/**
 * Script de récupération des statistiques TikTok
 * Récupère les abonnés, likes, vidéos et vues du compte @timalaus0
 */

import { readFileSync } from 'fs';
import fetch from 'node-fetch';

// Chargement des tokens
const tokens = JSON.parse(readFileSync('tiktok-tokens.json', 'utf-8'));

const {
  access_token,
  expires_at
} = tokens;

// Vérification de l'expiration du token
if (Date.now() > expires_at) {
  console.error('Erreur: Le token d\'accès a expiré');
  console.log('Veuillez utiliser le script de refresh ou relancer le flux OAuth2');
  process.exit(1);
}

console.log('=== RÉCUPÉRATION DES STATISTIQUES TIKTOK ===\n');
console.log(`Token d\'accès: ${access_token.substring(0, 20)}...`);
console.log(`Expire le: ${new Date(expires_at).toLocaleString('fr-FR')}\n`);

// Configuration de l'API TikTok
const API_BASE_URL = 'https://open.tiktokapis.com/v2';

/**
 * Récupère les informations de base de l'utilisateur
 */
async function getUserInfo() {
  console.log('Récupération des informations utilisateur...');
  
  const response = await fetch(`${API_BASE_URL}/user/info/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: ['display_name', 'avatar_url', 'bio_description', 'is_verified', 'profile_deep_link']
    })
  });

  const data = await response.json();
  
  if (data.error) {
    console.error('Erreur lors de la récupération des infos utilisateur:', data.error_description);
    return null;
  }

  return data.data.user;
}

/**
 * Récupère les statistiques de l'utilisateur
 */
async function getUserStats() {
  console.log('Récupération des statistiques...');
  
  const response = await fetch(`${API_BASE_URL}/user/stats/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  
  if (data.error) {
    console.error('Erreur lors de la récupération des stats:', data.error_description);
    return null;
  }

  return data.data;
}

/**
 * Récupère la liste des vidéos de l'utilisateur
 */
async function getUserVideos(maxCount = 10) {
  console.log(`Récupération des ${maxCount} dernières vidéos...`);
  
  const response = await fetch(`${API_BASE_URL}/video/list/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      max_count: maxCount,
      fields: ['id', 'title', 'video_description', 'create_time', 'cover_image_url', 'share_url', 'statistics']
    })
  });

  const data = await response.json();
  
  if (data.error) {
    console.error('Erreur lors de la récupération des vidéos:', data.error_description);
    return null;
  }

  return data.data.videos;
}

/**
 * Fonction principale
 */
async function main() {
  try {
    // Récupération des infos utilisateur
    const userInfo = await getUserInfo();
    if (userInfo) {
      console.log('\n=== INFORMATIONS UTILISATEUR ===');
      console.log(`Display Name: ${userInfo.display_name}`);
      console.log(`Avatar: ${userInfo.avatar_url}`);
      console.log(`Bio: ${userInfo.bio_description || 'N/A'}`);
      console.log(`Vérifié: ${userInfo.is_verified ? 'Oui' : 'Non'}`);
      console.log(`Profil: ${userInfo.profile_deep_link}`);
    }

    // Récupération des statistiques
    const stats = await getUserStats();
    if (stats) {
      console.log('\n=== STATISTIQUES GLOBALES ===');
      console.log(`Abonnés: ${stats.follower_count.toLocaleString('fr-FR')}`);
      console.log(`Abonnements: ${stats.following_count.toLocaleString('fr-FR')}`);
      console.log(`Likes: ${stats.likes_count.toLocaleString('fr-FR')}`);
      console.log(`Vidéos: ${stats.video_count.toLocaleString('fr-FR')}`);
    }

    // Récupération des vidéos
    const videos = await getUserVideos(5);
    if (videos && videos.length > 0) {
      console.log('\n=== DERNIÈRES VIDÉOS ===');
      videos.forEach((video, index) => {
        console.log(`\n${index + 1}. ${video.title || 'Sans titre'}`);
        console.log(`   ID: ${video.id}`);
        console.log(`   Créée le: ${new Date(video.create_time * 1000).toLocaleString('fr-FR')}`);
        console.log(`   Vues: ${video.statistics?.view_count?.toLocaleString('fr-FR') || 'N/A'}`);
        console.log(`   Likes: ${video.statistics?.like_count?.toLocaleString('fr-FR') || 'N/A'}`);
        console.log(`   Commentaires: ${video.statistics?.comment_count?.toLocaleString('fr-FR') || 'N/A'}`);
        console.log(`   Partages: ${video.statistics?.share_count?.toLocaleString('fr-FR') || 'N/A'}`);
        console.log(`   Lien: ${video.share_url}`);
      });
    }

    // Résumé pour l'application
    console.log('\n=== RÉSUMÉ POUR L\'APPLICATION ===');
    const summary = {
      timestamp: new Date().toISOString(),
      stats: {
        followers: stats?.follower_count || 0,
        following: stats?.following_count || 0,
        likes: stats?.likes_count || 0,
        videos: stats?.video_count || 0
      },
      user: {
        display_name: userInfo?.display_name,
        avatar_url: userInfo?.avatar_url,
        is_verified: userInfo?.is_verified
      }
    };
    
    console.log(JSON.stringify(summary, null, 2));

    // Sauvegarde du résumé
    import { writeFileSync } from 'fs';
    writeFileSync('tiktok-stats.json', JSON.stringify(summary, null, 2));
    console.log('\nStatistiques sauvegardées dans tiktok-stats.json');

  } catch (error) {
    console.error('\nErreur lors de la récupération des statistiques:', error.message);
    process.exit(1);
  }
}

main();
