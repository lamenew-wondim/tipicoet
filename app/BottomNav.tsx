'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Sports',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2v20M2 12h20"></path>
        </svg>
      ),
      href: '#',
      isMenu: true
    },
    {
      label: 'Live',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      ),
      href: '/live'
    },
    {
      label: 'Deposit',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"></rect>
          <line x1="2" y1="10" x2="22" y2="10"></line>
          <circle cx="17" cy="14" r="1"></circle>
        </svg>
      ),
      href: '/login'
    }
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item, idx) => {
        const isActive = pathname === item.href;

        if (item.isMenu) {
          return (
            <button
              key={idx}
              type="button"
              className="bottom-nav-item"
              onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-drawer'))}
            >
              <div className="bottom-nav-icon">{item.icon}</div>
              <span className="bottom-nav-label">{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={idx}
            href={item.href}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="bottom-nav-icon">{item.icon}</div>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
