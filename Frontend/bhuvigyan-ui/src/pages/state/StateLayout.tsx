import { Outlet } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import GovFooter from '../../components/layout/GovFooter';
import GovStrip from '../../components/layout/GovStrip';
import PageBackground from '../../components/layout/PageBackground';

export default function StateLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <PageBackground />
      <GovStrip />
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full relative z-10">
        <Outlet />
      </main>
      <GovFooter />
    </div>
  );
}