const Footer = () => {
  return (
    <footer className="py-8 bg-primary text-primary-foreground">
      <div className="section-container">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl font-bold">
              Media<span className="text-accent">Lab</span>
            </span>
            <p className="text-sm text-primary-foreground/70 ml-4">
              AI Opportunity Finder
            </p>
          </div>
          
          <p className="text-xs text-primary-foreground/50">
            © 2026 MediaLab. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
