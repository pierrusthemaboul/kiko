import { captureRef } from 'react-native-view-shot';
import { RefObject } from 'react';
import { ShareData, ScoreImageOptions } from '../types/sharing';

/**
 * Generate a shareable image from a score card view
 *
 * This function captures a React Native view reference and converts it to an image
 * that can be shared on social media platforms.
 *
 * @param viewRef - Reference to the React Native view to capture
 * @param scoreData - Score data to include in the image
 * @param options - Optional image generation settings
 * @returns Promise resolving to the image URI (base64 or file path)
 */
export async function generateScoreImage(
  viewRef: RefObject<any>,
  scoreData: ShareData,
  options?: ScoreImageOptions
): Promise<string> {
  const {
    format = 'png',
    quality = 100,
  } = options || {};

  console.log('[SHARE] Generating score image', {
    mode: scoreData.mode,
    score: scoreData.score,
    streak: scoreData.streak,
    format,
    quality,
  });

  try {
    if (!viewRef.current) {
      throw new Error('View reference is null');
    }

    // Capture the view as an image
    const uri = await captureRef(viewRef, {
      format,
      quality: quality / 100,
      result: 'tmpfile', // Save to temp file for better compatibility
    });

    console.log('[SHARE] Image generated successfully', {
      uri,
      format,
    });

    return uri;
  } catch (error) {
    console.error('[SHARE] Failed to generate image', error);
    throw error;
  }
}

/**
 * Get default image dimensions based on the target platform
 */
export function getImageDimensions(platform: string): { width: number; height: number } {
  const dimensions: Record<string, { width: number; height: number }> = {
    instagram: { width: 1080, height: 1920 }, // Stories format
    tiktok: { width: 1080, height: 1920 },
    facebook: { width: 1200, height: 630 },
    twitter: { width: 1200, height: 675 },
    whatsapp: { width: 1080, height: 1920 },
    generic: { width: 1080, height: 1920 },
  };

  return dimensions[platform] || dimensions.generic;
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  if (score >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  return score.toString();
}

/**
 * Get mode display name in French
 */
export function getModeDisplayName(mode: 'classique' | 'precision'): string {
  return mode === 'classique' ? 'Mode Classique' : 'Mode Précision';
}
