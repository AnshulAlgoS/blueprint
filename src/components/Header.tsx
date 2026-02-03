import { useState } from "react";
import { Menu, X } from "lucide-react";

const navigation = [
  { name: "Opportunities", href: "#opportunities" },
  { name: "Research", href: "#research" },
  { name: "Programs", href: "#programs" },
  { name: "About", href: "#about" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <nav className="section-container" aria-label="Main navigation">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <span className="font-serif text-xl md:text-2xl font-bold text-foreground">
              Media<span className="text-accent">Lab</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {item.name}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="#subscribe"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors duration-200"
            >
              Subscribe
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
          >
            <span className="sr-only">Toggle menu</span>
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <a
                href="#subscribe"
                className="text-base font-medium text-accent hover:text-accent/80 transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Subscribe
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
