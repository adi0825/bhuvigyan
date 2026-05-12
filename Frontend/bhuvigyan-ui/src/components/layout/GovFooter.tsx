import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Youtube, ExternalLink } from 'lucide-react';

export default function GovFooter() {
  return (
    <footer className="bg-primary text-white pt-12 pb-6 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* LEFT COL */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/images/bhuvigyan-logo.svg" alt="L" className="w-10 h-10 brightness-0 invert" />
              <span className="font-bold text-2xl tracking-tight">Bhuvigyan</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs italic">
              "Securing India's Agrarian Future through Technology and AI-Driven Insurance Solutions."
            </p>
          </div>

          {/* CENTER COL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3 text-sm">
              <h4 className="font-bold uppercase tracking-wider text-xs text-white/50 mb-1">Navigation</h4>
              <Link to="/about" className="hover:underline underline-offset-4">About Portal</Link>
              <Link to="/pmfby" className="hover:underline underline-offset-4">PMFBY Guidelines</Link>
              <Link to="/help" className="hover:underline underline-offset-4">Help Center</Link>
              <Link to="/contact" className="hover:underline underline-offset-4">Contact Us</Link>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <h4 className="font-bold uppercase tracking-wider text-xs text-white/50 mb-1">Citizen Services</h4>
              <a href="#" className="hover:underline underline-offset-4 flex items-center gap-1">RTI <ExternalLink size={12} /></a>
              <a href="#" className="hover:underline underline-offset-4">Public Grievance</a>
              <a href="#" className="hover:underline underline-offset-4">Privacy Policy</a>
              <a href="#" className="hover:underline underline-offset-4">Terms of Use</a>
            </div>
          </div>

          {/* RIGHT COL */}
          <div className="space-y-6 md:text-right">
            <div>
              <h4 className="font-bold uppercase tracking-wider text-xs text-white/50 mb-3">Connect With Us</h4>
              <div className="flex gap-4 md:justify-end">
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Facebook size={20} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Twitter size={20} />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Youtube size={20} />
                </a>
              </div>
            </div>
            <p className="text-white/50 text-[11px] font-medium uppercase tracking-[0.2em]">
              Follow us for latest agricultural updates
            </p>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[12px] text-white/60">
          <div className="text-center md:text-left">
            <p>© 2026 Bhuvigyan | Ministry of Agriculture & Farmers Welfare, Government of India</p>
          </div>
          <div className="text-center md:text-right space-y-1">
            <p>Designed & Developed by National Informatics Centre (NIC)</p>
            <p className="text-white/30 text-[10px]">Best viewed in Chrome 120+ | Screen Reader Accessible</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
