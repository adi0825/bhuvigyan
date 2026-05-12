import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Building2, User, ClipboardList, Building, MapPin } from 'lucide-react';
import GovCard from '../../components/ui/GovCard';
import PageBackground from '../../components/layout/PageBackground';
import GovStrip from '../../components/layout/GovStrip';
import Navbar from '../../components/layout/Navbar';
import GovFooter from '../../components/layout/GovFooter';

export default function LoginSelector() {
  const cards = [
    { icon: User, title: 'Farmer Portal', description: 'Check claims, carbon credits, land records', path: '/login/farmer', color: 'green' },
    { icon: Building2, title: 'Admin Portal', description: 'Manage claims, fraud detection, analytics', path: '/login/admin', color: 'blue' },
    { icon: Users, title: 'CSC Centre', description: 'Register farmers, manage operators', path: '/login/csc', color: 'orange' },
    { icon: ClipboardList, title: 'Field Officer / Inspector', description: 'CCE inspections, field visits & claim verification', path: '/login/officer', color: 'blue' },
    { icon: Building, title: 'Insurer Portal', description: 'Approve claims, track settlements', path: '/login/insurer', color: 'green' },
    { icon: MapPin, title: 'State Head / DC', description: 'FIR alerts, VAO alerts, district dashboard', path: '/login/state', color: 'amber' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <PageBackground />
      <GovStrip />
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-[#1a1a1a] mb-3">Select Your Portal</h1>
            <p className="text-[#6b7280]">Choose your role to access the Bhuvigyan platform</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {cards.map((card, i) => (
              <motion.div key={card.path} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={card.path}>
                  <GovCard leftBorder={card.color as any} className="p-6 text-center hover:shadow-lg">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                      card.color === 'green' ? 'bg-[#d1fae5]' :
                      card.color === 'blue' ? 'bg-[#dbeafe]' :
                      card.color === 'orange' ? 'bg-[#ffedd5]' : 'bg-[#fef3c7]'
                    }`}>
                      <card.icon size={24} className="text-primary" />
                    </div>
                    <h3 className="text-[15px] font-bold text-[#1a1a1a] mb-1">{card.title}</h3>
                    <p className="text-[12px] text-[#6b7280]">{card.description}</p>
                  </GovCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
      <GovFooter />
    </div>
  );
}
