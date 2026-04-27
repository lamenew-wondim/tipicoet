'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [pendingDepositsCount, setPendingDepositsCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'admin') {
      router.push('/');
    }
    fetchPendingCount();
  }, [router]);

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/admin/deposits/count');
      const data = await res.json();
      if (data.success) setPendingDepositsCount(data.count);
    } catch (err) {
      console.error('Count error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_uid');
    localStorage.removeItem('user_phone');
    // Use window.location.href to force a full reload and reset Header state
    window.location.href = '/';
  };

  const adminButtons = [
    { label: 'Deposit', icon: '💰', color: '#4caf50', hasBadge: true },
    { label: 'Withdrawal', icon: '🏧', color: '#2196f3' },
    { label: 'Tickets', icon: '🎫', color: '#ffc107' },
    { label: 'Create Bet', icon: '📝', color: '#9c27b0' },
    { label: 'Users', icon: '👥', color: '#673ab7' },
    { label: 'Withdrawal M', icon: '💳', color: '#e91e63' },
    { label: 'Deposit M', icon: '💸', color: '#00bcd4' },
    { label: 'Logout', icon: '🚪', color: '#ff4444' },
  ];

  return (
    <div className="admin-dashboard-overlay">
      <div className="admin-container">
        <div className="admin-grid">
          {adminButtons.map((btn, i) => (
            <div 
              key={i} 
              className="admin-tile"
              onClick={() => {
                if (btn.label === 'Deposit') router.push('/admin/deposits');
                if (btn.label === 'Deposit M') router.push('/admin/deposit-m');
                if (btn.label === 'Withdrawal M') router.push('/admin/withdrawal-m');
                if (btn.label === 'Logout') handleLogout();
              }}
            >
              <div className="tile-icon-wrapper">
                <div className="tile-icon" style={{ background: `${btn.color}20`, color: btn.color }}>
                  <span>{btn.icon}</span>
                </div>
                {btn.hasBadge && pendingDepositsCount > 0 && (
                  <div className="tile-badge">{pendingDepositsCount}</div>
                )}
              </div>
              <span className="tile-label">{btn.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .admin-dashboard-overlay {
          position: fixed;
          inset: 0;
          background: #f4f7fe;
          z-index: 20000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 40px 16px;
          overflow-y: auto;
        }
        .admin-container {
          width: 100%;
          max-width: 480px;
        }
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .admin-tile {
          background: #fff;
          border-radius: 20px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
          border: 1px solid #fff;
          min-height: 120px;
        }
        .admin-tile:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.06);
          border-color: #eee;
        }
        .tile-icon-wrapper {
          position: relative;
        }
        .tile-icon {
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        .tile-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #2196f3;
          color: white;
          min-width: 22px;
          height: 22px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          border: 2px solid #fff;
          padding: 0 4px;
        }
        .tile-label {
          font-size: 15px;
          font-weight: 700;
          color: #333;
        }
      `}</style>
    </div>
  );
}
