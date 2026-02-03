import { useState } from "react";
import { ArrowRight } from "lucide-react";

const Newsletter = () => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter signup
    console.log("Newsletter signup:", email);
    setEmail("");
  };

  return (
    <section id="subscribe" className="py-16 md:py-24">
      <div className="section-container">
        <div className="max-w-2xl mx-auto text-center">
          {/* Content */}
          <p className="category-tag mb-4">Stay Informed</p>
          <h2 className="mb-4">The Weekly Digest</h2>
          <p className="text-muted-foreground mb-8">
            A curated summary of the latest opportunities, research, and insights 
            in journalism innovation — delivered every Tuesday.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 px-4 py-3 text-sm bg-background border border-border 
                         rounded-sm placeholder:text-muted-foreground
                         focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent
                         transition-colors duration-200"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 
                         bg-primary text-primary-foreground font-medium text-sm
                         rounded-sm hover:bg-primary/90 transition-colors duration-200
                         whitespace-nowrap"
            >
              Subscribe
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="text-xs text-muted-foreground mt-4">
            No spam, unsubscribe anytime. Read our{" "}
            <a href="#privacy" className="underline hover:text-foreground transition-colors">
              privacy policy
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
