/**
 * Types for social media sharing functionality
 */

/**
 * Supported social media platforms
 */
export type SharePlatform =
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'whatsapp'
  | 'generic';

/**
 * Game modes for Timalaus
 */
export type GameMode = 'classique' | 'precision';

/**
 * Data structure for sharing score information
 */
export interface ShareData {
  /** Player's score or streak */
  score: number;

  /** Game mode played */
  mode: GameMode;

  /** Current streak (for Mode Classique) */
  streak?: number;

  /** Timestamp of the score */
  timestamp: Date;

  /** Additional user statistics */
  userStats?: {
    totalGames: number;
    bestScore: number;
    averageScore: number;
  };

  /** Best streak achieved (optional) */
  bestStreak?: number;
}

/**
 * Result of a share operation
 */
export interface ShareResult {
  /** Whether the share was successful */
  success: boolean;

  /** Platform that was used for sharing */
  platform: SharePlatform;

  /** Error message if share failed */
  error?: string;

  /** Error code for debugging */
  errorCode?: string;

  /** Whether user cancelled the share */
  cancelled?: boolean;

  /** Share ID returned by the platform (if available) */
  shareId?: string;

  /** Timestamp of the share attempt */
  timestamp: Date;
}

/**
 * Configuration for a social media platform
 */
export interface PlatformConfig {
  /** Unique identifier for the platform */
  id: SharePlatform;

  /** Display name for the platform */
  name: string;

  /** Icon name or component */
  icon: string;

  /** Brand color for the platform */
  color: string;

  /** Whether the platform is currently enabled */
  enabled: boolean;

  /** Whether the platform requires the app to be installed */
  requiresApp?: boolean;

  /** URL scheme for deep linking */
  urlScheme?: string;
}

/**
 * Options for generating a score image
 */
export interface ScoreImageOptions {
  /** Width of the generated image in pixels */
  width?: number;

  /** Height of the generated image in pixels */
  height?: number;

  /** Format of the image (png, jpg) */
  format?: 'png' | 'jpg';

  /** Quality of the image (0-100) */
  quality?: number;

  /** Whether to use dark mode styling */
  darkMode?: boolean;
}

/**
 * Analytics event data for tracking shares
 */
export interface ShareAnalyticsEvent {
  /** Type of share event */
  eventType: 'share_initiated' | 'share_completed' | 'share_failed' | 'share_cancelled';

  /** Platform used */
  platform: SharePlatform;

  /** Game mode */
  mode: GameMode;

  /** Score value */
  score: number;

  /** Error details (if applicable) */
  error?: string;

  /** Timestamp of the event */
  timestamp: Date;
}
