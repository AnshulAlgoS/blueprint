import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="py-16 md:py-24 lg:py-32">
      <div className="section-container">
        <div className="max-w-4xl">
          {/* Eyebrow */}
          <p className="category-tag mb-6">
            Journalism & Media Innovation
          </p>

          {/* Main Headline */}
          <h1 className="text-balance mb-6">
            Advancing the future of journalism through research, tools, and collaboration
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10">
            We connect journalists, researchers, and innovators with the resources 
            they need to strengthen public interest media and build sustainable 
            newsrooms for the digital age.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#opportunities"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 
                         bg-primary text-primary-foreground font-medium text-sm
                         rounded-sm hover:bg-primary/90 transition-colors duration-200"
            >
              Explore Opportunities
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#about"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 
                         border border-border text-foreground font-medium text-sm
                         rounded-sm hover:bg-secondary transition-colors duration-200"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
