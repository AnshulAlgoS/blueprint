import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import https from 'https';
import mammoth from 'mammoth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

app.use(cors());
app.use(bodyParser.json());

const SERPER_API_KEY = "f30bd068980fbf7d215bcbb38c1b381bdfbb69b7";
const NVIDIA_API_KEY = "Bearer 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";

let targetDomains = [];

async function loadTargetSites() {
  try {
    const filePath = path.join(__dirname, 'public', 'List_of_Specific_Websites-1.docx');
    console.log(`Loading target sites from: ${filePath}`);
    if (fs.existsSync(filePath)) {
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;
        const lines = text.split('\n');
        const domains = new Set();
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && (trimmed.startsWith('http') || trimmed.startsWith('www'))) {
                try {
                    let urlStr = trimmed;
                    if (trimmed.startsWith('www') && !trimmed.startsWith('http')) {
                         urlStr = 'https://' + trimmed;
                    }
                    const url = new URL(urlStr);
                    domains.add(url.hostname.replace(/^www\./, ''));
                } catch (e) {
                    console.log(`Skipping invalid URL in docx: ${trimmed}`);
                }
            }
        }
        targetDomains = Array.from(domains);
        console.log(`✅ Loaded ${targetDomains.length} target domains from DOCX.`);
    } else {
        console.log("⚠️ DOCX file not found at:", filePath);
    }
  } catch (error) {
    console.error("❌ Error loading target sites from DOCX:", error);
  }
}

async function fetchUrlContent(url) {
  // console.log(`   ⏳ Fetching: ${url}`); // Reduce noise if needed
  
  // 1. Hard Timeout Race (Nuclear Option against hangs)
  const timeoutPromise = new Promise(resolve => 
    setTimeout(() => {
        console.log(`   ⏱️ HARD TIMEOUT forced for ${url}`);
        resolve(null);
    }, 6000) // 6s hard limit
  );

  // 2. Actual Fetch Logic
  const fetchLogic = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s internal timeout

        const response = await axios.get(url, {
          signal: controller.signal,
          httpsAgent: httpsAgent,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 5000,
          maxRedirects: 3,
          validateStatus: (status) => status < 500 // Accept 403s so we can handle them explicitly
        });
        clearTimeout(timeout);

        if (response.status === 403 || response.status === 429 || response.status === 999) {
            console.log(`   ⛔ Blocked (${response.status}) by ${new URL(url).hostname}`);
            return null;
        }

        const $ = cheerio.load(response.data);
        
        const title = $('title').text().toLowerCase();
        const bodyTextCheck = $('body').text().toLowerCase().substring(0, 1000);
        
        if (title.includes('404') || 
            title.includes('page not found') || 
            bodyTextCheck.includes('404 - page not found') || 
            bodyTextCheck.includes('this page could not be found')) {
           return null;
        }

        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('header').remove();
        $('iframe').remove();
        $('noscript').remove();
        $('svg').remove();
        
        let text = $('body').text().replace(/\s+/g, ' ').trim();
        return text.substring(0, 6000);
      } catch (error) {
        // console.log(`   ⚠️ Failed: ${url} (${error.message})`);
        return null;
      }
  };

  return Promise.race([fetchLogic(), timeoutPromise]);
}

let blueprintData = [];
try {
  const csvPath = path.join(__dirname, 'public', 'blueprint.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  blueprintData = lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      name: values[0],
      org: values[1],
      summary: values[3],
      deadline: values[4],
      link: values[9]
    };
  }).filter(item => item.name);
} catch (error) {
  console.error("Error loading blueprint.csv:", error);
}

