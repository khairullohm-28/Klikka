import React, { useState, useEffect } from 'react';
import { 
  Shield, User, Award, LayoutDashboard, Database, HelpCircle, 
  ArrowLeftRight, RefreshCw, AlertTriangle 
} from 'lucide-react';
import { DatabaseState, Member, Reward, Transaction, Advertisement } from './types';
import CustomerDashboard from './components/CustomerDashboard';
import AdminPanel from './components/AdminPanel';
import VoucherModal from './components/VoucherModal';

export default function App() {
  const [db, setDb] = useState<DatabaseState | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string>(() => {
    return localStorage.getItem('loyalty_current_member_id') || 'M-001';
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('loyalty_logged_in') === 'true';
  });
  const [activeView, setActiveView] = useState<'customer' | 'admin'>('customer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voucher redemption modal state
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [redeemedReward, setRedeemedReward] = useState<Reward | null>(null);
  const [redemptionTrx, setRedemptionTrx] = useState<Transaction | null>(null);

  useEffect(() => {
    localStorage.setItem('loyalty_current_member_id', currentMemberId);
  }, [currentMemberId]);

  useEffect(() => {
    localStorage.setItem('loyalty_logged_in', isLoggedIn ? 'true' : 'false');
  }, [isLoggedIn]);

  // Fetch all current database state
  const fetchDatabase = async () => {
    try {
      const res = await fetch('/api/db');
      if (!res.ok) throw new Error('Respons jaringan kurang bagus.');
      const data = await res.json();
      setDb(data);
      setError(null);
    } catch (err) {
      console.error("Gagal memuat database:", err);
      setError("Gagal terhubung dengan server database Loyalty Hub. Mencoba menyambung kembali...");
    } finally {
      setLoading(false);
    }
  };

  // Load database on mount
  useEffect(() => {
    fetchDatabase();
    // Auto polling every 5 seconds to keep dashboard "real-time"
    const interval = setInterval(() => {
      fetchDatabase();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Retrieve current active member
  const currentMember = db?.members.find(m => m.id === currentMemberId) || db?.members[0];

  // Actions
  const handleEarnPoints = async (points: number, description: string) => {
    if (!db || !currentMember) return;
    try {
      const res = await fetch('/api/members/earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: currentMember.id, points, description })
      });
      if (!res.ok) throw new Error("Gagal menyimpan poin.");
      await fetchDatabase(); // Refresh
    } catch (err) {
      alert("Gagal menambahkan poin simulasi: " + String(err));
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!db || !currentMember) return;
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: currentMember.id, rewardId })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan penukaran.");
      }

      // Populate success modal and open
      setRedeemedReward(data.reward);
      setRedemptionTrx(data.transaction);
      setVoucherModalOpen(true);

      await fetchDatabase(); // Refresh state
    } catch (err: any) {
      alert(err.message || "Gagal melakukan penukaran reward.");
    }
  };

  const handleUpdateProfile = async (name: string, email: string, phone: string, password?: string, profileImage?: string) => {
    if (!db || !currentMember) return;
    try {
      const res = await fetch('/api/members/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentMember.id, name, email, phone, password, profileImage })
      });
      if (!res.ok) throw new Error("Gagal mengupdate profil.");
      await fetchDatabase();
    } catch (err) {
      alert("Gagal menyimpan data profil: " + String(err));
    }
  };

  const handleTrackAd = async (adId: string, actionType: 'impression' | 'click') => {
    try {
      await fetch('/api/ads/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId, actionType })
      });
      // Perform silent background update
      const res = await fetch('/api/db');
      if (res.ok) {
        const data = await res.json();
        setDb(data);
      }
    } catch (err) {
      console.warn("Gagal melacak statistik iklan:", err);
    }
  };

  const handleAddReward = async (rewardData: Partial<Reward>) => {
    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardData)
      });
      if (!res.ok) throw new Error("Gagal menambahkan reward.");
      await fetchDatabase();
    } catch (err) {
      alert("Gagal menyimpan reward: " + String(err));
    }
  };

  const handleDeleteReward = async (id: string) => {
    try {
      const res = await fetch(`/api/rewards/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Gagal menghapus reward.");
      await fetchDatabase();
    } catch (err) {
      alert("Gagal menghapus reward: " + String(err));
    }
  };

  const handleAddAd = async (adData: Partial<Advertisement>) => {
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adData)
      });
      if (!res.ok) throw new Error("Gagal menambahkan promosi iklan.");
      await fetchDatabase();
    } catch (err) {
      alert("Gagal menyimpan iklan: " + String(err));
    }
  };

  const handleDeleteAd = async (id: string) => {
    try {
      const res = await fetch(`/api/ads/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Gagal menghapus iklan.");
      await fetchDatabase();
    } catch (err) {
      alert("Gagal menghapus promosi iklan: " + String(err));
    }
  };

  const handleResetDb = async () => {
    try {
      const res = await fetch('/api/db/reset', { method: 'POST' });
      if (!res.ok) throw new Error("Gagal mereset.");
      await fetchDatabase();
    } catch (err) {
      alert("Gagal mereset database: " + String(err));
    }
  };

  // Loading Screen
  if (loading && !db) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl max-w-sm w-full space-y-4">
          <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin mx-auto" />
          <h3 className="text-base font-extrabold text-gray-900">Menghubungkan Server</h3>
          <p className="text-xs text-gray-400 font-medium leading-relaxed">Mempersiapkan database Loyalty Hub dan mensinkronisasikan penawaran iklan...</p>
        </div>
      </div>
    );
  }

  // Error boundary reconnecting screen
  if (error && !db) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl max-w-sm w-full space-y-4">
          <div className="bg-red-50 p-3.5 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-red-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900">Server Belum Aktif</h3>
          <p className="text-xs text-red-500 font-bold leading-relaxed">{error}</p>
          <button 
            onClick={() => { setLoading(true); fetchDatabase(); }}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Hubungkan Kembali Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans flex flex-col justify-between grid-lines">
      
      {/* GLOBAL HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 flex-shrink-0 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo Brand */}
            <div className="flex items-center gap-2.5">
              <div className="bg-slate-900 p-2 rounded text-white">
                <Award className="h-4 w-4 text-red-500 animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-wider text-slate-900 leading-none">
                  {db?.config?.logoText || "LOYALTY.HUB"}
                </h1>
                <p className="text-[9px] text-slate-500 font-bold mt-0.5 tracking-widest uppercase font-mono">
                  {db?.config?.headerText || "Consolidated Member/Ads Control"}
                </p>
              </div>
            </div>

            {/* View Switcher segmented button */}
            <div className="bg-slate-100 p-1 rounded-lg flex gap-1 border border-slate-200">
              <button
                onClick={() => {
                  setActiveView('customer');
                  fetchDatabase();
                }}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'customer'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="h-3.5 w-3.5 text-indigo-500" />
                Customer Portal
              </button>
              <button
                onClick={() => {
                  setActiveView('admin');
                  fetchDatabase();
                }}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'admin'
                    ? 'bg-slate-900 text-white shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                Admin Panel
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* VIEW PANEL MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {db && currentMember ? (
          activeView === 'customer' ? (
            <CustomerDashboard
              db={db}
              currentMember={currentMember}
              isLoggedIn={isLoggedIn}
              setIsLoggedIn={setIsLoggedIn}
              onSelectMember={setCurrentMemberId}
              onEarnPoints={handleEarnPoints}
              onRedeemReward={handleRedeemReward}
              onUpdateProfile={handleUpdateProfile}
              onTrackAd={handleTrackAd}
            />
          ) : (
            <AdminPanel
              db={db}
              onAddReward={handleAddReward}
              onDeleteReward={handleDeleteReward}
              onAddAd={handleAddAd}
              onDeleteAd={handleDeleteAd}
              onResetDb={handleResetDb}
              onRefreshDb={fetchDatabase}
            />
          )
        ) : (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-lg shadow-xs">
            <RefreshCw className="h-6 w-6 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-mono">SYNCING SYSTEM DATASTATE...</p>
          </div>
        )}
      </main>

      {/* FOOTER COOPERATIVE */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[11px] text-slate-500 font-medium shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-mono">© 2026 LOYALTY.HUB GROUP // OPERATIONAL NETWORK</p>
          <div className="flex items-center gap-4 font-bold">
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Polling Feed [OK]
            </span>
            <span className="font-mono text-[10px] text-slate-500">v1.1.2-HD</span>
          </div>
        </div>
      </footer>

      {/* REDEMPTION SUCCESS DIALOG MODAL */}
      <VoucherModal
        isOpen={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
        reward={redeemedReward}
        transaction={redemptionTrx}
      />

    </div>
  );
}
