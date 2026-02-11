
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const agent = new https.Agent({  
  rejectUnauthorized: false
});

async function fetchUrlContent(url) {
  console.log(`Testing fetch for: ${url}`);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // Increased to 10s

    const response = await axios.get(url, {
      signal: controller.signal,
      httpsAgent: agent, // Ignore SSL errors
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });
    clearTimeout(timeout);

    console.log(`Response status: ${response.status}`);
    const $ = cheerio.load(response.data);
    const title = $('title').text();
    console.log(`Page title: ${title}`);
    return "Success";
  } catch (error) {
    console.error(`Failed to fetch ${url}:`);
    if (error.response) {
      console.error(`- Status: ${error.response.status}`);
      console.error(`- Headers: ${JSON.stringify(error.response.headers)}`);
    } else if (error.request) {
      console.error(`- No response received (Timeout/Network)`);
      console.error(`- Error: ${error.message}`);
    } else {
      console.error(`- Error: ${error.message}`);
    }
    return null;
  }
}

// Test with a few likely targets and a control
await fetchUrlContent('https://www.google.com'); // Control
await fetchUrlContent('https://journalism.cuny.edu/centers/tow-knight/fellowships/'); // Example target
await fetchUrlContent('https://www.icfj.org/'); // Example target