const getSystemPrompt = (expireBy, type = 'blueprint') => {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  const currentYear = today.getFullYear();
  
  let minDeadlineString;
  if (expireBy) {
    minDeadlineString = expireBy;
  } else {
    const threeWeeksFromNow = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);
    minDeadlineString = threeWeeksFromNow.toISOString().split('T')[0];
  }

  const commonInstructions = `
TODAY'S DATE: ${dateString}
CURRENT YEAR: ${currentYear}
EARLIEST ACCEPTABLE DEADLINE: ${minDeadlineString}

CRITICAL INSTRUCTION - DEADLINE FILTERING:
- You must ONLY return opportunities where the deadline is ON or AFTER ${minDeadlineString}.
- STRICTLY REJECT any opportunity with a deadline BEFORE ${minDeadlineString}.
- Example: If Earliest Acceptable Deadline is 2025-02-18, then Feb 10 is REJECTED, but Feb 19 is ACCEPTED.
- You must STRICTLY verify that the deadline year is ${currentYear} or ${currentYear + 1}.
- REJECT any opportunity where the deadline year is 2024, 2023, 2022, 2021, or earlier.
- If a snippet says "2021" or "2022" or "2023", IT IS EXPIRED. DO NOT HALLUCINATE A NEW DATE.
- If you cannot find an explicit ${currentYear} or ${currentYear + 1} date in the snippet, DO NOT INCLUDE IT.
- Do NOT assume a program "recurs" unless you see a specific date for ${currentYear} or ${currentYear + 1}.`;

  if (type === 'evidence') {
      return `You are a specialized search assistant for "Evidence" opportunities (Investigative Journalism & OSINT).
Your primary goal is to find valid, active professional opportunities for investigative journalists, OSINT researchers, and data journalists.

${commonInstructions}

DEFINITION (NON-NEGOTIABLE):
A TRUE Evidence opportunity is one where participants are explicitly supported to:
- Conduct investigative journalism projects
- Use Open-Source Intelligence (OSINT) techniques
- Pursue data-driven reporting or accountability journalism
- Uncover corruption, human rights abuses, or systemic issues

Evidence classification is based on PURPOSE (Investigation/OSINT).

IMPORTANT EXCLUSIONS:
The following are NOT Evidence opportunities and MUST be rejected:
- purely opinion or commentary grants
- general arts/culture reporting (unless investigative)
- product development grants (unless strictly for investigative tools)
- **Gaming-focused initiatives (Gamers, Streamers)**
- **Awards, Prizes, or Competitions (unless they fund future investigation)**
- **ANY opportunities already present in the existing database.**
- **ANY opportunities with deadlines in 2024 or earlier.**

POSITIVE EVIDENCE SIGNALS (must be explicit):
- "investigative grant", "reporting fund"
- "OSINT fellowship", "data journalism"
- "accountability reporting", "watchdog journalism"
- "cross-border investigation"

OUTPUT FORMAT (STRICT):
You must output a JSON array of objects. Each object MUST contain the following fields. Use "NA" if information is missing.

1. "Opportunity Name": Name of the call
2. "Sponsoring Organization/Funder": The organization offering the opportunity
3. "Summary": Summary of purpose/objectives (MAX 140 words)
4. "Funding/Salary/Benefit": Funding range, salary, prize, or benefit
5. "Application Deadline": Exact date (YYYY-MM-DD format preferred). MUST be ON or AFTER ${minDeadlineString}.
6. "Eligibility": Who can apply and restrictions (MAX 140 words)
7. "Target Sector/Beneficiaries": Intended audience (MAX 10 words)
8. "Geographic Focus": Global, regional, or country-specific
9. "Consortium/Partnership Notes": Requirements for consortium bids
10. "Source Link": Direct URL to the opportunity (not homepage). MUST be a functioning, specific application/description page.
11. "End Summary": Short context sentence (MAX 140 words)

Core Rules (Non-Negotiable):
- Deadline is Critical: The deadline MUST be ON or AFTER ${minDeadlineString}. Reject anything earlier.
- **Year Check**: If the snippet mentions 2021, 2022, 2023, or 2024, DISCARD IT immediately. Only accept 2025 or 2026+.
- Strict Formatting: Return ONLY the JSON array.
- No explanations outside the JSON.
- **Link Verification**: Ensure the "Source Link" is a direct, functioning URL.
`;
  }

  // Default: Blueprint
  return `You are a specialized search assistant for "Blueprint" media opportunities.
Your primary goal is to find valid, active professional opportunities tailored for journalists, media organizations, and NGOs.

${commonInstructions}

DEFINITION (NON-NEGOTIABLE):
A TRUE Blueprint opportunity is one where participants are explicitly supported to:
- Product Design/Development (for media/journalism)
- Service Design/Development (for media/journalism)
- Build tools, products, designs, and solutions to aid journalists and media organizations

Blueprint classification is based on PURPOSE, not deadlines or application status.

IMPORTANT EXCLUSIONS:
The following are NOT Blueprint opportunities and MUST be rejected:
- investigative journalism grants
- reporting or story-production fellowships
- editorial or coverage-focused funding
- programs where the primary output is articles, reports, or investigations
- **Gaming-focused initiatives (Gamers, Streamers, Content Creators)**
- **Awards, Prizes, or Competitions (unless they fund future product work)**
- **ANY opportunities already present in the existing database provided in the user message.**
- **ANY opportunities with deadlines in 2024 or earlier.**

SPECIFIC EXCLUSIONS (Do not repeat these):
- European Commission (Creative Europe) - Journalism Partnerships
- Lenfest Institute Business Accelerator
- News Product Management Certification (NPMC)
- YOJO (Young Journalists) Innovation Lab
- Knight-Wallace Fellowships
- NewsSpectrum (unless explicitly for 2025/2026)
- Gamers Against Manipulation Efforts (GAME)
- Poynter's MediaWise (unless for professional journalists)
- Any "Gamer" or "Gaming" focused pilots that are not for newsrooms

POSITIVE BLUEPRINT SIGNALS (must be explicit):
- product design, service design
- tool building, solution development for journalists
- innovation labs, accelerators, or R&D programs
- prototyping, MVPs, pilots
- reusable or scalable outputs for journalism

OUTPUT FORMAT (STRICT):
You must output a JSON array of objects. Each object MUST contain the following fields. Use "NA" if information is missing.

1. "Opportunity Name": Name of the call
2. "Sponsoring Organization/Funder": The organization offering the opportunity
3. "Summary": Summary of purpose/objectives (MAX 140 words)
4. "Funding/Salary/Benefit": Funding range, salary, prize, or benefit
5. "Application Deadline": Exact date (YYYY-MM-DD format preferred). MUST be ON or AFTER ${minDeadlineString}.
6. "Eligibility": Who can apply and restrictions (MAX 140 words)
7. "Target Sector/Beneficiaries": Intended audience (MAX 10 words)
8. "Geographic Focus": Global, regional, or country-specific
9. "Consortium/Partnership Notes": Requirements for consortium bids
10. "Source Link": Direct URL to the opportunity (not homepage). MUST be a functioning, specific application/description page.
11. "End Summary": Short context sentence (MAX 140 words)

Core Rules (Non-Negotiable):
- Deadline is Critical: The deadline MUST be ON or AFTER ${minDeadlineString}. Reject anything earlier.
- **Year Check**: If the snippet mentions 2021, 2022, 2023, or 2024, DISCARD IT immediately. Only accept 2025 or 2026+.
- Strict Formatting: Return ONLY the JSON array.
- No explanations outside the JSON.
- **Link Verification**: Ensure the "Source Link" is a direct, functioning URL to the specific opportunity.
- **Exclusion Check**: ABSOLUTELY NO "Gamers Against Manipulation Efforts" or similar gamer/streamer projects.
`;
};

