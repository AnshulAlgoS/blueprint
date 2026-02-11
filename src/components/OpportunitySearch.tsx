import { useState } from "react";
import { Input } from "@/components/ui/input";
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
      const response = await fetch("http://localhost:3001/api/push-to-airtable", {
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

  const performWebSearch = () => {
    setLoading(true);
    setLogs([]);
    setSearchResults([]);
    
    const queryParams = new URLSearchParams({
        query: customPrompt,
        expireBy: expireBy,
        type: type
    });

    const eventSource = new EventSource(`http://localhost:3001/api/search?${queryParams.toString()}`);

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

  return (
    <Card className="p-6 space-y-4 border-2 border-primary/20">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-serif text-primary">{title}</h1>
          <p className="text-muted-foreground">
            {description}
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-1">{badgeText}</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium mb-1 block">Custom Search Prompt</label>
          <Input
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Deadline After (Earliest Date)</label>
          <Input
            type="date"
            value={expireBy}
            onChange={(e) => setExpireBy(e.target.value)}
          />
        </div>
      </div>
      
      <Button 
        onClick={performWebSearch} 
        disabled={loading} 
        className="w-full md:w-auto text-lg py-6"
      >
        {loading ? "Searching & Verifying..." : "Deep Search & Verify (AI)"}
      </Button>

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
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Verified Results ({searchResults.length})</h3>
            <Button 
              onClick={handlePushToAirtable}
              disabled={selectedIndices.size === 0 || pushing}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              {pushing ? "Pushing..." : `Push ${selectedIndices.size} to Airtable`}
            </Button>
          </div>

          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Select</TableHead>
                  <TableHead>Opportunity Name</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Link</TableHead>
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
                    <TableCell>{op["Application Deadline"]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{op["Summary"]}</TableCell>
                    <TableCell>
                      <a href={op["Source Link"]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        View
                      </a>
                    </TableCell>
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
