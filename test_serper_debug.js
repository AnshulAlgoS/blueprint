import axios from 'axios';

const SERPER_API_KEY = "f30bd068980fbf7d215bcbb38c1b381bdfbb69b7";

async function testSerper() {
    const domains = [
        "niemanlab.org",
        "journalism.co.uk",
        "poynter.org",
        "ijnet.org"
    ];
    
    const siteQuery = domains.map(d => `site:${d}`).join(' OR ');
    // Simulating the query that might be failing
    const complexKeywords = "media/newsroom innovation opportunities for journalists media organizations product design service design product development programs internships application deadline after February 27";
    
    // Simulating a simple query
    const simpleKeywords = "journalism innovation grants";
    
    const datePart = `"deadline" 2025 2026`;
    
    // Test 1: Complex Query
    const query1 = `(${siteQuery}) ${complexKeywords} ${datePart}`;
    console.log("Testing Query 1 (Complex):", query1);
    
    try {
        const res1 = await axios.post('https://google.serper.dev/search', {
            q: query1,
            num: 10,
            tbs: "qdr:y"
        }, { headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' } });
        console.log("Results 1:", res1.data.organic ? res1.data.organic.length : 0);
    } catch (e) {
        console.error("Error 1:", e.message);
    }
    
    // Test 2: Simple Query
    const query2 = `(${siteQuery}) ${simpleKeywords} 2025`;
    console.log("\nTesting Query 2 (Simple):", query2);
    
    try {
        const res2 = await axios.post('https://google.serper.dev/search', {
            q: query2,
            num: 10,
            tbs: "qdr:y"
        }, { headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' } });
        console.log("Results 2:", res2.data.organic ? res2.data.organic.length : 0);
    } catch (e) {
        console.error("Error 2:", e.message);
    }
}

testSerper();