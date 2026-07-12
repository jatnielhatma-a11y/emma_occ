import Link from 'next/link';
import OccDashboard from '@/components/OccDashboard';

export default function Home() {
  return (
    <>
      <OccDashboard />
      <Link
        href="/translate"
        className="connect-google"
        style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 20, boxShadow: '0 12px 30px rgba(0,0,0,.25)' }}
      >
        🇨🇼 Open NOVA Translate Lab
      </Link>
    </>
  );
}