async function generateSearchKeywords(userQuery, type = 'blueprint') {
  try {
    let prompt;
    if (type === 'evidence') {
        prompt = `You are a Search Query Optimizer for an "Evidence" opportunity finder (Investigative Journalism).
        
        User Query: "${userQuery}"
        CURRENT YEAR: 2025
        
        Goal: Find "Evidence" opportunities which are STRICTLY defined as:
        1. Investigative Journalism Grants/Funds
        2. Open-Source Intelligence (OSINT) Fellowships
        3. Cross-border investigative collaborations
        4. Data journalism support
        
        NOT product development. NOT general news reporting.
        
        Output 3-5 high-quality Google search terms.
        Focus on "investigative grant", "call for proposals", "OSINT fellowship", "reporting fund".
        Include  or "2026" in the keywords to ensure freshness.
        
        Format: Just the keywords separated by spaces. No quotes around the whole string.`;
    } else {
        prompt = `You are a Search Query Optimizer for a "Blueprint" opportunity finder.
        
        User Query: "${userQuery}"
        CURRENT YEAR: 2025
        
        Goal: Find "Blueprint" opportunities which are STRICTLY defined as:
        1. Product Design/Development for journalism
        2. Service Design/Development for journalism
        3. Building tools, products, designs, and solutions to aid journalists/media.
        
        NOT editorial grants. NOT reporting fellowships.
        
        Output 3-5 high-quality Google search terms.
        Focus on "call for proposals", "apply", "innovation grant", "product development fellowship".
        Include "2025" or "2026" in the keywords to ensure freshness.
        
        Format: Just the keywords separated by spaces. No quotes around the whole string.`;
    }
    
    const response = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
      model: "mistralai/ministral-14b-instruct-2512",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
      temperature: 0.1
    }, {
      headers: {
        "Authorization": NVIDIA_API_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      timeout: 8000 // 8s timeout for LLM
    });

    let keywords = response.data.choices[0].message.content.trim();
    // Remove quotes if the LLM adds them
    keywords = keywords.replace(/^"|"$/g, '');
    return keywords;
  } catch (error) {
    console.error("Error generating keywords:", error.message);
    if (type === 'evidence') {
        return "investigative journalism grants osint fellowship";
    }
    return "journalism product design development grant fellowship";
  }
}

