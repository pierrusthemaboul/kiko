const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'tiktok-credentials.json');
const TOKENS_PATH = path.join(__dirname, '..', 'tiktok-tokens.json');

// Load credentials
if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error('❌ Credentials file tiktok-credentials.json not found.');
  process.exit(1);
}
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

async function loadAndRefreshTokens() {
  if (!fs.existsSync(TOKENS_PATH)) {
    throw new Error('Tokens file tiktok-tokens.json not found. Please run the auth server first.');
  }

  const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const expirationTime = tokens.created_at + tokens.expires_in;

  // If token is expired or expires in less than 5 minutes, refresh it
  if (now >= expirationTime - 300) {
    console.log('🔄 Access Token expired or expiring soon. Refreshing...');
    
    const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_key: credentials.clientKey,
        client_secret: credentials.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
    }

    const updatedTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      refresh_expires_in: data.refresh_expires_in,
      scope: data.scope,
      open_id: data.open_id,
      created_at: Math.floor(Date.now() / 1000)
    };

    fs.writeFileSync(TOKENS_PATH, JSON.stringify(updatedTokens, null, 2));
    console.log('✅ Access Token refreshed successfully.');
    return updatedTokens.access_token;
  }

  return tokens.access_token;
}

async function getProfileInfo(accessToken) {
  console.log('👤 Fetching TikTok Profile info...');
  const url = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count';
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Profile fetch failed: ${JSON.stringify(data)}`);
  }
  return data.data.user;
}

async function getVideosList(accessToken) {
  console.log('🎥 Fetching recent TikTok videos...');
  const url = 'https://open.tiktokapis.com/v2/video/list/?fields=cover_image_url,share_url,like_count,comment_count,share_count,view_count,title,create_time,duration,id';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      max_count: 20
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Videos fetch failed: ${JSON.stringify(data)}`);
  }
  return data.data.videos || [];
}

async function main() {
  try {
    const accessToken = await loadAndRefreshTokens();

    // 1. Fetch Profile info
    const profile = await getProfileInfo(accessToken);
    console.log('\n=======================================');
    console.log('TIKTOK PROFILE STATS:');
    console.log('=======================================');
    console.log(`Display Name: ${profile.display_name}`);
    console.log(`Followers:    ${profile.follower_count}`);
    console.log(`Following:    ${profile.following_count}`);
    console.log(`Total Likes:  ${profile.likes_count}`);
    console.log(`Video Count:  ${profile.video_count}`);

    // 2. Fetch Video list
    const videos = await getVideosList(accessToken);
    console.log('\n=======================================');
    console.log('TIKTOK VIDEOS STATS:');
    console.log('=======================================');
    if (videos.length === 0) {
      console.log('No videos found.');
    } else {
      let totalViews = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;

      videos.forEach((video, index) => {
        console.log(`\nVideo ${index + 1}: "${video.title || '(No Title)'}"`);
        console.log(`  - Views:    ${video.view_count}`);
        console.log(`  - Likes:    ${video.like_count}`);
        console.log(`  - Comments: ${video.comment_count}`);
        console.log(`  - Shares:   ${video.share_count}`);
        console.log(`  - Link:     ${video.share_url}`);

        totalViews += video.view_count || 0;
        totalLikes += video.like_count || 0;
        totalComments += video.comment_count || 0;
        totalShares += video.share_count || 0;
      });

      console.log('\n=======================================');
      console.log('AGGREGATED METRICS (LAST 20 VIDEOS):');
      console.log('=======================================');
      console.log(`Total Views:    ${totalViews}`);
      console.log(`Total Likes:    ${totalLikes}`);
      console.log(`Total Comments: ${totalComments}`);
      console.log(`Total Shares:   ${totalShares}`);
    }

  } catch (error) {
    console.error('❌ Failed to fetch TikTok analytics:', error.message);
  }
}

main();
