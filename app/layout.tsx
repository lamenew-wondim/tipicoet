import './globals.css';
import { Inter } from 'next/font/google';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import Link from 'next/link';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TIPICO - Football',
  description: 'Football Data Platform cloned matching ChampX',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <Header />

        <div className="app-wrapper">
          <nav className="slim-nav">
            <Link href="/" className="slim-icon active"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg></Link>
            <Link href="/live" className="slim-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></Link>
            <Link href="/fixtures" className="slim-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></Link>
            <Link href="/results" className="slim-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></Link>
          </nav>

          <Suspense fallback={<div className="sidebar-loader"></div>}>
            <Sidebar />
          </Suspense>

          <main className="main-content">
            {children}
          </main>

          <aside className="right-panel">
            <div className="betslip-tabs">
              <div className="betslip-tab active">Ordinary</div>
              <div className="betslip-tab">Express</div>
              <div className="betslip-tab">System</div>
            </div>
            <div className="betslip-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.5, marginBottom: 16 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <p>Your bet slip is empty</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>Please select odds to start viewing selections.</p>
            </div>
            <div style={{ padding: 24, marginTop: 'auto' }}>
              <button disabled style={{ width: '100%', padding: '16px', background: 'var(--bg-card)', color: 'var(--text-muted)', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '16px' }}>
                Make bet
              </button>
            </div>
          </aside>
        </div>

        <BottomNav />
      </body>
    </html>
  );
}
