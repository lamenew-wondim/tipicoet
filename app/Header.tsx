'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthModal from './AuthModal';
import SettingsModal from './SettingsModal';

export default function Header() {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'login' | 'register' }>({
    isOpen: false,
    mode: 'login'
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);

    const onOpenDrawer = () => setDrawerOpen(true);
    const onOpenAuth = (e: Event) => {
      const customEvent = e as CustomEvent;
      setAuthModal({ isOpen: true, mode: customEvent.detail || 'login' });
    };

    window.addEventListener('open-mobile-drawer', onOpenDrawer);
    window.addEventListener('open-auth-modal', onOpenAuth);
    
    const onOpenSettings = () => setShowSettings(true);
    window.addEventListener('open-settings-modal', onOpenSettings);
    
    // Also listen to storage changes for auth token to sync state
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('auth_token'));
    };
    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab login updates
    window.addEventListener('auth-state-changed', handleStorageChange);

    return () => {
      window.removeEventListener('open-mobile-drawer', onOpenDrawer);
      window.removeEventListener('open-auth-modal', onOpenAuth);
      window.removeEventListener('open-settings-modal', onOpenSettings);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-state-changed', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    window.location.reload();
  };

  // Dynamic balance simulation (would be from state/API)
  const currentBalance = "0.00 Birr";
  
  const getBalanceStyle = (text: string) => {
    const len = text.length;
    if (len > 22) return { fontSize: '10px' };
    if (len > 18) return { fontSize: '12px' };
    if (len > 14) return { fontSize: '14px' };
    return {};
  };

  return (
    <>
      <header className="topbar" style={{ zIndex: 100 }}>
        <div className="topbar-left">
          <div className="top-menu-btn" style={{ cursor: 'pointer', padding: 8 }} onClick={() => setDrawerOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </div>
          <Link href="/" className="logo-text">
            TIPICO
          </Link>
        </div>

        <div className="topbar-right">
          {isLoggedIn ? (
            <div className="logged-in-container">
              <div className="balance-section">
                <div className="balance-label">Balance</div>
                <div className="balance-amount" style={getBalanceStyle(currentBalance)}>{currentBalance}</div>
              </div>

              <div className="user-profile-trigger"
                onMouseEnter={() => setShowUserMenu(true)}
                onMouseLeave={() => setShowUserMenu(false)}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="user-avatar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" /></svg>

                {showUserMenu && (
                  <div className="user-dropdown-menu">
                    <div className="dropdown-item" onClick={() => router.push('/deposit')}>Deposit</div>
                    <div className="dropdown-item">Withdrawal</div>
                    <Link href="/results" className="dropdown-item">Bet History</Link>
                    <div className="dropdown-item">Betslip check</div>
                    <div className="dropdown-item">Transaction History</div>
                     <div className="dropdown-item" onClick={() => setShowSettings(true)}>Account settings</div>
                    <div className="dropdown-item logout" onClick={handleLogout}>Log out</div>
                  </div>
                )}
              </div>

              <button className="btn-primary deposit-btn" onClick={() => router.push('/deposit')}>Deposit</button>
            </div>
          ) : (
            <>
              <button onClick={() => setAuthModal({ isOpen: true, mode: 'login' })} className="btn-secondary">Log In</button>
              <button onClick={() => setAuthModal({ isOpen: true, mode: 'register' })} className="btn-primary">Sign Up</button>
            </>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        initialMode={authModal.mode}
      />
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
