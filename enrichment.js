import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = "MediaOpps"; // Based on server.js
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

/**
 * Fetches records from Airtable where Notes = "Raw"
 */
async function fetchRawRecords() {
    console.log('--- Fetching Raw Records ---');
    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
        const response = await axios.get(url, {
            params: {
                filterByFormula: '{Notes}="Raw"'
            },
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });
        console.log(`Fetched ${response.data.records.length} raw records.`);
        return response.data.records;
    } catch (error) {
        console.error('Error fetching records from Airtable:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Classifies an opportunity using NVIDIA's AI model
 */
async function classifyOpportunity(record) {
    const { id, fields } = record;
    const opportunityName = fields['Opportunity Name'] || 'No Name';
    const summary = fields['Summary'] || 'No Summary';

    console.log(`Classifying: ${opportunityName}`);

    const payload = {
        model: "mistralai/ministral-14b-instruct-2512",
        messages: [
            {
                role: "user",
                content: `Classify this opportunity for a media-focused pipeline. 

CRITERIA:
1. EVIDENCE (News-magazine):
   - Opportunities pertaining to Investigative Journalism, Open-Source Intelligence (OSINT), and Data Journalism.
   - Targeted towards classical investigative projects, accountability reporting, and watchdog journalism.
   - Purpose: Uncovering corruption, human rights abuses, or systemic issues.

2. BLUEPRINT (News-magazine):
   - Opportunities pertaining to Product Design/Development or Service Design/Development.
   - Building tools, products, designs, and solutions to aid journalists and media organizations.
   - Purpose: Innovation, technology, and building the "infrastructure" of future journalism.

INPUT:
Title: ${opportunityName}
Summary: ${summary}

TASK:
1. Return a JSON object with:
   - "track": Set to either "Blueprint" or "Evidence".
   - "reasoning": A short 1-2 line explanation of why it fits this track based on the criteria.

Example: {"track": "Blueprint", "reasoning": "This opportunity focuses on building AI-driven research tools for newsrooms, fitting the Blueprint track for media infrastructure."}`
            }
        ],
        max_tokens: 150,
        stream: false
    };

    try {
        const response = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', payload, {
            headers: {
                'Authorization': NVIDIA_API_KEY.startsWith('Bearer') ? NVIDIA_API_KEY : `Bearer ${NVIDIA_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const content = response.data.choices[0].message.content.trim();
        return parseAIResponse(content);
    } catch (error) {
        console.error(`AI Classification failed for record ${id}:`, error.response?.data || error.message);
        return { track: 'SKIP_AI_FAILURE' };
    }
}

/**
 * Safely parses JSON from AI response
 */
function parseAIResponse(content) {
    try {
        console.log(`AI Raw Content: "${content}"`);
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.track) {
                let track = parsed.track.trim();
                if (track.toLowerCase().includes('blueprint')) track = 'Blueprint';
                else if (track.toLowerCase().includes('evidence')) track = 'Evidence';
                
                return {
                    track: track,
                    reasoning: parsed.reasoning || 'No reasoning provided by AI.'
                };
            }
        }
        
        // Fallback for keyword search
        if (content.toLowerCase().includes('blueprint')) {
            return { track: 'Blueprint', reasoning: 'Classified via keyword fallback.' };
        }
        if (content.toLowerCase().includes('evidence')) {
            return { track: 'Evidence', reasoning: 'Classified via keyword fallback.' };
        }
        
        throw new Error('Could not find valid track in AI response');
    } catch (error) {
        console.error('Failed to parse AI response:', content);
        return null;
    }
}

/**
 * Updates a record in Airtable
 */
async function updateAirtableRecord(recordId, track, notes = 'Processed') {
    try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;
        console.log(`Updating record ${recordId} with Track: "${track}", Notes: "${notes}"`);
        const response = await axios.patch(url, {
            records: [
                {
                    id: recordId,
                    fields: {
                        "Track (AI)": track,
                        "Notes": notes
                    }
                }
            ],
            typecast: true
        }, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Successfully updated record ${recordId} to ${track} (${notes})`);
        return response.data;
    } catch (error) {
        console.error(`Failed to update Airtable record ${recordId}:`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Main enrichment pipeline
 */
export async function runEnrichmentPipeline() {
    try {
        const records = await fetchRawRecords();
        if (records.length === 0) {
            console.log('No raw records found to process.');
            return { success: true, processed: 0 };
        }

        // Process in batches of 5 to respect rate limits and keep it efficient
        const batchSize = 5;
        let processedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);

            await Promise.all(batch.map(async (record) => {
                try {
                    const result = await classifyOpportunity(record);
                    
                    if (!result || result.track === 'SKIP_AI_FAILURE') {
                        // AI call failed, skip record
                        console.log(`Skipping record ${record.id} due to AI failure.`);
                        return;
                    }

                    if (result.track) {
                        const note = `Processed: ${result.reasoning}`;
                        await updateAirtableRecord(record.id, result.track, note);
                        processedCount++;
                    } else {
                        // AI succeeded but parsing failed
                        await updateAirtableRecord(record.id, 'Error', 'Error: Parsing Failed');
                        errorCount++;
                    }
                } catch (err) {
                    console.error(`Error processing record ${record.id}:`, err.message);
                    errorCount++;
                }
            }));

            // Small delay between batches to avoid hitting Airtable/AI rate limits
            if (i + batchSize < records.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`--- Enrichment Pipeline Finished ---`);
        console.log(`Processed: ${processedCount}, Errors: ${errorCount}`);
        return { success: true, processed: processedCount, errors: errorCount };
    } catch (error) {
        console.error('Enrichment pipeline failed:', error.message);
        return { success: false, error: error.message };
    }
}
