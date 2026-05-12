import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Users, Building2, ArrowRight, Satellite, Brain, MapPin, Zap, Smartphone, Shield, BarChart3, Activity } from 'lucide-react';
import CountUpNumber from '../components/ui/CountUpNumber';
import GovCard from '../components/ui/GovCard';
import GovButton from '../components/ui/GovButton';
import GovStrip from '../components/layout/GovStrip';
import Navbar from '../components/layout/Navbar';
import GovFooter from '../components/layout/GovFooter';

const features = [
  {
    icon: Satellite,
    title: 'Satellite NDVI Monitoring',
    description: 'Real-time crop health monitoring from Sentinel-2 satellites with sub-metre resolution.',
  },
  {
    icon: Brain,
    title: 'AI Fraud Detection',
    description: 'ML-powered anomaly scoring with 99.2% accuracy in identifying fraudulent claims.',
  },
  {
    icon: Leaf,
    title: 'Carbon Credits',
    description: 'Direct PMFBY-linked carbon sequestration programme for regenerative farming.',
  },
  {
    icon: MapPin,
    title: 'Land Records',
    description: 'Live KGIS + BHOOMI integration for instant land ownership verification.',
  },
  {
    icon: Zap,
    title: 'Real-time Processing',
    description: 'Advanced automated claims settlement engine reducing turnaround time to 72 hours.',
  },
  {
    icon: Smartphone,
    title: 'Vernacular Support',
    description: 'Full multi-language support (English/Hindi/Regional) for 150M+ Indian farmers.',
  },
];

const steps = [
  { step: 1, title: 'Register via CSC', desc: 'Visit nearest Common Service Centre' },
  { step: 2, title: 'Land Verified', desc: 'Auto KGIS + BHOOMI mapping' },
  { step: 3, title: 'Satellite Monitoring', desc: 'Automated NDVI verification' },
  { step: 4, title: 'AI Decision', desc: 'Instant claim/credit approval' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <GovStrip />
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Background Image (40% opacity) */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ 
            backgroundImage: "url('/images/crop-field.jpg')",
            opacity: 0.4
          }}
        />
        {/* White Gradient Overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-white via-white/95 to-transparent md:w-[70%]" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-20 w-full pt-12">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f0fdf4] border border-[#bbf7d0] rounded-full text-[#1a6b3c] text-xs font-bold uppercase tracking-wider">
                🇮🇳 Pradhan Mantri Fasal Bima Yojana
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-[#1a1a1a] leading-tight">
                Bhuvigyan
              </h1>
              <h2 className="text-2xl md:text-3xl font-bold text-primary leading-tight">
                AI-Powered Crop Insurance & Carbon Credit Platform
              </h2>
              <p className="text-lg text-[#6b7280] leading-relaxed">
                Protecting India's 150M farmers with state-of-the-art satellite verification, 
                AI-driven fraud detection, and direct carbon credit incentives.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/login/farmer">
                  <GovButton size="lg" className="h-[56px] px-10 text-lg">
                    Farmer Login
                  </GovButton>
                </Link>
                <Link to="/about">
                  <GovButton variant="outline" size="lg" className="h-[56px] px-10 text-lg">
                    Learn More
                  </GovButton>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* IMPACT STATS */}
      <section className="py-16 bg-white border-y border-[#f3f4f6]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { value: 14700000, suffix: 'Cr+', label: 'Farmers Protected', divisor: 10000000 },
              { value: 4800, prefix: '₹', suffix: ' Cr', label: 'Claims Disbursed' },
              { value: 99.2, suffix: '%', label: 'Detection Accuracy' },
              { value: 9, suffix: '', label: 'States Active' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-[32px] md:text-[42px] font-black text-primary mb-1">
                  {stat.prefix}
                  <CountUpNumber end={stat.divisor ? stat.value / stat.divisor : stat.value} duration={2000} decimals={stat.divisor ? 2 : 0} />
                  {stat.suffix}
                </p>
                <p className="text-[13px] font-bold text-[#6b7280] uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-[#f0fdf4]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-[32px] font-black text-[#1a1a1a] mb-16">How Bhuvigyan Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-[2px] bg-[#d1fae5] -translate-y-12" />
            
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative z-10 group"
              >
                <GovCard className="p-6 h-full text-center bg-white border border-[#e5e7eb] group-hover:border-primary transition-all">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-black shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                    {step.step}
                  </div>
                  <h4 className="text-[16px] font-bold text-[#1a1a1a] mb-3">{step.title}</h4>
                  <p className="text-[13px] text-[#6b7280] leading-relaxed">{step.desc}</p>
                </GovCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-[32px] font-black text-[#1a1a1a] mb-4">Integrated Ecosystem</h2>
            <p className="text-[#6b7280]">Combining government infrastructure with cutting-edge artificial intelligence.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <GovCard key={i} topBorder="green" className="p-8">
                <div className="w-12 h-12 bg-[#f0fdf4] rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="text-primary" size={28} />
                </div>
                <h3 className="text-[18px] font-bold text-[#1a1a1a] mb-3">{feature.title}</h3>
                <p className="text-[14px] text-[#6b7280] leading-relaxed">{feature.description}</p>
              </GovCard>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNERS */}
      <section className="py-16 bg-[#f9fafb] border-y border-[#f3f4f6]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-[0.3em] mb-10">Technology & Infrastructure Partners</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 hover:opacity-100 transition-opacity duration-500">
            {['ISRO', 'KGIS', 'NIC', 'PMFBY', 'DigiLocker', 'KSRSAC'].map(partner => (
              <span key={partner} className="text-xl font-black text-[#1a1a1a] tracking-tighter italic">{partner}</span>
            ))}
          </div>
        </div>
      </section>

      <GovFooter />
    </div>
  );
}