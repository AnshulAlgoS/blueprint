import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Opportunity = {
  ["Opportunity Name"]: string;
  ["Sponsoring Organization/Funder"]: string;
  ["Funding/Salary/Benefit"]: string;
  Summary: string;
  ["Application Deadline"]: string;
  ["Target Sector/Beneficiaries"]: string;
  Eligibility: string;
  ["Geographic Focus"]: string;
  ["Consortium/Partnership Notes"]: string;
  ["Source Link"]: string;
  ["End Summary"]: string;
  Status: string;
  ["Date Added"]: string;
  ["Track (AI)"]: string;
  ["Track (Editor)"]: string;
  Notes: string;
};

interface OpportunitySearchProps {
    type: 'blueprint' | 'evidence';
    title: string;
    description: string;
    defaultPrompt: string;
    badgeText: string;
}

export const OpportunitySearch = ({ type, title, description, defaultPrompt, badgeText }: OpportunitySearchProps) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState(defaultPrompt);
  const [expireBy, setExpireBy] = useState("");
  const [searchResults, setSearchResults] = useState<Opportunity[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [pushing, setPushing] = useState(false);
  const [enriching, setEnriching] = useState(false);

  // Load saved results from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`opportunity-search-results-${type}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
            setSearchResults(parsed);
            setLogs([`Restored ${parsed.length} saved results from local storage.`]);
        }
      } catch (e) {
        console.error("Failed to parse saved results:", e);
      }
    }
  }, [type]);

  // Save results to localStorage whenever they update
  useEffect(() => {
    if (searchResults.length > 0) {
        localStorage.setItem(`opportunity-search-results-${type}`, JSON.stringify(searchResults));
    }
  }, [searchResults, type]);

  const toggleSelection = (idx: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedIndices(newSet);
  };

  const handlePushToAirtable = async () => {
    if (selectedIndices.size === 0) return;
    setPushing(true);
    
    const selectedOps = Array.from(selectedIndices).map(idx => searchResults[idx]);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "https://blueprint-hkk9.onrender.com");
      const response = await fetch(`${apiUrl}/api/push-to-airtable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunities: selectedOps })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Successfully pushed ${data.count} opportunities to Airtable!`);
        setSelectedIndices(new Set()); // Clear selection
      } else {
        const err = await response.json();
        alert(`Failed to push: ${err.details?.error?.message || err.error || "Unknown error"}`);
      }
    } catch (e) {
      alert("Error pushing to Airtable. Check console.");
      console.error(e);
    } finally {
      setPushing(false);
    }
  };

  const handleEnrichRecords = async () => {
    setEnriching(true);
    setLogs(prev => [...prev, "--- Starting manual enrichment pipeline ---"]);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "https://blueprint-hkk9.onrender.com");
      const response = await fetch(`${apiUrl}/api/process-airtable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      const data = await response.json();
      if (response.ok) {
        setLogs(prev => [...prev, `Enrichment complete: Processed ${data.processed} records, ${data.errors} errors.`]);
        alert(`Enrichment complete! Processed: ${data.processed}, Errors: ${data.errors}`);
      } else {
        setLogs(prev => [...prev, `Enrichment failed: ${data.error}`]);
        alert(`Enrichment failed: ${data.error}`);
      }
    } catch (e) {
      setLogs(prev => [...prev, "Error triggering enrichment. Check console."]);
      alert("Error triggering enrichment. Check console.");
      console.error(e);
    } finally {
      setEnriching(false);
    }
  };

  const performWebSearch = () => {
    setLoading(true);
    setLogs([]);
    setSearchResults([]);
    localStorage.removeItem(`opportunity-search-results-${type}`); // Clear old results on new search
    
    const queryParams = new URLSearchParams({
        query: customPrompt,
        expireBy: expireBy,
        type: type
    });
  
    const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "https://blueprint-hkk9.onrender.com");
    console.log(`Connecting to: ${apiUrl}/api/search?${queryParams.toString()}`);
    const eventSource = new EventSource(`${apiUrl}/api/search?${queryParams.toString()}`);

    eventSource.onmessage = (event) => {
        try {
            const parsed = JSON.parse(event.data);
            
            if (parsed.type === 'log') {
                setLogs(prev => [...prev, parsed.data]);
            } else if (parsed.type === 'progress') {
                setLogs(prev => [...prev, `Found ${parsed.data.found}/${parsed.data.target} verified opportunities...`]);
            } else if (parsed.type === 'complete') {
                const data = parsed.data;
                if (Array.isArray(data)) {
                    const newOps = data.map((op: any) => ({
                      "Opportunity Name": op["Opportunity Name"] || op.name || "NA",
                      "Sponsoring Organization/Funder": op["Sponsoring Organization/Funder"] || op.organization || "NA",
                      "Funding/Salary/Benefit": op["Funding/Salary/Benefit"] || op.funding || "NA",
                      Summary: op["Summary"] || op.focus || "NA",
                      "Application Deadline": op["Application Deadline"] || op.deadline || "NA",
                      "Target Sector/Beneficiaries": op["Target Sector/Beneficiaries"] || op.participants || "NA",
                      Eligibility: op["Eligibility"] || "NA",
                      "Geographic Focus": op["Geographic Focus"] || op.location || "NA",
                      "Consortium/Partnership Notes": op["Consortium/Partnership Notes"] || "NA",
                      "Source Link": op["Source Link"] || op.link || "#",
                      "End Summary": op["End Summary"] || op.reason || "NA",
                      Status: "Open",
                      "Date Added": new Date().toISOString(),
                      "Track (AI)": "",
                      "Track (Editor)": "",
                      Notes: "",
                    }));
                    
                    // Sort by deadline (ascending) to meet "ordered table" requirement
                    newOps.sort((a: any, b: any) => {
                        const dateA = new Date(a["Application Deadline"]);
                        const dateB = new Date(b["Application Deadline"]);
                        if (isNaN(dateA.getTime())) return 1; // Put invalid dates at the end
                        if (isNaN(dateB.getTime())) return -1;
                        return dateA.getTime() - dateB.getTime();
                    });

                    setSearchResults(newOps);
                }
                setLoading(false);
                eventSource.close();
            }
        } catch (e) {
            console.error("Error parsing SSE:", e);
        }
    };

    eventSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        eventSource.close();
        setLoading(false);
        setLogs(prev => [...prev, "Search completed or connection closed."]);
    };
  };

  const handleClearResults = () => {
    if (confirm("Are you sure you want to clear all results and reset the search?")) {
        setSearchResults([]);
        setLogs([]);
        setCustomPrompt(defaultPrompt);
        setExpireBy("");
        localStorage.removeItem(`opportunity-search-results-${type}`);
    }
  };

  return (
    <Card className="p-4 md:p-6 space-y-4 border-2 border-primary/20">
      <div className="flex flex-col md:flex-row justify-between items-start gap-2 md:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-serif text-primary">{title}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {description}
          </p>
        </div>
        <Badge variant="secondary" className="text-sm md:text-lg px-4 py-1 self-start md:self-auto">{badgeText}</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-2">
          <label className="text-sm font-medium mb-1 block">Custom Search Prompt</label>
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="min-h-[80px]"
            placeholder="Enter your search criteria..."
          />
        </div>
        <div className="col-span-1">
          <label className="text-sm font-medium mb-1 block">Deadline After (Earliest Date)</label>
          <Input
            type="date"
            value={expireBy}
            onChange={(e) => setExpireBy(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <Button 
            onClick={performWebSearch} 
            disabled={loading} 
            className="w-full md:w-auto md:flex-1 md:flex-none text-lg py-6"
        >
            {loading ? "Searching & Verifying..." : "Deep Search & Verify (AI)"}
        </Button>

        <Button 
            onClick={handleEnrichRecords}
            disabled={enriching}
            variant="outline"
            className="w-full md:w-auto text-lg py-6 border-2 border-primary/50 hover:bg-primary/10"
        >
            {enriching ? "Enriching..." : "Enrich Airtable Records"}
        </Button>

        {searchResults.length > 0 && (
            <Button 
                onClick={handleClearResults}
                variant="destructive"
                disabled={loading}
                className="w-full md:w-auto text-lg py-6"
            >
                Clear & Reset
            </Button>
        )}
      </div>

      {logs.length > 0 && (
        <div className="bg-slate-950 text-slate-50 p-4 rounded-md h-40 overflow-y-auto font-mono text-xs border border-slate-800 shadow-inner">
          {logs.map((log, i) => (
            <div key={i} className="mb-1 border-b border-slate-900 pb-1 last:border-0">{log}</div>
          ))}
          {loading && <div className="animate-pulse">_</div>}
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-xl font-semibold">Verified Results ({searchResults.length})</h3>
            <Button 
              onClick={handlePushToAirtable}
              disabled={selectedIndices.size === 0 || pushing}
              className="w-full md:w-auto bg-green-700 hover:bg-green-800 text-white font-bold text-lg px-8 py-6 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pushing ? "Pushing..." : `Push ${selectedIndices.size} to Airtable`}
            </Button>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Select</TableHead>
                  <TableHead className="min-w-[200px]">Opportunity Name</TableHead>
                  <TableHead className="min-w-[150px]">Sponsoring Organization/Funder</TableHead>
                  <TableHead className="min-w-[150px]">Funding/Salary/Benefit</TableHead>
                  <TableHead className="min-w-[300px]">Summary</TableHead>
                  <TableHead className="min-w-[120px]">Application Deadline</TableHead>
                  <TableHead className="min-w-[150px]">Target Sector/Beneficiaries</TableHead>
                  <TableHead className="min-w-[200px]">Eligibility</TableHead>
                  <TableHead className="min-w-[150px]">Geographic Focus</TableHead>
                  <TableHead className="min-w-[200px]">Consortium/Partnership Notes</TableHead>
                  <TableHead className="min-w-[100px]">Source Link</TableHead>
                  <TableHead className="min-w-[200px]">End Summary</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">Date Added</TableHead>
                  <TableHead className="min-w-[100px]">Track (AI)</TableHead>
                  <TableHead className="min-w-[100px]">Track (Editor)</TableHead>
                  <TableHead className="min-w-[200px]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((op, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIndices.has(i)}
                        onCheckedChange={() => toggleSelection(i)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{op["Opportunity Name"]}</TableCell>
                    <TableCell>{op["Sponsoring Organization/Funder"]}</TableCell>
                    <TableCell>{op["Funding/Salary/Benefit"]}</TableCell>
                    <TableCell className="text-sm">{op["Summary"]}</TableCell>
                    <TableCell>{op["Application Deadline"]}</TableCell>
                    <TableCell>{op["Target Sector/Beneficiaries"]}</TableCell>
                    <TableCell className="text-sm">{op["Eligibility"]}</TableCell>
                    <TableCell>{op["Geographic Focus"]}</TableCell>
                    <TableCell className="text-sm">{op["Consortium/Partnership Notes"]}</TableCell>
                    <TableCell>
                      <a href={op["Source Link"]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline whitespace-nowrap">
                        View Link
                      </a>
                    </TableCell>
                    <TableCell className="text-sm">{op["End Summary"]}</TableCell>
                    <TableCell>{op["Status"]}</TableCell>
                    <TableCell>{new Date(op["Date Added"]).toLocaleDateString()}</TableCell>
                    <TableCell>{op["Track (AI)"]}</TableCell>
                    <TableCell>{op["Track (Editor)"]}</TableCell>
                    <TableCell>{op["Notes"]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  );
};
