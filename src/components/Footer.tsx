const navigation = {
  resources: [
    { name: "Opportunities", href: "#opportunities" },
    { name: "Research", href: "#research" },
    { name: "Programs", href: "#programs" },
    { name: "Tools", href: "#tools" },
  ],
  organization: [
    { name: "About Us", href: "#about" },
    { name: "Our Team", href: "#team" },
    { name: "Partners", href: "#partners" },
    { name: "Contact", href: "#contact" },
  ],
  legal: [
    { name: "Privacy Policy", href: "#privacy" },
    { name: "Terms of Use", href: "#terms" },
    { name: "Accessibility", href: "#accessibility" },
  ],
};

const Footer = () => {
  return (
    <footer className="py-16 md:py-20 bg-primary text-primary-foreground">
      <div className="section-container">
        {/* Main Footer Content */}
        <div className="grid gap-12 md:grid-cols-12 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-4">
            <a href="/" className="inline-block mb-4">
              <span className="font-serif text-2xl font-bold">
                Media<span className="text-accent">Lab</span>
              </span>
            </a>
            <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-xs">
              A nonprofit initiative dedicated to advancing journalism through 
              research, innovation, and collaboration with media professionals worldwide.
            </p>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-8">
            <div className="grid gap-8 sm:grid-cols-3">
              {/* Resources */}
              <div>
                <h4 className="text-sm font-semibold font-sans mb-4 text-primary-foreground/90">
                  Resources
                </h4>
                <ul className="space-y-3">
                  {navigation.resources.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm text-primary-foreground/60 hover:text-primary-foreground 
                                   transition-colors duration-200"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Organization */}
              <div>
                <h4 className="text-sm font-semibold font-sans mb-4 text-primary-foreground/90">
                  Organization
                </h4>
                <ul className="space-y-3">
                  {navigation.organization.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm text-primary-foreground/60 hover:text-primary-foreground 
                                   transition-colors duration-200"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="text-sm font-semibold font-sans mb-4 text-primary-foreground/90">
                  Legal
                </h4>
                <ul className="space-y-3">
                  {navigation.legal.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-sm text-primary-foreground/60 hover:text-primary-foreground 
                                   transition-colors duration-200"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary-foreground/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-primary-foreground/50">
              © 2026 MediaLab. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a
                href="#twitter"
                className="text-xs text-primary-foreground/50 hover:text-primary-foreground transition-colors"
              >
                Twitter
              </a>
              <a
                href="#linkedin"
                className="text-xs text-primary-foreground/50 hover:text-primary-foreground transition-colors"
              >
                LinkedIn
              </a>
              <a
                href="#rss"
                className="text-xs text-primary-foreground/50 hover:text-primary-foreground transition-colors"
              >
                RSS
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
