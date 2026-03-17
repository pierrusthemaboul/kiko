import Share from 'react-native-share';
import { Linking, Platform } from 'react-native';
import { ShareData, ShareResult, SharePlatform } from '../types/sharing';
import { getShareMessage } from '../constants/SocialPlatforms';

/**
 * Share score to a specific social media platform
 *
 * @param platform - Target social media platform
 * @param data - Score data to share
 * @param imageUri - URI of the generated score image
 * @returns Promise resolving to share result
 */
export async function shareTo(
  platform: SharePlatform,
  data: ShareData,
  imageUri: string
): Promise<ShareResult> {
  console.log('[SHARE] Starting share flow', {
    platform,
    mode: data.mode,
    score: data.score,
    streak: data.streak,
  });

  const timestamp = new Date();

  try {
    switch (platform) {
      case 'tiktok':
        return await shareToTikTok(data, imageUri, timestamp);
      case 'instagram':
        return await shareToInstagram(data, imageUri, timestamp);
      case 'facebook':
        return await shareToFacebook(data, imageUri, timestamp);
      case 'twitter':
        return await shareToTwitter(data, imageUri, timestamp);
      case 'whatsapp':
        return await shareToWhatsApp(data, imageUri, timestamp);
      case 'generic':
        return await shareGeneric(data, imageUri, timestamp);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    console.error('[SHARE] Share failed', {
      platform,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      platform,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
    };
  }
}

/**
 * Share to TikTok using TikTok Share Kit
 */
async function shareToTikTok(
  data: ShareData,
  imageUri: string,
  timestamp: Date
): Promise<ShareResult> {
  try {
    // TikTok is not directly supported by react-native-share
    // Use generic share for now
    const message = getShareMessage(
      data.mode,
      data.mode === 'classique' ? data.streak || 0 : data.score
    );

    const shareOptions = {
      title: 'Timalaus - Mon Score',
      message,
      url: imageUri,
      failOnCancel: false,
    };

    const result = await Share.open(shareOptions);

    console.log('[SHARE] Share successful', { platform: 'tiktok' });

    return {
      success: true,
      platform: 'tiktok',
      timestamp,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('User did not share')) {
      console.log('[SHARE] Share cancelled by user', { platform: 'tiktok' });
      return {
        success: false,
        platform: 'tiktok',
        cancelled: true,
        timestamp,
      };
    }

    throw error;
  }
}

/**
 * Share to Instagram Stories
 */
async function shareToInstagram(
  data: ShareData,
  imageUri: string,
  timestamp: Date
): Promise<ShareResult> {
  try {
    const shareOptions = {
      title: 'Timalaus - Mon Score',
      social: Share.Social.INSTAGRAM_STORIES as any,
      url: imageUri,
      failOnCancel: false,
      backgroundImage: imageUri,
      // Instagram Stories specific options
      appId: '123456789', // Replace with actual Facebook App ID if needed
    };

    await Share.shareSingle(shareOptions);

    console.log('[SHARE] Share successful', { platform: 'instagram' });

    return {
      success: true,
      platform: 'instagram',
      timestamp,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('User did not share')) {
      console.log('[SHARE] Share cancelled by user', { platform: 'instagram' });
      return {
        success: false,
        platform: 'instagram',
        cancelled: true,
        timestamp,
      };
    }

    // If Instagram is not installed, try to open app store
    if (error instanceof Error && error.message.includes('not installed')) {
      const appStoreUrl = Platform.select({
        ios: 'https://apps.apple.com/app/instagram/id389801252',
        android: 'https://play.google.com/store/apps/details?id=com.instagram.android',
      });

      if (appStoreUrl) {
        await Linking.openURL(appStoreUrl);
      }

      return {
        success: false,
        platform: 'instagram',
        error: 'Instagram non installé',
        errorCode: 'APP_NOT_INSTALLED',
        timestamp,
      };
    }

    throw error;
  }
}

/**
 * Share to Facebook
 */
async function shareToFacebook(
  data: ShareData,
  imageUri: string,
  timestamp: Date
): Promise<ShareResult> {
  try {
    const message = getShareMessage(
      data.mode,
      data.mode === 'classique' ? data.streak || 0 : data.score
    );

    const shareOptions = {
      title: 'Timalaus - Mon Score',
      message,
      url: imageUri,
      social: Share.Social.FACEBOOK as any,
      failOnCancel: false,
    };

    await Share.shareSingle(shareOptions);

    console.log('[SHARE] Share successful', { platform: 'facebook' });

    return {
      success: true,
      platform: 'facebook',
      timestamp,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('User did not share')) {
      console.log('[SHARE] Share cancelled by user', { platform: 'facebook' });
      return {
        success: false,
        platform: 'facebook',
        cancelled: true,
        timestamp,
      };
    }

    throw error;
  }
}

/**
 * Share to Twitter/X using web intent
 */
async function shareToTwitter(
  data: ShareData,
  imageUri: string,
  timestamp: Date
): Promise<ShareResult> {
  try {
    const message = getShareMessage(
      data.mode,
      data.mode === 'classique' ? data.streak || 0 : data.score
    );

    // Twitter web intent URL
    const tweetText = encodeURIComponent(message);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

    // Try to use native Twitter app first
    const canOpenTwitter = await Linking.canOpenURL('twitter://');

    if (canOpenTwitter) {
      await Linking.openURL(`twitter://post?message=${tweetText}`);
    } else {
      await Linking.openURL(twitterUrl);
    }

    console.log('[SHARE] Share successful', { platform: 'twitter' });

    return {
      success: true,
      platform: 'twitter',
      timestamp,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Share to WhatsApp
 */
async function shareToWhatsApp(
  data: ShareData,
  imageUri: string,
  timestamp: Date
): Promise<ShareResult> {
  try {
    const message = getShareMessage(
      data.mode,
      data.mode === 'classique' ? data.streak || 0 : data.score
    );

    const shareOptions = {
      title: 'Timalaus - Mon Score',
      message,
      url: imageUri,
      social: Share.Social.WHATSAPP as any,
      failOnCancel: false,
    };

    await Share.shareSingle(shareOptions);

    console.log('[SHARE] Share successful', { platform: 'whatsapp' });

    return {
      success: true,
      platform: 'whatsapp',
      timestamp,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('User did not share')) {
      console.log('[SHARE] Share cancelled by user', { platform: 'whatsapp' });
      return {
        success: false,
        platform: 'whatsapp',
        cancelled: true,
        timestamp,
      };
    }

    // If WhatsApp is not installed
    if (error instanceof Error && error.message.includes('not installed')) {
      const appStoreUrl = Platform.select({
        ios: 'https://apps.apple.com/app/whatsapp-messenger/id310633997',
        android: 'https://play.google.com/store/apps/details?id=com.whatsapp',
      });

      if (appStoreUrl) {
        await Linking.openURL(appStoreUrl);
      }

      return {
        success: false,
        platform: 'whatsapp',
        error: 'WhatsApp non installé',
        errorCode: 'APP_NOT_INSTALLED',
        timestamp,
      };
    }

    throw error;
  }
}

/**
 * Generic share using native OS share sheet
 */
async function shareGeneric(
  data: ShareData,
  imageUri: string,
  timestamp: Date
): Promise<ShareResult> {
  try {
    const message = getShareMessage(
      data.mode,
      data.mode === 'classique' ? data.streak || 0 : data.score
    );

    const shareOptions = {
      title: 'Timalaus - Mon Score',
      message,
      url: imageUri,
      failOnCancel: false,
    };

    const result = await Share.open(shareOptions);

    console.log('[SHARE] Share successful', { platform: 'generic', result });

    return {
      success: true,
      platform: 'generic',
      timestamp,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('User did not share')) {
      console.log('[SHARE] Share cancelled by user', { platform: 'generic' });
      return {
        success: false,
        platform: 'generic',
        cancelled: true,
        timestamp,
      };
    }

    throw error;
  }
}

/**
 * Check if a specific platform app is installed
 */
export async function isPlatformInstalled(platform: SharePlatform): Promise<boolean> {
  const urlSchemes: Record<SharePlatform, string> = {
    tiktok: 'tiktok://',
    instagram: 'instagram://',
    facebook: 'fb://',
    twitter: 'twitter://',
    whatsapp: 'whatsapp://',
    generic: '', // Always available
  };

  const urlScheme = urlSchemes[platform];

  if (!urlScheme || platform === 'generic') {
    return true;
  }

  try {
    return await Linking.canOpenURL(urlScheme);
  } catch {
    return false;
  }
}
