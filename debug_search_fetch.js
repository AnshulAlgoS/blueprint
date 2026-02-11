
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const SERPER_API_KEY = "f30bd068980fbf7d215bcbb38c1b381bdfbb69b7";

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

async function fetchUrlContent(url) {
  console.log(`\nAttempting to fetch: ${url}`);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await axios.get(url, {
      signal: controller.signal,
      httpsAgent: httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });
    clearTimeout(timeout);

    console.log(`✅ Success! Status: ${response.status}`);
    return "Success";
  } catch (error) {
    if (error.response) {
      console.log(`❌ Failed. Status: ${error.response.status}`);
      console.log(`   Headers: ${JSON.stringify(error.response.headers)}`);
    } else {
      console.log(`❌ Failed. Error: ${error.message}`);
    }
    return null;
  }
}

async function runDebug() {
  // Simplified query
  const query = `journalism media innovation product design grants fellowships 2025 2026`;
  
  console.log(`Searching Serper with: ${query}`);
  try {
    const searchResponse = await axios.post('https://google.serper.dev/search', {
      q: query,
      num: 12
    }, {
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    const results = searchResponse.data.organic || [];
    console.log(`Found ${results.length} results.`);

    for (const result of results) {
      await fetchUrlContent(result.link);
    }

  } catch (e) {
    console.error("Search failed:", e.message);
  }
}

runDebug();