function parseDateStrict(dateStr) {
    if (!dateStr || dateStr === "NA" || dateStr === "Rolling") return null;
    
    // Normalize date string
    let cleanStr = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1').trim();
    
    // Handle "January 2026" (default to 1st) or "Late 2026"
    if (/^[A-Za-z]+ \d{4}$/.test(cleanStr)) {
        cleanStr = "1 " + cleanStr;
    }

    const d = new Date(cleanStr);
    
    // Check for Invalid Date
    if (isNaN(d.getTime())) return null;

    // Strict Year Check: Reject 2001 (default JS year for "January 1") if year is missing
    if (d.getFullYear() < 2024) return null;

    return d;
}

async function verifyCandidate(candidate, minDeadlineString, type = 'blueprint') {
  const name = candidate["Opportunity Name"];
  console.log(`\n🕵️‍♂️ Deep Verifying (${type}): "${name}"...`);

  try {
  let verifyQuery = `site:${new URL(candidate["Source Link"] || "http://google.com").hostname} "${name}" application`;
  
  verifyQuery = verifyQuery.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  let searchResponse = await axios.post('https://google.serper.dev/search', {
    q: verifyQuery,
    num: 3 
  }, {
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  let results = searchResponse.data.organic || [];

  if (results.length === 0) {
      console.log(`   Strict site-search failed for "${name}". Attempting broad search...`);
      
      let broadQuery = `"${name}" (application OR apply OR deadline)`;
      try {
        let broadResponse = await axios.post('https://google.serper.dev/search', {
            q: broadQuery,
            num: 3
        }, {
            headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json'
            }
        });
        results = broadResponse.data.organic || [];
      } catch (e) {
          console.log(`   Broad search failed: ${e.message}`);
      }
  }

  if (results.length === 0) {
    console.log(`❌ Verification failed for "${name}": No search results found (strict or broad).`);
    return null;
  }

  let bestLink = null;
  let content = null;
  
  const socialMediaDomains = ['instagram.com', 'facebook.com', 'twitter.com', 'linkedin.com', 'tiktok.com', 'pinterest.com'];

  for (const result of results) {
      const isSocial = socialMediaDomains.some(domain => result.link.includes(domain));
      if (isSocial) {
          console.log(`   Skipping social media link: ${result.link}`);
          continue;
      }

      console.log(`   Checking Source: ${result.link}`);
      content = await fetchUrlContent(result.link);
      
      if (content && content.length > 200 && !content.includes("403 Forbidden") && !content.includes("Access Denied")) {
          bestLink = result.link;
          break;
      } else {
           console.log(`   ⚠️ Failed to fetch or blocked: ${result.link}`);
      }
  }

    if (!bestLink || !content) {
       console.log(`❌ Verification failed for "${name}": Could not fetch content from any of the top 5 sources.`);
       return null;
    }

    // Check for explicit closed indicators in the content
  if (content.toLowerCase().includes("applications are closed") || 
      content.toLowerCase().includes("applications are now closed") || 
      content.toLowerCase().includes("no longer accepting applications") ||
      content.toLowerCase().includes("submission period has ended") ||
      content.toLowerCase().includes("deadline has passed") ||
      content.toLowerCase().includes("closed for applications")) {
      console.log(`❌ Rejected "${name}": Content explicitly says applications are closed.`);
      return null;
  }

  // Pre-check for Gaming/Gamer content to save LLM calls
  const lowerContent = content.toLowerCase();
  const lowerName = name.toLowerCase();
  if (lowerName.includes("gamer") || lowerName.includes("gaming") || lowerName.includes("streamer") || 
      (lowerName.includes("manipulation") && lowerName.includes("game"))) {
      console.log(`❌ Rejected "${name}": Gaming/Gamer keyword detected in title.`);
      return null;
  }
  
  if (lowerContent.includes("gamers against manipulation") || 
      (lowerContent.includes("gamers") && lowerContent.includes("content creators") && !lowerContent.includes("newsroom"))) {
       console.log(`❌ Rejected "${name}": Gaming/Gamer content detected.`);
       return null;
  }

    const factCheckPrompt = `
    You are a strict fact-checker. Verify if the opportunity "${name}" exists and if its application deadline is ON or AFTER ${minDeadlineString}.
    
    Source Content Snippet (from ${bestLink}):
    """
    ${content.substring(0, 5000)}
    """
    
    DEADLINE CHECK: The deadline MUST be ON or AFTER ${minDeadlineString}.
    - If the page says "Deadline: January 15, 2026", and minDeadline is "2026-02-26", REJECT IT.
    - If the page says "Deadline: March 1, 2026", ACCEPT IT.
    - If the page lists multiple deadlines (e.g., Oct 2026, Jan 2027), ACCEPT the earliest one that is still valid (future).
    - CRITICAL: Check if the text explicitly says "applications are closed" or "closed". If so, set "exists" to false.
    - LOOK FOR: "Apply Now" buttons, "Applications Open", or clear future dates.
    - REJECT if the opportunity is primarily for "gamers", "streamers", or "content creators" (unless specifically for journalists).
    - REJECT if the page is just a "news release" or "article" without an active application link/instruction.
    
    Respond with ONLY a JSON object (no markdown, no backticks):
    {
      "exists": true/false,
      "Application Deadline": "YYYY-MM-DD" (or "Rolling"),
      "reason": "Brief reason for acceptance/rejection"
    }
    `;

    let factCheckText = "";
    try {
        const factCheckResponse = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
            model: "mistralai/ministral-14b-instruct-2512",
            messages: [
                { role: "system", content: "You are a strict fact-checker. Return ONLY JSON." },
                { role: "user", content: factCheckPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.1
        }, {
            headers: {
                "Authorization": NVIDIA_API_KEY,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            timeout: 10000 // 10s timeout
        });
        factCheckText = factCheckResponse.data.choices[0].message.content;
    } catch (apiError) {
        console.error(`❌ Fact-Check API Failed for "${name}":`, apiError.message);
        return null;
    }

    factCheckText = factCheckText.replace(/```json/g, '').replace(/```/g, '').trim();

    let verifiedOp;
    try {
      verifiedOp = JSON.parse(factCheckText);
    } catch (e) {
      console.log(`❌ JSON Parse Error for "${name}"`);
      return null;
    }

    if (!verifiedOp.exists) {
        console.log(`❌ LLM Rejected "${name}": ${verifiedOp.reason}`);
        return null;
    }

    if (verifiedOp["Application Deadline"] && verifiedOp["Application Deadline"] !== "NA") {
        const deadlineDate = parseDateStrict(verifiedOp["Application Deadline"]);
        const minDate = new Date(minDeadlineString);

        if (deadlineDate && !isNaN(minDate.getTime())) {
            deadlineDate.setHours(0,0,0,0);
            minDate.setHours(0,0,0,0);

            if (deadlineDate < minDate) {
                console.log(`❌ JS Date Check Failed for "${name}": ${verifiedOp["Application Deadline"]} is before ${minDeadlineString}`);
                return null;
            }
        }
    }
    
    // Return verified opportunity with the source link found
    return {
        ...candidate,
        "Source Link": bestLink, // Update with the verified source
        "Application Deadline": verifiedOp["Application Deadline"]
    };

  } catch (error) {
    console.error(`Error verifying ${name}:`, error.message);
    return null;
  }
}

app.get('/api/search', async (req, res) => {
  const query = req.query.query;
  const expireBy = req.query.expireBy;
  const type = req.query.type || 'blueprint';
  
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

    // Keep connection alive
    const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
    }, 15000);

    // Ensure we clear the interval when the response ends
    res.on('close', () => {
        clearInterval(keepAlive);
    });

    const sendEvent = (type, data) => {
        res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    };

    console.log(`Received raw query: ${query}, Expire By: ${expireBy}, Type: ${type}`);
  sendEvent('log', `Starting ${type} search for: ${query}`);

  const optimizedKeywords = await generateSearchKeywords(query, type);
  console.log(`Optimized Keywords: ${optimizedKeywords}`);
  sendEvent('log', `Optimized Keywords: ${optimizedKeywords}`);
  
  // Force "apply" context
  const searchKeywords = `${optimizedKeywords} (apply OR application OR "call for proposals")`;
  
  let allVerifiedOpportunities = [];
  const processedTitles = new Set();
  const targetCount = 5;

  // Helper to chunk array
  const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  let dateSpecificQuery = "";
  if (expireBy) {
      const expDate = new Date(expireBy);
      if (!isNaN(expDate.getTime())) {
          // Construct query for months AFTER the deadline in the current/next year
          const nextMonthIndex = (expDate.getMonth() + 1) % 12;
          const targetYear = nextMonthIndex === 0 ? expDate.getFullYear() + 1 : expDate.getFullYear();
          const nextMonthName = monthNames[nextMonthIndex];
          const nextNextMonthName = monthNames[(nextMonthIndex + 1) % 12];
          
          dateSpecificQuery = `(deadline ${nextMonthName} ${targetYear} OR deadline ${nextNextMonthName} ${targetYear} OR deadline late ${targetYear})`;
      }
  }
  
  // --- PHASE 1: TARGETED SEARCH (Strictly Specific Websites) ---
  if (targetDomains.length > 0) {
      console.log(`\n🎯 PHASE 1: Targeted Search across ${targetDomains.length} domains...`);
      sendEvent('log', `Scanning ${targetDomains.length} specific websites...`);
      
      const domainBatches = chunk(targetDomains, 10); // 10 sites per query
      
      for (const [index, batch] of domainBatches.entries()) {
          if (allVerifiedOpportunities.length >= targetCount) {
              console.log("🎯 Target count reached during Targeted Search. Stopping.");
              sendEvent('log', "Target count reached.");
              break;
          }

          const siteQuery = batch.map(d => `site:${d}`).join(' OR ');
          // Use date specific query if available, otherwise generic. 
          // RELAXED: Removed "deadline" keyword to catch more results.
          const datePart = dateSpecificQuery || `(2025 OR 2026)`;
          
          // Use the enhanced searchKeywords instead of just optimizedKeywords
          // We intentionally drop the full 'optimizedKeywords' if it's too long, relying on our shorter cleaned version
          // And we avoid the site-specific OR chain if it's too long for Google (max ~32 words usually)
          // But here we are chunking 10 sites, so that's fine.
          
          let targetedQuery = `(${siteQuery}) ${searchKeywords} ${datePart}`; 
          
          console.log(`   Processing Batch ${index + 1}/${domainBatches.length}...`);
          sendEvent('log', `Processing Batch ${index + 1}/${domainBatches.length}...`);
          
          try {
              let searchResponse = await axios.post('https://google.serper.dev/search', {
                  q: targetedQuery,
                  num: 20,
                  tbs: "qdr:y" // Past year
              }, {
                  headers: {
                      'X-API-KEY': SERPER_API_KEY,
                      'Content-Type': 'application/json'
                  }
              });

              let searchResults = searchResponse.data.organic || [];
              
              // DEBUG LOG
              console.log(`   Batch ${index + 1} Raw Results: ${searchResults.length}`);
              
              // FALLBACK: If 0 results, try very broad query for this batch
              if (searchResults.length === 0) {
                   console.log(`   ⚠️ Batch ${index + 1} empty. Retrying with broad fallback...`);
                   sendEvent('log', `   Batch ${index + 1} empty. Retrying with broad fallback...`);
                   
                   let fallbackQuery;
                   if (type === 'evidence') {
                       fallbackQuery = `(${siteQuery}) (investigative journalism OR OSINT OR "data journalism") (grant OR fellowship) 2026`;
                   } else {
                       fallbackQuery = `(${siteQuery}) journalism (grant OR fellowship OR innovation) 2026`;
                   }

                   const fallbackResponse = await axios.post('https://google.serper.dev/search', {
                      q: fallbackQuery,
                      num: 20,
                      tbs: "qdr:y"
                   }, { headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' } });
                   
                   searchResults = fallbackResponse.data.organic || [];
                   console.log(`   Batch ${index + 1} Fallback Results: ${searchResults.length}`);
              }

              if (searchResults.length > 0) {
                  sendEvent('log', `   Found ${searchResults.length} raw results in batch ${index + 1}. Verifying...`);
                  await processSearchResults(searchResults, query, expireBy, allVerifiedOpportunities, processedTitles, type);
                  sendEvent('progress', { found: allVerifiedOpportunities.length, target: targetCount });
              } else {
                  sendEvent('log', `   No raw results in batch ${index + 1}.`);
              }
          } catch (err) {
              console.error(`   ❌ Error in targeted batch ${index + 1}:`, err.message);
              sendEvent('log', `Error in batch ${index + 1}: ${err.message}`);
          }
      }
  } else {
      sendEvent('log', "No specific websites loaded.");
  }

  // --- PHASE 2: BROAD SEARCH (Fallback if needed) ---
  if (allVerifiedOpportunities.length < targetCount) {
      console.log(`   Phase 1 yielded ${allVerifiedOpportunities.length} results. Running Phase 2 (High-Quality Broad Search)...`);
      sendEvent('log', `Phase 1 found ${allVerifiedOpportunities.length} results. Expanding search to high-quality external sources...`);
      
      const broadQueries = type === 'evidence' ? [
          `"investigative journalism" (grant OR fund OR fellowship) "application deadline" 2026 -gaming`,
          `"OSINT" (fellowship OR grant) "apply by" 2026 -award -prize`
      ] : [
          `"journalism" (fellowship OR grant OR "product development") "application deadline" 2026 -gaming -esports`,
          `"media innovation" (funding OR opportunity) "apply by" 2026 -award -prize`
      ];

      for (const q of broadQueries) {
          if (allVerifiedOpportunities.length >= targetCount) break;
          
          try {
              console.log(`   Running Broad Search: ${q}`);
              const broadRes = await axios.post('https://google.serper.dev/search', {
                  q: q,
                  num: 10
              }, { headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' } });
              
              const candidates = broadRes.data.organic || [];
              const validCandidates = candidates.filter(c => 
                  !c.link.includes("linkedin.com") && 
                  !c.link.includes("indeed.com") &&
                  !c.link.includes("glassdoor.com") &&
                  !c.title.toLowerCase().includes("gamer")
              );

              if (validCandidates.length > 0) {
                  await processSearchResults(validCandidates, query, expireBy, allVerifiedOpportunities, processedTitles, type);
              }
          } catch (e) {
              console.log(`   Phase 2 search failed: ${e.message}`);
          }
      }
  } else {
      console.log("   Skipping Phase 2 (Targeted Search satisfied request).");
      sendEvent('log', "Targeted search successful.");
  }

  // Small delay to ensure last log is received
  setTimeout(() => {
      sendEvent('complete', allVerifiedOpportunities);
      setTimeout(() => {
          res.end();
          console.log("Search request completed and response closed.");
      }, 500);
  }, 500);
});

// Helper function to process search results (fetch, extract, verify)
async function processSearchResults(searchResults, userQuery, expireBy, allVerifiedOpportunities, processedTitles, type = 'blueprint') {
    const topResults = searchResults.slice(0, 10); 
    console.log(`   Fetching content for ${topResults.length} results...`);
    
    const fetchedResults = await Promise.allSettled(topResults.map(async (r) => {
        const content = await fetchUrlContent(r.link);
        if (content) {
            return {
                title: r.title,
                link: r.link,
                snippet: r.snippet,
                content: content
            };
        }
        return null;
    }));

    const validResults = fetchedResults
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);
    
    if (validResults.length === 0) {
        console.log("   ⚠️ No content fetched. Skipping extraction.");
        return;
    }

    const searchContext = validResults.map((r) => 
        `Title: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}\nVERIFIED PAGE CONTENT:\n${r.content.substring(0, 4000)}`
    ).join('\n\n----------------\n\n');

    const verificationPayload = {
        model: "mistralai/ministral-14b-instruct-2512",
        messages: [
            { role: "system", content: getSystemPrompt(expireBy, type) },
            { role: "user", content: `Here is the search context from the web.
            
SEARCH CONTEXT:
${searchContext}

User Query: ${userQuery}

TASK: Extract NEW and UNIQUE ${type === 'evidence' ? 'Evidence' : 'Blueprint'} opportunities.
- IGNORE any that match these already found titles: ${Array.from(processedTitles).join(", ")}
- MUST have deadline ON or AFTER ${expireBy || "today"}.
- **CRITICAL**: If a snippet lists a deadline BEFORE ${expireBy || "today"}, DO NOT INCLUDE IT.
- **CRITICAL**: Return Valid JSON only. Do not wrap in markdown code blocks.

Return JSON array.` }
        ],
        max_tokens: 3000,
        temperature: 0.1
    };

    try {
        console.log(`   🧠 Sending content to AI for extraction...`);
        const verificationResponse = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', verificationPayload, {
            headers: {
                "Authorization": NVIDIA_API_KEY,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            timeout: 15000 // 15s timeout
        });

        const content = verificationResponse.data.choices[0].message.content;
        
        let opportunities = [];
        try {
            const jsonMatch = content.match(/\[.*\]/s);
            if (jsonMatch) {
                opportunities = JSON.parse(jsonMatch[0]);
            } else {
                opportunities = JSON.parse(content);
            }
        } catch (e) {
            console.error("   ⚠️ Failed to parse LLM response.");
             const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
             if (jsonMatch) {
                 try { opportunities = JSON.parse(jsonMatch[1]); } catch(err){}
             }
        }

        if (!Array.isArray(opportunities)) {
             opportunities = []; 
        }

        console.log(`   🔍 Extracted ${opportunities.length} candidates. Verifying...`);
        const verificationDeadline = expireBy || new Date().toISOString().split('T')[0];

        for (const op of opportunities) {
            if (processedTitles.has(op["Opportunity Name"])) continue;
            
            const verifiedOp = await verifyCandidate(op, verificationDeadline);
            if (verifiedOp) {
                allVerifiedOpportunities.push(verifiedOp);
                processedTitles.add(verifiedOp["Opportunity Name"]);
            }
        }
    } catch (err) {
        console.error("   ❌ Error during extraction/verification:", err.message);
    }
}

const AIRTABLE_API_KEY = "patJEqY1tvu1kScCb.9c0c1acf3bc842f90cc1d02442d2c23ebc1408e0cf3e682a94c14c3a8e5e44b1";
const AIRTABLE_BASE_ID = "appwSbJ5pFIbkaCgN";
const AIRTABLE_TABLE_NAME = "MediaOpps";

app.post('/api/push-to-airtable', async (req, res) => {
  const { opportunities } = req.body;
  
  if (!opportunities || !Array.isArray(opportunities) || opportunities.length === 0) {
    return res.status(400).json({ error: "No opportunities provided" });
  }

  console.log(`Pushing ${opportunities.length} opportunities to Airtable...`);

  const records = opportunities.map(op => ({
    fields: {
      "Opportunity Name": op["Opportunity Name"]?.substring(0, 255) || "NA",
      "Sponsoring Organization/Funder": op["Sponsoring Organization/Funder"] || "NA",
      "Summary": op["Summary"] || "NA",
      "Funding/Salary/Benefit": op["Funding/Salary/Benefit"] || "NA",
      "Application Deadline": op["Application Deadline"] || "NA",
      "Eligibility": op["Eligibility"] || "NA",
      "Target Sector/Beneficiaries": op["Target Sector/Beneficiaries"] || "NA",
      "Geographic Focus": op["Geographic Focus"] || "NA",
      "Consortium/Partnership Notes": op["Consortium/Partnership Notes"] || "NA",
      "Source Link": op["Source Link"] || "NA",
      "End Summary": op["End Summary"] || "NA",
      "Status": "Draft"
    }
  }));

  try {
    // Airtable allows creating up to 10 records per request
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const response = await axios.post(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`,
        { 
            records: batch,
            typecast: true 
        },
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      results.push(...response.data.records);
    }
    
    console.log(`✅ Successfully pushed ${results.length} records to Airtable.`);
    res.json({ success: true, count: results.length, records: results });
  } catch (error) {
    console.error("❌ Airtable push failed:", error.response ? JSON.stringify(error.response.data) : error.message);
    res.status(500).json({ error: "Failed to push to Airtable", details: error.response ? error.response.data : error.message });
  }
});

async function startServer() {
    await loadTargetSites();
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
}

startServer();
