const fs = require('fs');
const path = require('path');

// 1. Test Discord Webhook
async function testDiscord() {
  console.log('Testing Discord Webhook...');
  try {
    const filePath = path.join(__dirname, '..', 'discord-webhook.json');
    if (!fs.existsSync(filePath)) {
      console.log('❌ Discord webhook file not found.');
      return false;
    }
    const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!config.webhookUrl) {
      console.log('❌ Discord Webhook URL is empty.');
      return false;
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: '🤖 **Antigravity Test**: Connexion au Webhook Discord validée avec succès !'
      })
    });

    if (response.status === 204 || response.status === 200) {
      console.log('✅ Discord Webhook connection successful!');
      return true;
    } else {
      console.log(`❌ Discord Webhook failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Discord Webhook Error:', error.message);
    return false;
  }
}

// 2. Test Twitter / X API
async function testTwitter() {
  console.log('\nTesting Twitter / X API...');
  try {
    const filePath = path.join(__dirname, '..', 'twitter-credentials.json');
    if (!fs.existsSync(filePath)) {
      console.log('❌ Twitter credentials file not found.');
      return false;
    }
    const credentials = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Check if we can resolve twitter-api-v2
    try {
      require.resolve('twitter-api-v2');
    } catch {
      console.log('❌ "twitter-api-v2" npm package is not installed or accessible.');
      return false;
    }

    const { TwitterApi } = require('twitter-api-v2');
    const client = new TwitterApi({
      appKey: credentials.apiKey,
      appSecret: credentials.apiSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessTokenSecret,
    });

    // Test credentials by posting a test tweet and deleting it (Free tier has write-only permission)
    console.log('Posting a temporary test tweet...');
    const testTweet = await client.v2.tweet({
      text: `🤖 Antigravity Test Connection (Timestamp: ${Date.now()})`
    });

    console.log(`✅ Tweet posted! ID: ${testTweet.data.id}`);

    console.log('Deleting the test tweet...');
    await client.v2.deleteTweet(testTweet.data.id);
    console.log('✅ Test tweet deleted successfully!');
    return true;
  } catch (error) {
    console.log('❌ Twitter API Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== Testing Social Media API Credentials ===\n');
  await testDiscord();
  await testTwitter();
}

runTests();
