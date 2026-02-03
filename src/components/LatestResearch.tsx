import { ArrowUpRight } from "lucide-react";

const articles = [
  {
    id: 1,
    category: "Report",
    title: "The State of Local News 2026",
    excerpt: "Our annual analysis reveals significant shifts in local news sustainability, with collaborative models showing the strongest growth amid continued challenges.",
    date: "January 28, 2026",
    readTime: "12 min read",
  },
  {
    id: 2,
    category: "Analysis",
    title: "How Newsrooms Are Adopting AI Responsibly",
    excerpt: "A survey of 200+ news organizations examines the policies, practices, and ethical frameworks guiding artificial intelligence implementation.",
    date: "January 22, 2026",
    readTime: "8 min read",
  },
  {
    id: 3,
    category: "Case Study",
    title: "Building Trust Through Transparency",
    excerpt: "Three regional newspapers share their approaches to editorial transparency and the measurable impact on reader engagement and subscriptions.",
    date: "January 15, 2026",
    readTime: "6 min read",
  },
];

const LatestResearch = () => {
  return (
    <section id="research" className="py-16 md:py-24 bg-secondary/30">
      <div className="section-container">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <p className="category-tag mb-2">Research & Insights</p>
            <h2>Latest Publications</h2>
          </div>
          <a
            href="#all-research"
            className="text-sm font-medium text-accent hover:text-accent/80 
                       inline-flex items-center gap-1 transition-colors duration-200"
          >
            Browse all research
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        {/* Articles List */}
        <div className="space-y-0 divide-y divide-border">
          {articles.map((article) => (
            <article
              key={article.id}
              className="group py-8 first:pt-0 last:pb-0 cursor-pointer"
            >
              <div className="grid md:grid-cols-12 gap-4 md:gap-8">
                {/* Meta Column */}
                <div className="md:col-span-3">
                  <span className="category-tag text-accent/80 block mb-1">
                    {article.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {article.date}
                  </span>
                </div>

                {/* Content Column */}
                <div className="md:col-span-9">
                  <h3 className="mb-3 group-hover:text-accent transition-colors duration-200">
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    {article.excerpt}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {article.readTime}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestResearch;
