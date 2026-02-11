import React from "react";
// import { Menu, X } from "lucide-react"; // Unused now

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <nav className="section-container px-4" aria-label="Main navigation">
        <div className="flex items-center justify-between h-14 md:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <span className="font-serif text-lg md:text-2xl font-bold text-foreground">
              Media<span className="text-accent">Lab</span>
            </span>
          </a>
        </div>
      </nav>
    </header>
  );
};

export default Header;
