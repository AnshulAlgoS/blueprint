import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeaturedOpportunities from "@/components/FeaturedOpportunities";
import Categories from "@/components/Categories";
import LatestResearch from "@/components/LatestResearch";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <FeaturedOpportunities />
        <Categories />
        <LatestResearch />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
