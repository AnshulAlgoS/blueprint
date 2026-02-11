import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OpportunitySearch } from "@/components/OpportunitySearch";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 section-container py-10 space-y-12">
        {/* Section: Blueprint Opportunity Finder */}
        <OpportunitySearch 
            type="blueprint"
            title="Blueprint Opportunity Finder"
            description="Search the live web for new Blueprint opportunities (Product/Service Design) and verify them with AI."
            defaultPrompt="Find journalism product grants in Europe for 2025"
            badgeText="Blueprint AI"
        />

        {/* Section: Evidence Opportunity Finder */}
        <OpportunitySearch 
            type="evidence"
            title="Evidence Opportunity Finder"
            description="Search for Investigative Journalism, OSINT, and Data Journalism opportunities."
            defaultPrompt="Find investigative journalism grants and OSINT fellowships for 2025"
            badgeText="Evidence AI"
        />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
