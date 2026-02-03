import { ArrowUpRight, Calendar, MapPin } from "lucide-react";

const opportunities = [
  {
    id: 1,
    category: "Fellowship",
    title: "Knight-Wallace Reporting Fellowship",
    description: "A year-long residential program at the University of Michigan for mid-career journalists to pursue independent study and professional development.",
    location: "Ann Arbor, MI",
    deadline: "February 1, 2026",
    featured: true,
  },
  {
    id: 2,
    category: "Grant",
    title: "Innovation in Local News Fund",
    description: "Grants of up to $150,000 for projects that develop new approaches to sustainable local journalism and community engagement.",
    location: "Remote",
    deadline: "Rolling Deadline",
    featured: true,
  },
  {
    id: 3,
    category: "Program",
    title: "AI & Journalism Summer Institute",
    description: "An intensive two-week program exploring the ethical application of artificial intelligence in newsroom workflows and investigative reporting.",
    location: "Boston, MA",
    deadline: "April 15, 2026",
    featured: false,
  },
  {
    id: 4,
    category: "Research",
    title: "Media Trust & Credibility Study",
    description: "Seeking research partners for a multi-year study examining factors that influence public trust in news organizations across demographics.",
    location: "Virtual",
    deadline: "March 30, 2026",
    featured: false,
  },
];

const FeaturedOpportunities = () => {
  return (
    <section id="opportunities" className="py-16 md:py-24 bg-secondary/30">
      <div className="section-container">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <p className="category-tag mb-2">Opportunities</p>
            <h2>Featured Programs & Grants</h2>
          </div>
          <a
            href="#all-opportunities"
            className="text-sm font-medium text-accent hover:text-accent/80 
                       inline-flex items-center gap-1 transition-colors duration-200"
          >
            View all opportunities
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        {/* Opportunities Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {opportunities.map((opportunity, index) => (
            <article
              key={opportunity.id}
              className="editorial-card group cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Category Tag */}
              <span className="category-tag text-accent/80">
                {opportunity.category}
              </span>

              {/* Title */}
              <h3 className="mt-3 mb-3 group-hover:text-accent transition-colors duration-200">
                {opportunity.title}
              </h3>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                {opportunity.description}
              </p>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {opportunity.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {opportunity.deadline}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedOpportunities;
