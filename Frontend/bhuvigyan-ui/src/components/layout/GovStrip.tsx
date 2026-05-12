import React from 'react';

export default function GovStrip() {
  const toggleLanguage = (lang: string) => {
    document.documentElement.lang = lang;
    localStorage.setItem('bhuvigyan_lang', lang);
    window.location.reload(); // Simple reload to apply language changes if needed
  };

  return (
    <div className="h-10 bg-primary w-full fixed top-0 left-0 z-[60] flex justify-between items-center px-4 shadow-md">
      <div className="flex items-center gap-3">
        <img src="/images/ashoka-chakra.svg" alt="GoI" className="w-6 h-6" />
        <div className="flex items-center gap-2 text-white">
          <span className="text-[12px] font-bold uppercase tracking-wider">Government of India</span>
          <span className="text-white/40 text-[12px]">|</span>
          <span className="text-[11px] text-white/80 font-medium">Ministry of Agriculture & Farmers Welfare</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-white">
        <a href="#main-content" className="text-[11px] hover:underline underline-offset-4">Skip to main content</a>
        <span className="text-white/40 text-[11px]">|</span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => toggleLanguage('hi')}
            className="text-[11px] hover:text-secondary transition-colors font-deva"
          >
            हिंदी
          </button>
          <span className="text-white/40">|</span>
          <button 
            onClick={() => toggleLanguage('en')}
            className="text-[11px] hover:text-secondary transition-colors"
          >
            EN
          </button>
        </div>
      </div>
    </div>
  );
}
