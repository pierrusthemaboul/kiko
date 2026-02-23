
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';

async function fetchEvents() {
    console.log('📊 Fetching Firebase Events for today...\n');

    const credentialsPath = path.join(__dirname, '..', 'kiko-chrono-firebase-adminsdk-fbsvc-1d73e8e206.json');
    const propertyId = 'properties/472969518';

    try {
        const auth = new GoogleAuth({
            keyFile: credentialsPath,
            scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        });

        const authClient = await auth.getClient();
        const analyticsData = google.analyticsdata({
            version: 'v1beta',
            auth: authClient as any,
        });

        const response = await analyticsData.properties.runReport({
            property: propertyId,
            requestBody: {
                dateRanges: [{ startDate: 'today', endDate: 'today' }],
                dimensions: [{ name: 'eventName' }],
                metrics: [{ name: 'eventCount' }],
                dimensionFilter: {
                    filter: {
                        fieldName: 'eventName',
                        inListFilter: {
                            values: ['ad_reward', 'extra_play', 'rewarded_ad_earned', 'earned_reward']
                        }
                    }
                }
            },
        });

        console.log('✅ Success! Event counts for today:');
        if (response.data.rows) {
            response.data.rows.forEach(row => {
                console.log(`${row.dimensionValues?.[0].value}: ${row.metricValues?.[0].value}`);
            });
        } else {
            console.log('📭 No matching events found for today (or data is still in processing - GA4 usually has a few hours delay).');
        }

        // Try a wider range just in case
        console.log('\n📊 Fetching Firebase Events for the last 2 days...');
        const response2 = await analyticsData.properties.runReport({
            property: propertyId,
            requestBody: {
                dateRanges: [{ startDate: 'yesterday', endDate: 'today' }],
                dimensions: [{ name: 'eventName' }],
                metrics: [{ name: 'eventCount' }],
            },
        });

        if (response2.data.rows) {
            response2.data.rows.forEach(row => {
                if (row.dimensionValues?.[0].value?.includes('ad') || row.dimensionValues?.[0].value?.includes('reward')) {
                    console.log(`${row.dimensionValues?.[0].value}: ${row.metricValues?.[0].value}`);
                }
            });
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    }
}

fetchEvents();
