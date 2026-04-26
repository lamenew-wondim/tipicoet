'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role === 'admin') {
      setIsAdmin(true);
      setLoading(false);
    } else {
      router.push('/');
    }
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0e0e0e', color: 'white' }}>
        <h2>Verifying Admin Status...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', background: '#f4f7fe', minHeight: '100vh', color: '#333' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '24px' }}>Admin Dashboard</h1>
        <div style={{ background: 'white', padding: '32px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
          <h3>Welcome to the Admin Panel</h3>
          <p>This page is only accessible to administrators.</p>
          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#f4f7fe', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Users</div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>-</div>
            </div>
            <div style={{ background: '#f4f7fe', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Total Bets</div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>-</div>
            </div>
            <div style={{ background: '#f4f7fe', padding: '20px', borderRadius: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Revenue</div>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>-</div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_role');
            window.location.href = '/';
          }}
          style={{ marginTop: '24px', background: '#333', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
