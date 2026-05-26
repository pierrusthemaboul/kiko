/**
 * gameplay_capture_service.mjs — Service de capture et montage gameplay
 * 
 * Capture le gameplay mobile via scrcpy, monte la vidéo avec FFmpeg,
 * et génère du contenu social media optimisé.
 */

import { spawn, exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'gameplay_captures');

// Assurer que le dossier de sortie existe
await fs.mkdir(OUTPUT_DIR, { recursive: true });

/**
 * Vérifie si un appareil Android est connecté via ADB
 */
async function checkDeviceConnected() {
  return new Promise((resolve) => {
    const adbPath = 'C:\\Users\\pierr\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe\\scrcpy-win64-v4.0\\adb.exe';
    const adb = spawn(adbPath, ['devices']);
    let output = '';

    adb.stdout.on('data', (data) => {
      output += data.toString();
    });

    adb.on('close', (code) => {
      const lines = output.split('\n').filter(line => line.trim());
      // Ignorer la ligne d'en-tête "List of devices attached"
      const devices = lines.slice(1).filter(line => line.includes('\tdevice'));
      resolve(devices.length > 0);
    });

    adb.on('error', () => resolve(false));
  });
}

/**
 * Capture l'écran du mobile via adb screenrecord
 * @param {number} duration - Durée de capture en secondes
 * @param {string} outputPath - Chemin de sortie de la vidéo
 */
async function captureScreen(duration, outputPath) {
  const adbPath = 'C:\\Users\\pierr\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe\\scrcpy-win64-v4.0\\adb.exe';
  const command = `"${adbPath}" shell screenrecord --time-limit ${duration} /sdcard/temp_gameplay.mp4`;

  console.log('Exécution adb screenrecord:', command);
  try {
    const { stdout, stderr } = await execAsync(command, {
      windowsHide: true,
      timeout: (duration + 10) * 1000
    });
    console.log('adb screenrecord stdout:', stdout);
    if (stderr) console.log('adb screenrecord stderr:', stderr);

    // Copier le fichier depuis l'appareil vers le PC
    const pullCommand = `"${adbPath}" pull /sdcard/temp_gameplay.mp4 "${outputPath}"`;
    console.log('Copie du fichier:', pullCommand);
    await execAsync(pullCommand);

    // Nettoyer le fichier sur l'appareil
    await execAsync(`"${adbPath}" shell rm /sdcard/temp_gameplay.mp4`);

    return outputPath;
  } catch (error) {
    console.error('Erreur adb screenrecord:', error);
    throw new Error(`adb screenrecord failed: ${error.message}`);
  }
}

/**
 * Monte la vidéo avec FFmpeg pour TikTok/Reels
 * @param {string} inputPath - Chemin de la vidéo source
 * @param {string} outputPath - Chemin de sortie
 * @param {Object} options - Options de montage
 */
async function editVideo(inputPath, outputPath, options = {}) {
  const {
    duration = 30, // Durée cible en secondes
    targetPlatform = 'tiktok',
    addText = true,
    addMusic = false
  } = options;

  const ffmpegPath = 'C:\\Users\\pierr\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe';
  const ffmpegArgs = [
    '-i', inputPath,
    '-t', duration.toString(),
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    outputPath
  ];

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, ffmpegArgs);
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    ffmpeg.on('error', reject);
  });
}

/**
 * Pipeline complet: capture + montage
 * @param {Object} options - Options de capture
 * @returns {Promise<Object>} - Résultat avec chemins des fichiers
 */
export async function captureAndEditGameplay(options = {}) {
  const {
    captureDuration = 60, // Durée de capture en secondes
    targetDuration = 30, // Durée cible après montage
    platform = 'tiktok',
    eventId = Date.now()
  } = options;

  // Vérifier si un appareil est connecté
  const deviceConnected = await checkDeviceConnected();
  if (!deviceConnected) {
    throw new Error('Aucun appareil Android connecté via ADB. Connecte ton téléphone et active le débogage USB.');
  }

  // Chemins des fichiers
  const rawVideoPath = path.join(OUTPUT_DIR, `raw_${eventId}.mp4`);
  const editedVideoPath = path.join(OUTPUT_DIR, `${platform}_${eventId}.mp4`);

  try {
    // Étape 1: Capture
    console.log(`📱 Capture en cours (${captureDuration}s)...`);
    await captureScreen(captureDuration, rawVideoPath);
    console.log('✅ Capture terminée');

    // Étape 2: Montage
    console.log(`🎬 Montage en cours (${targetDuration}s cible)...`);
    await editVideo(rawVideoPath, editedVideoPath, {
      duration: targetDuration,
      targetPlatform: platform
    });
    console.log('✅ Montage terminé');

    // Nettoyer le fichier brut
    await fs.unlink(rawVideoPath);

    return {
      success: true,
      videoPath: path.join('gameplay_captures', path.basename(editedVideoPath)),
      platform,
      duration: targetDuration,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Erreur:', error);
    
    // Nettoyer en cas d'erreur
    try {
      if (await fs.access(rawVideoPath).then(() => true).catch(() => false)) {
        await fs.unlink(rawVideoPath);
      }
    } catch (e) {
      // Ignorer les erreurs de nettoyage
    }

    throw error;
  }
}

/**
 * Vérifie si les outils nécessaires sont installés
 */
export async function checkToolsInstalled() {
  const tools = {
    adb: false,
    scrcpy: false,
    ffmpeg: false
  };

  // Chemins potentiels pour les outils
  const adbPaths = [
    'adb',
    'C:\\Users\\pierr\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
    'C:\\Users\\Pierre\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe'
  ];
  
  const scrcpyPaths = [
    'scrcpy',
    'C:\\Users\\pierr\\AppData\\Local\\Programs\\scrcpy\\scrcpy.exe',
    'C:\\Users\\Pierre\\AppData\\Local\\Programs\\scrcpy\\scrcpy.exe'
  ];
  
  const ffmpegPaths = [
    'ffmpeg',
    'C:\\Users\\pierr\\AppData\\Local\\Programs\\FFmpeg\\bin\\ffmpeg.exe',
    'C:\\Users\\Pierre\\AppData\\Local\\Programs\\FFmpeg\\bin\\ffmpeg.exe'
  ];

  try {
    await new Promise((resolve, reject) => {
      const adb = spawn(adbPaths[0], ['version'], { shell: true });
      adb.on('close', (code) => code === 0 ? resolve(true) : reject());
      adb.on('error', reject);
    });
    tools.adb = true;
  } catch (e) {
    tools.adb = false;
  }

  try {
    await new Promise((resolve, reject) => {
      const scrcpy = spawn(scrcpyPaths[0], ['--version'], { shell: true });
      scrcpy.on('close', (code) => code === 0 ? resolve(true) : reject());
      scrcpy.on('error', reject);
    });
    tools.scrcpy = true;
  } catch (e) {
    tools.scrcpy = false;
  }

  try {
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPaths[0], ['-version'], { shell: true });
      ffmpeg.on('close', (code) => code === 0 ? resolve(true) : reject());
      ffmpeg.on('error', reject);
    });
    tools.ffmpeg = true;
  } catch (e) {
    tools.ffmpeg = false;
  }

  return tools;
}
