// mobile_app/utils/shareScore.web.ts
// Mock for Share functionality on Web

export async function shareTo(platform: string, data: any, imageUri: string) {
  console.log('[SHARE Web] Mock share to', platform, data);
  return {
    success: true,
    platform,
    timestamp: new Date(),
  };
}

export async function isPlatformInstalled(platform: string) {
  // On Web, we can't easily check for installed apps, so return false for native apps
  return platform === 'generic' || platform === 'twitter';
}
