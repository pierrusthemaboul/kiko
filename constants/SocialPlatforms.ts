import { PlatformConfig } from '../types/sharing';

/**
 * Configuration for all supported social media platforms
 *
 * Brand colors are official brand guidelines:
 * - TikTok: #000000 (Black)
 * - Instagram: #E4405F (Gradient pink/purple, using pink)
 * - Facebook: #1877F2 (Blue)
 * - Twitter/X: #1DA1F2 (Light blue)
 * - WhatsApp: #25D366 (Green)
 * - Generic: App primary color
 */
export const SOCIAL_PLATFORMS: PlatformConfig[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'logo-tiktok', // Ionicons
    color: '#000000',
    enabled: true,
    requiresApp: true,
    urlScheme: 'tiktok://',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'logo-instagram', // Ionicons
    color: '#E4405F',
    enabled: true,
    requiresApp: true,
    urlScheme: 'instagram://',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'logo-facebook', // Ionicons
    color: '#1877F2',
    enabled: true,
    requiresApp: false,
    urlScheme: 'fb://',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: 'logo-twitter', // Ionicons
    color: '#1DA1F2',
    enabled: true,
    requiresApp: false,
    urlScheme: 'twitter://',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'logo-whatsapp', // Ionicons
    color: '#25D366',
    enabled: true,
    requiresApp: true,
    urlScheme: 'whatsapp://',
  },
  {
    id: 'generic',
    name: 'Autres',
    icon: 'share-social', // Ionicons
    color: '#1D5F9F', // App primary color
    enabled: true,
    requiresApp: false,
  },
];

/**
 * Get platform configuration by ID
 */
export function getPlatformConfig(platformId: string): PlatformConfig | undefined {
  return SOCIAL_PLATFORMS.find(p => p.id === platformId);
}

/**
 * Get all enabled platforms
 */
export function getEnabledPlatforms(): PlatformConfig[] {
  return SOCIAL_PLATFORMS.filter(p => p.enabled);
}

/**
 * Share message templates for different modes
 */
export const SHARE_MESSAGES = {
  classique: (streak: number) =>
    `🎯 J'ai atteint un streak de ${streak} sur Timalaus (Mode Classique) ! 🚀\n\nPeux-tu faire mieux ? Télécharge l'app et défie-moi ! 📱`,
  precision: (score: number) =>
    `⚡ J'ai marqué ${score} points sur Timalaus (Mode Précision) ! 🏆\n\nPenses-tu pouvoir me battre ? Télécharge l'app maintenant ! 📱`,
};

/**
 * Get share message for a specific mode
 */
export function getShareMessage(mode: 'classique' | 'precision', value: number): string {
  if (mode === 'classique') {
    return SHARE_MESSAGES.classique(value);
  }
  return SHARE_MESSAGES.precision(value);
}

/**
 * App download links for share messages
 */
export const APP_LINKS = {
  ios: 'https://apps.apple.com/app/timalaus', // Update with actual link
  android: 'https://play.google.com/store/apps/details?id=com.timalaus', // Update with actual link
  web: 'https://timalaus.com', // Update with actual link
};

/**
 * Image dimensions optimized for each platform
 */
export const IMAGE_DIMENSIONS = {
  instagram_story: { width: 1080, height: 1920 }, // 9:16 ratio
  instagram_feed: { width: 1080, height: 1080 }, // 1:1 ratio
  facebook: { width: 1200, height: 630 }, // 1.91:1 ratio
  twitter: { width: 1200, height: 675 }, // 16:9 ratio
  tiktok: { width: 1080, height: 1920 }, // 9:16 ratio
  generic: { width: 1080, height: 1920 }, // 9:16 default
};
