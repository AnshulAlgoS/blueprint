import { Lightbulb, Wrench, BookOpen, Users } from "lucide-react";

const categories = [
  {
    icon: Lightbulb,
    name: "Innovation",
    description: "New approaches to storytelling, revenue models, and audience engagement that are reshaping modern journalism.",
    count: 24,
  },
  {
    icon: Wrench,
    name: "Tools & Technology",
    description: "Open-source software, platforms, and technical resources built specifically for newsroom needs.",
    count: 18,
  },
  {
    icon: BookOpen,
    name: "Research",
    description: "Academic studies, white papers, and data-driven insights on the state of media and public trust.",
    count: 42,
  },
  {
    icon: Users,
    name: "Programs",
    description: "Fellowships, training institutes, and collaborative initiatives for journalism professionals at every stage.",
    count: 31,
  },
];

const Categories = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="section-container">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          <p className="category-tag mb-2">Explore</p>
          <h2 className="mb-4">Resources by Theme</h2>
          <p className="text-muted-foreground">
            Curated collections of opportunities, research, and tools organized 
            by the topics that matter most to media innovators.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <a
                key={category.name}
                href={`#${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="group block p-6 border border-border rounded-sm 
                           bg-background hover:border-muted-foreground/30 
                           hover:shadow-sm transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Icon */}
                <div className="w-10 h-10 flex items-center justify-center 
                                bg-secondary rounded-sm mb-4
                                group-hover:bg-accent/10 transition-colors duration-300">
                  <Icon className="h-5 w-5 text-accent" />
                </div>

                {/* Name */}
                <h4 className="mb-2 group-hover:text-accent transition-colors duration-200">
                  {category.name}
                </h4>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {category.description}
                </p>

                {/* Count */}
                <span className="text-xs font-medium text-muted-foreground">
                  {category.count} resources
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
