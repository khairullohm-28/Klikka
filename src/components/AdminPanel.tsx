import React, { useState } from 'react';
import { 
  Users, Award, BarChart3, TrendingUp, Plus, Trash2, ShieldAlert, RotateCcw, 
  Radio, Eye, MousePointerClick, Image, Tag, PlusCircle, Check,
  CreditCard, Search, Receipt, UserPlus, Coins, QrCode, ShoppingBag,
  Settings, PenTool, LayoutDashboard, Lock, Star
} from 'lucide-react';
import { DatabaseState, Reward, Advertisement, Transaction, Member } from '../types';

interface AdminPanelProps {
  db: DatabaseState;
  onAddReward: (reward: Partial<Reward>) => void;
  onDeleteReward: (id: string) => void;
  onAddAd: (ad: Partial<Advertisement>) => void;
  onDeleteAd: (id: string) => void;
  onResetDb: () => void;
  onRefreshDb?: () => void;
}

export default function AdminPanel({
  db,
  onAddReward,
  onDeleteReward,
  onAddAd,
  onDeleteAd,
  onResetDb,
  onRefreshDb
}: AdminPanelProps) {
  // Tabs controller: overview, members, rewards, ads, branding
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'rewards' | 'ads' | 'branding'>('overview');

  // =========================================================
  // CASHIER CONSOLE & TRANSACTION MANAGEMENT
  // =========================================================
  const [selectedMemberId, setSelectedMemberId] = useState<string>('M-001');
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [cashierTab, setCashierTab] = useState<'earn' | 'redeem'>('earn');
  const [cashierLoading, setCashierLoading] = useState(false);
  const [cashierError, setCashierError] = useState<string | null>(null);

  // transaction details
  const [purchaseAmount, setPurchaseAmount] = useState<string>('');
  const [useCustomPoints, setUseCustomPoints] = useState<boolean>(false);
  const [customPointsInput, setCustomPointsInput] = useState<string>('');
  const [earnDescription, setEarnDescription] = useState<string>('Transaksi pembelian produk');
  const [selectedRewardId, setSelectedRewardId] = useState<string>('R-001');

  // Quick Presets list (Admin does not need to type points, amount, or descriptions)
  const transactionPresets = db.config?.presets && db.config.presets.length > 0
    ? db.config.presets
    : [
        { name: 'Regular Photobooth 📸', amount: '35000', points: 3, desc: 'Sesi Regular Klikka Photobooth' },
        { name: 'Wide Angle Session ⚡️', amount: '50000', points: 5, desc: 'Sesi Wide Angle Klikka Photobooth' },
        { name: 'Merchandise Premium 👕', amount: '100000', points: 10, desc: 'Pembelian Merchandise Premium Klikka' },
        { name: 'Promo Combo Special 🔥', amount: '150000', points: 15, desc: 'Sesi Combo Photo + Keychain Premium' },
      ];

  const handleApplyPreset = (preset: typeof transactionPresets[0]) => {
    setPurchaseAmount(preset.amount);
    setEarnDescription(preset.desc);
    setUseCustomPoints(true);
    setCustomPointsInput(String(preset.points));
    setCashierError(null);
  };

  // Derive calculated points: Rp 10.000 = 1 Point (if customPoints is false)
  const autoCalculatedPoints = Math.floor(Number(purchaseAmount) / 10000) || 0;
  const computedPoints = useCustomPoints ? (Number(customPointsInput) || 0) : autoCalculatedPoints;

  // Active selected member & reward objects
  const activeMember = db.members.find(m => m.id === selectedMemberId) || db.members[0];
  const activeRewardForCashier = db.rewards.find(r => r.id === selectedRewardId) || db.rewards[0];

  // Submit Earn Points
  const handleCashierEarnPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setCashierError('Silakan pilih atau cari member terlebih dahulu.');
      return;
    }
    if (computedPoints <= 0) {
      setCashierError('Jumlah perolehan poin harus lebih besar dari 0.');
      return;
    }

    setCashierLoading(true);
    setCashierError(null);
    try {
      const res = await fetch('/api/members/earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMemberId,
          points: computedPoints,
          description: earnDescription || 'Pembelian produk di kasir Klikka'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menambahkan poin.');
      }
      triggerAlert(`Berhasil menambahkan +${computedPoints} poin untuk ${activeMember?.name || 'Member'}!`);
      setPurchaseAmount('');
      setCustomPointsInput('');
      setEarnDescription('Transaksi pembelian produk');
      setUseCustomPoints(false);
      if (onRefreshDb) onRefreshDb();
    } catch (err: any) {
      setCashierError(err.message || 'Gagal melakukan transaksi.');
    } finally {
      setCashierLoading(false);
    }
  };

  // Submit Redeem Reward
  const handleCashierRedeemReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setCashierError('Silakan pilih atau cari member terlebih dahulu.');
      return;
    }
    if (!selectedRewardId) {
      setCashierError('Silakan pilih reward yang ingin ditukarkan.');
      return;
    }
    if (!activeMember || activeMember.points < (activeRewardForCashier?.pointsCost || 0)) {
      setCashierError('Poin member tidak mencukupi untuk reward ini.');
      return;
    }

    setCashierLoading(true);
    setCashierError(null);
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMemberId,
          rewardId: selectedRewardId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menukarkan reward.');
      }
      triggerAlert(`Redeem Sukses! Voucher ${data.reward.title} diterbitkan: ${data.transaction.rewardCode}`);
      if (onRefreshDb) onRefreshDb();
    } catch (err: any) {
      setCashierError(err.message || 'Gagal menukarkan voucher.');
    } finally {
      setCashierLoading(false);
    }
  };

  // =========================================================
  // MEMBER MANAGEMENT STATES (TAB: MEMBERS)
  // =========================================================
  const [managementSearch, setManagementSearch] = useState<string>('');
  const [managementTierFilter, setManagementTierFilter] = useState<string>('Semua');
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Edit member form states
  const [mEditName, setMEditName] = useState('');
  const [mEditEmail, setMEditEmail] = useState('');
  const [mEditPhone, setMEditPhone] = useState('');
  const [mEditPassword, setMEditPassword] = useState('');
  const [mEditPoints, setMEditPoints] = useState('0');
  const [mEditTier, setMEditTier] = useState<'Bronze' | 'Silver' | 'Gold'>('Bronze');

  // Register member states
  const [showRegForm, setShowRegForm] = useState(false);
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPoints, setRegPoints] = useState<string>('0');
  const [regPassword, setRegPassword] = useState<string>('123456');

  const startEditingMember = (member: Member) => {
    setEditingMember(member);
    setMEditName(member.name);
    setMEditEmail(member.email);
    setMEditPhone(member.phone);
    setMEditPassword(member.password || '123456');
    setMEditPoints(String(member.points));
    setMEditTier(member.tier);
  };

  const handleEditMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const res = await fetch('/api/members/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.id,
          name: mEditName,
          email: mEditEmail,
          phone: mEditPhone,
          password: mEditPassword,
          points: Number(mEditPoints),
          tier: mEditTier
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan profil member.');
      }
      triggerAlert(`Data member ${mEditName} berhasil diperbarui di server!`);
      setEditingMember(null);
      if (onRefreshDb) onRefreshDb();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat mengupdate member.');
    }
  };

  const handleRegisterMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName) return;

    try {
      const res = await fetch('/api/members/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone || '-',
          initialPoints: Number(regPoints) || 0,
          password: regPassword || '123456'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mendaftarkan member.');
      }
      triggerAlert(`Member baru ${regName} terdaftar dengan ID: ${data.member.id}!`);
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegPoints('0');
      setRegPassword('123456');
      setShowRegForm(false);
      if (onRefreshDb) onRefreshDb();
    } catch (err: any) {
      alert(err.message || 'Gagal melakukan registrasi.');
    }
  };

  // Filter members based on search criteria: name, email, phone, id
  const filteredMembers = db.members.filter(m => {
    const term = managementSearch.toLowerCase();
    const matchesSearch = 
      m.name.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      m.phone.toLowerCase().includes(term) ||
      m.id.toLowerCase().includes(term);
    
    const matchesTier = managementTierFilter === 'Semua' || m.tier === managementTierFilter;
    return matchesSearch && matchesTier;
  });

  // =========================================================
  // BRANDING CONFIGURATION MANAGEMENT (TAB: BRANDING)
  // =========================================================
  const [adminIsLoggedIn, setAdminIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('admin_logged_in') === 'true';
  });
  const [adminLoginEmail, setAdminLoginEmail] = useState('');
  const [adminLoginPassword, setAdminLoginPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  const [cfgHeader, setCfgHeader] = useState(db.config?.headerText || 'Loyalty Hub');
  const [cfgLogo, setCfgLogo] = useState(db.config?.logoText || '⚡️ KLIKKA // PORTAL');
  const [cfgStep1, setCfgStep1] = useState(db.config?.guideStep1 || 'Dapatkan poin otomatis dengan belanja photobooth atau menu merchandise partner Klikka.');
  const [cfgStep2, setCfgStep2] = useState(db.config?.guideStep2 || 'Buka tab Katalog & Voucher untuk memilih reward yang sesuai dengan saldo poin Anda.');
  const [cfgStep3, setCfgStep3] = useState(db.config?.guideStep3 || 'Tunjukkan kartu keanggotaan digital di tab Setting untuk discan oleh kasir.');
  const [cfgAdminEmail, setCfgAdminEmail] = useState(db.config?.adminEmail || 'admin@klikka.com');
  const [cfgAdminPassword, setCfgAdminPassword] = useState(db.config?.adminPassword || 'admin123');
  const [cfgPresets, setCfgPresets] = useState<Array<{ name: string; amount: string; points: number; desc: string }>>(
    db.config?.presets || [
      { name: 'Regular Photobooth 📸', amount: '35000', points: 3, desc: 'Sesi Regular Klikka Photobooth' },
      { name: 'Wide Angle Session ⚡️', amount: '50000', points: 5, desc: 'Sesi Wide Angle Klikka Photobooth' },
      { name: 'Merchandise Premium 👕', amount: '100000', points: 10, desc: 'Pembelian Merchandise Premium Klikka' },
      { name: 'Promo Combo Special 🔥', amount: '150000', points: 15, desc: 'Sesi Combo Photo + Keychain Premium' },
    ]
  );
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  React.useEffect(() => {
    if (db.config) {
      setCfgHeader(db.config.headerText || 'Loyalty Hub');
      setCfgLogo(db.config.logoText || '⚡️ KLIKKA // PORTAL');
      setCfgStep1(db.config.guideStep1 || '');
      setCfgStep2(db.config.guideStep2 || '');
      setCfgStep3(db.config.guideStep3 || '');
      setCfgAdminEmail(db.config.adminEmail || 'admin@klikka.com');
      setCfgAdminPassword(db.config.adminPassword || 'admin123');
      if (db.config.presets) {
        setCfgPresets(db.config.presets);
      }
    }
  }, [db.config]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);

    const correctEmail = db.config?.adminEmail || 'admin@klikka.com';
    const correctPassword = db.config?.adminPassword || 'admin123';

    if (adminLoginEmail.trim().toLowerCase() === correctEmail.trim().toLowerCase() && adminLoginPassword === correctPassword) {
      setAdminIsLoggedIn(true);
      localStorage.setItem('admin_logged_in', 'true');
      setAdminLoginEmail('');
      setAdminLoginPassword('');
    } else {
      setAdminLoginError('Kredensial Admin tidak cocok. Silakan periksa email dan password.');
    }
  };

  const handleAdminLogout = () => {
    setAdminIsLoggedIn(false);
    localStorage.removeItem('admin_logged_in');
  };

  const handleAddPresetRow = () => {
    setCfgPresets([
      ...cfgPresets,
      { name: 'Nama Transaksi Baru 📸', amount: '35000', points: 3, desc: 'Sesi Baru Photobooth Klikka' }
    ]);
  };

  const handleUpdatePresetRow = (index: number, field: string, value: any) => {
    const updated = [...cfgPresets];
    updated[index] = { ...updated[index], [field]: value };
    setCfgPresets(updated);
  };

  const handleRemovePresetRow = (index: number) => {
    const updated = cfgPresets.filter((_, i) => i !== index);
    setCfgPresets(updated);
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headerText: cfgHeader,
          logoText: cfgLogo,
          guideStep1: cfgStep1,
          guideStep2: cfgStep2,
          guideStep3: cfgStep3,
          presets: cfgPresets,
          adminEmail: cfgAdminEmail,
          adminPassword: cfgAdminPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan konfigurasi.');
      }
      triggerAlert('Setting Admin (Preset & Branding) berhasil diupdate!');
      if (onRefreshDb) onRefreshDb();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan konfigurasi.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // =========================================================
  // REWARDS & ADS CREATION FORMS
  // =========================================================
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rTitle, setRTitle] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [rPoints, setRPoints] = useState('500');
  const [rStock, setRStock] = useState('15');
  const [rImage, setRImage] = useState('');
  const [rCategory, setRCategory] = useState<'Voucher' | 'Merchandise' | 'Food & Beverage' | 'Services'>('Voucher');
  const [rPattern, setRPattern] = useState('VCHR-XXXX');

  const [showAdForm, setShowAdForm] = useState(false);
  const [adTitle, setAdTitle] = useState('');
  const [adDesc, setAdDesc] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adTargetUrl, setAdTargetUrl] = useState('');
  const [adLocation, setAdLocation] = useState<'hero' | 'sidebar' | 'popup'>('hero');
  const [adAdvertiser, setAdAdvertiser] = useState('');
  const [adStatus, setAdStatus] = useState<'active' | 'inactive'>('active');

  // Notification Toast Banner
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const triggerAlert = (msg: string) => {
    setAlertMsg(msg);
    setTimeout(() => setAlertMsg(null), 3000);
  };

  const handleRewardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rTitle || !rPoints) return;
    
    onAddReward({
      title: rTitle,
      description: rDesc || 'Deskripsi voucher reward.',
      pointsCost: Number(rPoints),
      stock: Number(rStock),
      image: rImage || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=400',
      category: rCategory,
      codePattern: rPattern
    });

    setRTitle('');
    setRDesc('');
    setRPoints('500');
    setRStock('15');
    setRImage('');
    setRPattern('VCHR-XXXX');
    setShowRewardForm(false);
    triggerAlert('Reward baru berhasil ditambahkan!');
  };

  const handleAdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle || !adAdvertiser) return;

    onAddAd({
      title: adTitle,
      description: adDesc,
      imageUrl: adImageUrl || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800',
      targetUrl: adTargetUrl || 'https://google.com',
      status: adStatus,
      location: adLocation,
      advertiser: adAdvertiser
    });

    setAdTitle('');
    setAdDesc('');
    setAdImageUrl('');
    setAdTargetUrl('');
    setAdAdvertiser('');
    setShowAdForm(false);
    triggerAlert('Iklan promosi berhasil diluncurkan!');
  };

  const handleToggleAdStatus = (ad: Advertisement) => {
    const newStatus = ad.status === 'active' ? 'inactive' : 'active';
    onAddAd({ ...ad, status: newStatus });
    triggerAlert(`Iklan "${ad.title}" diganti ke status ${newStatus === 'active' ? 'AKTIF' : 'OFF'}.`);
  };

  // Stats calculation
  const totalMembers = db.members.length;
  const totalPointsIssued = db.members.reduce((sum, m) => sum + m.totalPointsEarned, 0);
  const totalRedemptions = db.transactions.filter(t => t.type === 'redeem').length;
  const totalAdImpressions = db.ads.reduce((sum, a) => sum + a.impressions, 0);
  const totalAdClicks = db.ads.reduce((sum, a) => sum + a.clicks, 0);
  const overallCtr = totalAdImpressions > 0 ? ((totalAdClicks / totalAdImpressions) * 100).toFixed(1) : '0.0';

  if (!adminIsLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl border-4 border-slate-900 p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex bg-red-100 text-red-650 p-3.5 rounded-2xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] mb-1">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase font-mono tracking-wider">
              Admin Gateway
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Silakan login menggunakan email dan password admin untuk mengakses kontrol kasir & sistem loyalty.
            </p>
          </div>

          {adminLoginError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl border-2 border-red-200 text-xs font-bold flex items-center gap-2 animate-bounce">
              <span className="shrink-0">⚠️</span>
              <span>{adminLoginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">Email Admin</label>
              <input
                type="email"
                required
                placeholder="Contoh: admin@klikka.com"
                value={adminLoginEmail}
                onChange={(e) => setAdminLoginEmail(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-0 text-slate-900 font-bold bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">Password / PIN Admin</label>
              <input
                type="password"
                required
                placeholder="Masukkan password keamanan"
                value={adminLoginPassword}
                onChange={(e) => setAdminLoginPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-0 text-slate-900 font-bold bg-white font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-red-650 hover:bg-red-600 text-white font-black rounded-xl text-xs transition-all border-2 border-slate-900 cursor-pointer shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none uppercase tracking-wider font-mono flex items-center justify-center gap-1.5"
            >
              Masuk Dashboard Admin ⚡
            </button>
          </form>

          {/* HELP HINT FOR TESTERS */}
          <div className="pt-4 border-t-2 border-dashed border-slate-200 text-center space-y-2">
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-250">
              💡 Informasi Kredensial Admin
            </span>
            <p className="text-[11px] text-slate-500 leading-normal">
              Email: <strong className="text-slate-800 select-all font-mono">{db.config?.adminEmail || 'admin@klikka.com'}</strong><br />
              Password: <strong className="text-slate-800 select-all font-mono">{db.config?.adminPassword || 'admin123'}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Alert Banner Notification */}
      {alertMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-650 border-2 border-red-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <div className="bg-white text-red-600 p-1 rounded-full">
            <Check className="h-4 w-4" />
          </div>
          <span className="text-xs font-black font-mono tracking-wide">{alertMsg}</span>
        </div>
      )}

      {/* TOP HEADER SINKRONISASI WARNA RED KLIKKA BRAND */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-5 rounded-2xl border-2 border-red-600 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-red-600 animate-pulse" />
            <span className="text-[9px] bg-red-100 text-red-700 border border-red-200 font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full font-mono">
              KLIKKA STATIONS MONITOR
            </span>
          </div>
          <h2 className="text-lg font-black tracking-wider text-slate-900 uppercase font-mono mt-1">
            {db.config?.logoText || "⚡️ KLIKKA // PORTAL"} - ADMIN CONTROL
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Sistem manajemen tersentralisasi untuk kasir photobooth, member loyalty, dan penempatan iklan promosi.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => {
              if (window.confirm("Yakin ingin mereset database ke default pabrik?")) {
                onResetDb();
                triggerAlert('Sistem database berhasil direset.');
              }
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-red-650 text-white border-2 border-slate-900 rounded-xl text-xs font-black font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Database
          </button>

          <button 
            onClick={handleAdminLogout}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 rounded-xl text-xs font-black font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
          >
            <Lock className="h-4 w-4" />
            Logout Admin
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW WITH RED HIGHLIGHT BRANDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border-2 border-slate-100 hover:border-red-100 transition-colors shadow-sm flex items-center gap-4">
          <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-red-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Total Anggota</p>
            <p className="text-xl font-black text-slate-900 mt-0.5 font-mono">{totalMembers}</p>
            <span className="text-[9px] text-red-600 font-extrabold uppercase font-mono">Aktif Bergabung</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-slate-100 hover:border-red-100 transition-colors shadow-sm flex items-center gap-4">
          <div className="bg-red-55 p-3 rounded-lg text-red-600 border border-red-100">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Total Poin Dirilis</p>
            <p className="text-xl font-black text-slate-900 mt-0.5 font-mono">{totalPointsIssued.toLocaleString('id-ID')}</p>
            <span className="text-[9px] text-red-600 font-extrabold uppercase font-mono">Akumulasi Earned</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-slate-100 hover:border-red-100 transition-colors shadow-sm flex items-center gap-4">
          <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-red-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Voucher Ditukar</p>
            <p className="text-xl font-black text-slate-900 mt-0.5 font-mono">{totalRedemptions}</p>
            <span className="text-[9px] text-red-600 font-extrabold uppercase font-mono">Redeemed Success</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border-2 border-slate-100 hover:border-red-100 transition-colors shadow-sm flex items-center gap-4">
          <div className="bg-red-55 p-3 rounded-lg text-red-600 border border-red-100">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">CTR Spanduk Promo</p>
            <p className="text-xl font-black text-slate-900 mt-0.5 font-mono">{overallCtr}%</p>
            <span className="text-[9px] text-red-600 font-extrabold uppercase font-mono">{totalAdClicks} Klik / {totalAdImpressions} View</span>
          </div>
        </div>

      </div>

      {/* SINKRON TAB CONTROL - RED HIGHLIGHT ACCENT */}
      <div className="flex gap-1 overflow-x-auto border-b-2 border-slate-200 pb-px">
        {[
          { key: 'overview', label: 'Kasir & Feed', icon: CreditCard },
          { key: 'members', label: 'Kelola Member', icon: Users },
          { key: 'rewards', label: 'Katalog Reward', icon: Award },
          { key: 'ads', label: 'Spanduk Promosi', icon: Image },
          { key: 'branding', label: 'Setting Admin', icon: Settings }
        ].map(tab => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2.5 text-xs font-black cursor-pointer border-b-2 transition-all shrink-0 font-mono uppercase tracking-wider flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-red-600 text-red-600 bg-red-50/40 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <IconComp className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: KASIR & LIVE FEED ACTIVITY */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-900 overflow-hidden shadow-md">
            
            <div className="bg-slate-950 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="bg-red-600 p-2 rounded-xl text-white">
                  <CreditCard className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase font-mono">Kasir Photobooth - Simulasikan Earn & Redeem</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Pilih member dan klik Preset Cepat agar tidak perlu mengetik detail.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-red-950 border border-red-500 text-red-400 px-3 py-1 rounded-full">
                <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-[9px] font-black font-mono uppercase">ONLINE PORT</span>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* MEMBER SEARCH BY MULTIPLE CRITERIA */}
              <div className="lg:col-span-1 space-y-4 border-slate-100 lg:border-r lg:pr-6 pb-6 lg:pb-0 border-b lg:border-b-0">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 font-mono">
                    Pilih Member / Pelanggan
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => {
                      setSelectedMemberId(e.target.value);
                      setCashierError(null);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border-2 border-slate-200 bg-white focus:border-red-600 outline-none font-bold font-mono text-slate-800"
                  >
                    {db.members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id} - {m.name} ({m.tier})
                      </option>
                    ))}
                  </select>
                </div>

                {/* FAST MULTI SEARCH (phone, name, email, id member) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase block font-mono">
                      Cari Member Cepat (Multi-Kriteria)
                    </label>
                    {memberSearchQuery && (
                      <button 
                        onClick={() => setMemberSearchQuery('')} 
                        className="text-[9px] text-red-600 hover:underline font-black font-mono uppercase"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Masukkan nama, telp, email, ID..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border-2 border-slate-200 focus:border-red-600 outline-none font-medium text-slate-800"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  </div>

                  {memberSearchQuery && (
                    <div className="mt-2 border border-slate-200 rounded-xl max-h-[150px] overflow-y-auto bg-slate-50 divide-y divide-slate-150 shadow-inner">
                      {db.members.filter(m => 
                        m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                        m.id.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                        m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                        m.phone.includes(memberSearchQuery)
                      ).map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedMemberId(m.id);
                            setMemberSearchQuery('');
                            setCashierError(null);
                          }}
                          className="w-full text-left p-2.5 hover:bg-red-50 flex justify-between items-center text-[11px] transition-colors"
                        >
                          <div>
                            <p className="font-extrabold text-slate-900">{m.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono">ID: {m.id} • {m.phone} • {m.email}</p>
                          </div>
                          <span className="text-[9px] font-black font-mono px-2 py-0.5 bg-white border border-slate-300 rounded text-slate-700">
                            {m.tier}
                          </span>
                        </button>
                      ))}
                      {db.members.filter(m => 
                        m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                        m.id.toLowerCase().includes(memberSearchQuery.toLowerCase()) || 
                        m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                        m.phone.includes(memberSearchQuery)
                      ).length === 0 && (
                        <p className="p-3 text-[10px] text-slate-400 font-mono text-center">Data member tidak ditemukan</p>
                      )}
                    </div>
                  )}
                </div>

                {/* CURRENT SELECTION CARD */}
                {activeMember && (
                  <div className={`p-4 rounded-xl border-2 relative overflow-hidden transition-all duration-300 ${
                    activeMember.tier === 'Gold' 
                      ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-300 text-amber-950' 
                      : activeMember.tier === 'Silver'
                        ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 text-slate-950'
                        : 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200 text-red-950'
                  }`}>
                    <div className="absolute right-[-10px] bottom-[-15px] opacity-10">
                      <QrCode className="h-28 w-28 text-current" />
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded border font-mono ${
                          activeMember.tier === 'Gold' 
                            ? 'bg-amber-200 border-amber-400 text-amber-900' 
                            : activeMember.tier === 'Silver'
                              ? 'bg-slate-200 border-slate-400 text-slate-700'
                              : 'bg-red-200 border-red-400 text-red-900'
                        }`}>
                          {activeMember.tier} LEVEL
                        </span>
                        <h4 className="font-black text-xs mt-2 tracking-tight text-slate-900">{activeMember.name}</h4>
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">{activeMember.email}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-[8px] uppercase tracking-wider font-black text-slate-400 font-mono">Saldo</p>
                        <p className="text-base font-black font-mono text-slate-950">{activeMember.points} PTS</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-250 flex items-center justify-between text-[8px] font-mono text-slate-400">
                      <span>ID: {activeMember.id}</span>
                      <span>PIN: {activeMember.password || '123456'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION FORM COLUMNS */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* ACTION SEGMENT SWITCH */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200 w-fit">
                  <button
                    type="button"
                    onClick={() => { setCashierTab('earn'); setCashierError(null); }}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer flex items-center gap-1.5 font-mono uppercase ${
                      cashierTab === 'earn'
                        ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Coins className="h-3.5 w-3.5 text-emerald-500" />
                    Tambah Poin Belanja
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCashierTab('redeem'); setCashierError(null); }}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer flex items-center gap-1.5 font-mono uppercase ${
                      cashierTab === 'redeem'
                        ? 'bg-white text-red-600 shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5 text-red-500" />
                    Keluarkan Voucher Reward
                  </button>
                </div>

                {cashierError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[11px] font-extrabold text-red-700 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{cashierError}</span>
                  </div>
                )}

                {/* EARN POINTS FORM */}
                {cashierTab === 'earn' && (
                  <div className="space-y-4">
                    {/* FAST PRESETS CARDS */}
                    <div className="space-y-2 bg-red-50/50 p-3.5 rounded-2xl border border-red-100">
                      <p className="text-[10px] font-black text-red-700 uppercase tracking-widest font-mono flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-red-500 text-red-500 animate-spin-slow" />
                        Pilihan Preset Transaksi Cepat (Tanpa Ngetik!)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {transactionPresets.map((pr, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleApplyPreset(pr)}
                            className="p-2.5 bg-white hover:bg-red-50 border-2 border-slate-200 hover:border-red-400 rounded-xl text-left transition-all active:scale-95 cursor-pointer"
                          >
                            <p className="text-[10px] font-extrabold text-slate-800 truncate">{pr.name}</p>
                            <div className="flex justify-between items-center mt-1.5 font-mono text-[9px]">
                              <span className="text-slate-400">Rp {Number(pr.amount).toLocaleString('id-ID')}</span>
                              <span className="text-red-600 font-black">+{pr.points} PTS</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleCashierEarnPoints} className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">
                            Nominal Belanja Real (Rp)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              required={!useCustomPoints}
                              disabled={useCustomPoints}
                              value={purchaseAmount}
                              onChange={(e) => {
                                setPurchaseAmount(e.target.value);
                                setCashierError(null);
                              }}
                              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 bg-white disabled:bg-slate-50 font-bold"
                            />
                            <span className="absolute left-2.5 top-2.5 text-xs font-mono font-black text-slate-400">Rp</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono flex justify-between items-center">
                            <span>Perolehan Poin Loyalty</span>
                            <label className="flex items-center gap-1 cursor-pointer font-black select-none text-red-600">
                              <input
                                type="checkbox"
                                checked={useCustomPoints}
                                onChange={(e) => {
                                  setUseCustomPoints(e.target.checked);
                                  setCashierError(null);
                                }}
                                className="rounded border-slate-300 text-red-600 h-3.5 w-3.5 cursor-pointer"
                              />
                              Kustom Poin
                            </label>
                          </label>

                          {useCustomPoints ? (
                            <input
                              type="number"
                              required
                              placeholder="Masukkan poin kustom"
                              value={customPointsInput}
                              onChange={(e) => {
                                setCustomPointsInput(e.target.value);
                                setCashierError(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs rounded-lg border-2 border-slate-250 focus:border-red-600 font-mono font-black text-slate-900"
                            />
                          ) : (
                            <div className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-mono font-black flex items-center justify-between h-8.5">
                              <span>+ {autoCalculatedPoints} PTS</span>
                              <span className="text-[9px] text-emerald-600 font-sans font-medium">Rp 10k = 1 Poin</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">
                          Deskripsi Pembelian / Keterangan Struk
                        </label>
                        <input
                          type="text"
                          value={earnDescription}
                          onChange={(e) => setEarnDescription(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none text-slate-800 bg-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={cashierLoading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 font-mono uppercase"
                      >
                        {cashierLoading ? 'Menyimpan...' : 'Tambah Poin Member'}
                        <Check className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                )}

                {/* REDEEM REWARDS FORM */}
                {cashierTab === 'redeem' && (
                  <form onSubmit={handleCashierRedeemReward} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">
                          Pilihlah Voucher Reward
                        </label>
                        <select
                          value={selectedRewardId}
                          onChange={(e) => { setSelectedRewardId(e.target.value); setCashierError(null); }}
                          className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 bg-white focus:border-red-600 outline-none font-bold text-slate-800"
                        >
                          {db.rewards.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.title} ({r.pointsCost} Poin)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">
                          Stok & Biaya Poin
                        </label>
                        {activeRewardForCashier && (
                          <div className={`px-3 py-2 rounded-lg border text-[11px] font-black font-mono flex items-center justify-between h-9 ${
                            activeMember && activeMember.points >= activeRewardForCashier.pointsCost
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            <span>Biaya: {activeRewardForCashier.pointsCost} PTS</span>
                            <span>Stok: {activeRewardForCashier.stock}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {activeRewardForCashier && (
                      <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex gap-3 items-center">
                        <img 
                          src={activeRewardForCashier.image} 
                          alt={activeRewardForCashier.title} 
                          className="w-10 h-10 object-cover rounded-lg border shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold text-slate-900 truncate">{activeRewardForCashier.title}</p>
                          <p className="text-[9px] text-slate-400 truncate mt-0.5">{activeRewardForCashier.description}</p>
                        </div>
                      </div>
                    )}

                    {activeMember && activeRewardForCashier && (
                      <div className="text-[10px] font-black font-mono uppercase">
                        {activeMember.points >= activeRewardForCashier.pointsCost ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-150 inline-block">
                            ✅ Poin mencukupi. Sisa setelah redeem: {activeMember.points - activeRewardForCashier.pointsCost} PTS
                          </span>
                        ) : (
                          <span className="text-red-700 bg-red-50 px-2 py-1 rounded border border-red-150 inline-block">
                            ❌ Poin tidak mencukupi. Kurang {activeRewardForCashier.pointsCost - activeMember.points} PTS lagi
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={cashierLoading || !activeMember || !activeRewardForCashier || activeMember.points < activeRewardForCashier.pointsCost || activeRewardForCashier.stock <= 0}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black rounded-lg text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 font-mono uppercase"
                    >
                      {cashierLoading ? 'Menerbitkan...' : 'Terbitkan Voucher Reward'}
                      <Award className="h-4 w-4" />
                    </button>
                  </form>
                )}

              </div>
            </div>
          </div>

          {/* TWO PANEL OVERVIEW LIST */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* REAL-TIME FEED */}
            <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase font-mono">Log Transaksi Terbaru</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Log riwayat transaksi masuk & penukaran kupon.</p>
                </div>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
              </div>

              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {db.transactions.map((t, i) => {
                  const isEarn = t.type === 'earn';
                  return (
                    <div key={t.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-red-200 transition-all text-xs font-medium">
                      <div className={`p-2 rounded-lg h-9 w-9 flex items-center justify-center shrink-0 border ${
                        isEarn ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-150'
                      }`}>
                        {isEarn ? <Coins className="h-4.5 w-4.5" /> : <Award className="h-4.5 w-4.5" />}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-slate-900 text-xs truncate">{t.memberName}</span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-normal">{t.description}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono border border-slate-300">MEMBER: {t.memberId}</span>
                          {t.rewardCode && (
                            <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-mono font-black border border-red-200">KODE: {t.rewardCode}</span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 self-center text-right font-mono">
                        <span className={`text-xs font-black px-2 py-0.5 rounded border ${
                          isEarn ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-250'
                        }`}>
                          {isEarn ? `+${t.points}` : `-${t.points}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QUICK LEADERBOARD */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase font-mono">Leaderboard Poin</h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Rank member berdasarkan total poin didapat.</p>
              </div>

              <div className="space-y-2">
                {[...db.members].sort((a,b) => b.totalPointsEarned - a.totalPointsEarned).slice(0, 5).map((m, index) => (
                  <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-black text-slate-400 w-4">#{index + 1}</span>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-900 truncate">{m.name}</h4>
                        <p className="text-[9px] text-slate-400 font-mono truncate">{m.id} • {m.tier}</p>
                      </div>
                    </div>
                    <span className="font-mono font-black text-slate-900 text-right shrink-0">
                      {m.points} <span className="text-[9px] text-slate-400 font-bold font-sans">PTS</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: KELOLA MEMBER & USER SEARCH (NEW FEATURE) */}
      {/* ========================================================= */}
      {activeTab === 'members' && (
        <div className="space-y-5">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase font-mono">Daftar & Kelola Pelanggan (Member)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Edit biodata kontak, update password / PIN akun, atur saldo poin, dan daftarkan member baru.</p>
            </div>

            <button
              onClick={() => setShowRegForm(!showRegForm)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 uppercase font-mono tracking-wider shadow-sm"
            >
              <PlusCircle className="h-4 w-4" />
              {showRegForm ? 'Batal' : 'Daftarkan Member Baru'}
            </button>
          </div>

          {/* REGISTER MEMBER FORM */}
          {showRegForm && (
            <form onSubmit={handleRegisterMemberSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 animate-scale-up">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">Registrasi Keanggotaan Baru</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Email Address (Opsional)</label>
                  <input
                    type="email"
                    placeholder="budi@example.com (bisa kosong)"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Nomor Handphone</label>
                  <input
                    type="text"
                    placeholder="Contoh: 0812345678"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Poin Awal</label>
                  <input
                    type="number"
                    value={regPoints}
                    onChange={(e) => setRegPoints(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none font-mono font-black text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Password / PIN Akun</label>
                  <input
                    type="text"
                    placeholder="Default: 123456"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none font-mono font-black text-slate-800"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded text-xs uppercase font-mono shadow-sm">
                  Simpan Member
                </button>
                <button type="button" onClick={() => setShowRegForm(false)} className="px-4 py-1.5 bg-slate-200 text-slate-700 font-bold rounded text-xs uppercase font-mono">
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* EDIT MEMBER DRAWER FORM DIALOG MODAL */}
          {editingMember && (
            <div className="fixed inset-0 bg-slate-950/65 z-50 flex items-center justify-center p-4">
              <form 
                onSubmit={handleEditMemberSubmit}
                className="bg-white rounded-2xl border-2 border-slate-900 overflow-hidden w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150"
              >
                <div className="bg-slate-950 text-white p-4 flex justify-between items-center border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4.5 w-4.5 text-red-500" />
                    <span className="text-xs font-black uppercase font-mono tracking-wider">Edit Data Member: {editingMember.id}</span>
                  </div>
                  <button type="button" onClick={() => setEditingMember(null)} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>

                <div className="p-4 space-y-3.5">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={mEditName}
                      onChange={(e) => setMEditName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-bold text-slate-800 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Alamat Email (Opsional)</label>
                    <input
                      type="email"
                      value={mEditEmail}
                      onChange={(e) => setMEditEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-mono text-slate-800 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">No Handphone</label>
                      <input
                        type="text"
                        required
                        value={mEditPhone}
                        onChange={(e) => setMEditPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-mono font-bold text-slate-850 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">PIN / Password</label>
                      <input
                        type="text"
                        required
                        value={mEditPassword}
                        onChange={(e) => setMEditPassword(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-mono font-bold text-slate-850 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Saldo Poin</label>
                      <input
                        type="number"
                        required
                        value={mEditPoints}
                        onChange={(e) => setMEditPoints(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-mono font-black text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Level Tier</label>
                      <select
                        value={mEditTier}
                        onChange={(e) => setMEditTier(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-mono font-bold text-slate-900 bg-white"
                      >
                        <option value="Bronze">Bronze</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold">Gold</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-lg text-xs uppercase font-mono shadow-sm"
                  >
                    Simpan Perubahan
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="flex-1 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs uppercase font-mono border"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SEARCH & FILTERS IN MEMBERS DIRECTORY */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Cari member lewat nomor telepon, nama, email, id member..."
                value={managementSearch}
                onChange={(e) => setManagementSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-medium"
              />
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="w-full sm:w-48">
              <select
                value={managementTierFilter}
                onChange={(e) => setManagementTierFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 bg-white focus:border-red-600 outline-none font-bold"
              >
                <option value="Semua">Semua Level Tier</option>
                <option value="Gold">Gold Only</option>
                <option value="Silver">Silver Only</option>
                <option value="Bronze">Bronze Only</option>
              </select>
            </div>
          </div>

          {/* MEMBERS TABLE DIRECTORY LIST */}
          <div className="bg-white rounded-2xl border-2 border-slate-900 overflow-hidden shadow-sm">
            {/* DESKTOP TABLE VIEW */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-slate-150 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider font-mono">
                    <th className="p-3 text-[9px]">ID & Tier</th>
                    <th className="p-3 text-[9px]">Nama Lengkap</th>
                    <th className="p-3 text-[9px]">Email Kontak</th>
                    <th className="p-3 text-[9px]">Nomor Handphone</th>
                    <th className="p-3 text-[9px]">Saldo Poin</th>
                    <th className="p-3 text-[9px]">Password / PIN</th>
                    <th className="p-3 text-[9px] text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                  {filteredMembers.map(m => {
                    const tierColors = {
                      Gold: 'bg-amber-100 text-amber-900 border-amber-350 font-black',
                      Silver: 'bg-slate-100 text-slate-800 border-slate-350 font-black',
                      Bronze: 'bg-orange-100 text-orange-950 border-orange-350 font-black'
                    };
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3">
                          <div className="space-y-1">
                            <span className="font-mono font-black text-slate-800 text-[11px] block">{m.id}</span>
                            <span className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border inline-block ${tierColors[m.tier]}`}>
                              {m.tier}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 font-extrabold text-slate-900 text-[12px]">{m.name}</td>
                        <td className="p-3 font-mono text-slate-500">{m.email}</td>
                        <td className="p-3 font-mono font-bold text-slate-600">{m.phone}</td>
                        <td className="p-3 font-mono font-black text-slate-900 text-sm">
                          {m.points.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-xs">
                          <div className="flex items-center gap-1 mt-1.5">
                            <Lock className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{m.password || '123456'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => startEditingMember(m)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-red-600 text-white rounded-lg border-2 border-slate-900 hover:border-red-600 text-[10px] font-black font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-mono text-xs uppercase">
                        Tidak ada anggota yang terdaftar cocok dengan kata kunci
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredMembers.map(m => {
                const tierColors = {
                  Gold: 'bg-amber-100 text-amber-900 border-amber-300 font-black',
                  Silver: 'bg-slate-100 text-slate-800 border-slate-300 font-black',
                  Bronze: 'bg-orange-100 text-orange-950 border-orange-300 font-black'
                };
                return (
                  <div key={m.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-900 text-xs truncate">{m.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {m.id}</p>
                      </div>
                      <span className={`text-[8px] font-mono uppercase px-2 py-0.5 rounded border shrink-0 ${tierColors[m.tier]}`}>
                        {m.tier}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-b border-dashed border-slate-100 py-2">
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-slate-400 font-mono uppercase tracking-wider">SALDO POIN</p>
                        <p className="font-mono font-black text-slate-900 text-xs">{m.points.toLocaleString('id-ID')} PTS</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] text-slate-400 font-mono uppercase tracking-wider">PIN AKSES</p>
                        <p className="font-mono font-bold text-slate-700 flex items-center gap-1">
                          <Lock className="h-3 w-3 text-slate-400" />
                          {m.password || '123456'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-0.5 text-[10px] text-slate-600">
                      <p className="truncate"><span className="text-slate-400 font-mono text-[9px] uppercase inline-block w-12">Email:</span> {m.email || '-'}</p>
                      <p className="truncate"><span className="text-slate-400 font-mono text-[9px] uppercase inline-block w-12">Phone:</span> {m.phone}</p>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => startEditingMember(m)}
                        className="w-full py-1.5 bg-slate-900 hover:bg-red-600 text-white rounded-lg text-[10px] font-black font-mono uppercase tracking-wider transition-all cursor-pointer active:scale-95 text-center shadow-sm"
                      >
                        Edit Profil Member
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="p-8 text-center text-slate-400 font-mono text-xs uppercase">
                  Tidak ada anggota yang terdaftar cocok dengan kata kunci
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: KATALOG REWARDS */}
      {/* ========================================================= */}
      {activeTab === 'rewards' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase font-mono">Katalog Hadiah / Rewards</h3>
              <p className="text-xs text-slate-500 mt-0.5">Buat voucher baru, ubah kuota stok, dan hapus reward yang sudah tidak aktif.</p>
            </div>

            <button
              onClick={() => setShowRewardForm(!showRewardForm)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer uppercase font-mono tracking-wider"
            >
              <PlusCircle className="h-4 w-4" />
              {showRewardForm ? 'Batal' : 'Tambah Reward Baru'}
            </button>
          </div>

          {showRewardForm && (
            <form onSubmit={handleRewardSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 animate-scale-up">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">Pendaftaran Reward Baru</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Nama Voucher/Hadiah</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Voucher Diskon Rp 50.000"
                    value={rTitle}
                    onChange={(e) => setRTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Kategori</label>
                  <select
                    value={rCategory}
                    onChange={(e) => setRCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none"
                  >
                    <option value="Voucher">Voucher Belanja</option>
                    <option value="Merchandise">Merchandise Fisik</option>
                    <option value="Food & Beverage">F&B (Makanan/Minuman)</option>
                    <option value="Services">Services (Layanan Jasa)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Deskripsi Syarat & Ketentuan</label>
                  <textarea
                    placeholder="Sebutkan masa berlaku voucher, cara penggunaan, dan ketentuan lainnya..."
                    value={rDesc}
                    onChange={(e) => setRDesc(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none h-16"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Biaya Poin (PTS)</label>
                  <input
                    type="number"
                    required
                    value={rPoints}
                    onChange={(e) => setRPoints(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Stok Kuota Awal</label>
                  <input
                    type="number"
                    required
                    value={rStock}
                    onChange={(e) => setRStock(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Pola Kode Voucher</label>
                  <input
                    type="text"
                    required
                    value={rPattern}
                    onChange={(e) => setRPattern(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none font-mono font-bold text-slate-700"
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">Note: 'XXXX' akan otomatis diganti string acak saat redeem.</p>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">URL Gambar Cover</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={rImage}
                    onChange={(e) => setRImage(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition-all cursor-pointer shadow-xs active:scale-95 uppercase font-mono border"
                >
                  Simpan Reward
                </button>
                <button
                  type="button"
                  onClick={() => setShowRewardForm(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-xs transition-all cursor-pointer uppercase font-mono border border-slate-300"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {db.rewards.map(r => (
              <div key={r.id} className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex gap-3 items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <img 
                    src={r.image} 
                    alt={r.title} 
                    className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-150 px-2 py-0.5 rounded-full font-mono uppercase inline-block">
                      {r.category}
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-xs mt-1 truncate">{r.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium"><span className="font-bold text-red-600 font-mono">{r.pointsCost}</span> Poin • Stok: <span className="font-bold font-mono">{r.stock}</span> item</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (window.confirm(`Yakin ingin menghapus reward "${r.title}"?`)) {
                        onDeleteReward(r.id);
                        triggerAlert('Voucher berhasil dihapus.');
                      }
                    }}
                    className="p-1.5 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-600 rounded transition-all cursor-pointer bg-white"
                    title="Hapus"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: KAMPANYE SPANDUK PROMOSI */}
      {/* ========================================================= */}
      {activeTab === 'ads' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase font-mono">Kelola Kampanye Iklan Promosi</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pasang iklan di dashboard customer secara efisien. Pantau rasio klik (CTR) iklan sponsor.</p>
            </div>

            <button
              onClick={() => setShowAdForm(!showAdForm)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer uppercase font-mono tracking-wider"
            >
              <PlusCircle className="h-4 w-4" />
              {showAdForm ? 'Batal' : 'Pasang Iklan Baru'}
            </button>
          </div>

          {showAdForm && (
            <form onSubmit={handleAdSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 animate-scale-up">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">Pendaftaran Iklan Promosi Baru</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Nama Pengiklan / Advertiser</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Shopee Indonesia"
                    value={adAdvertiser}
                    onChange={(e) => setAdAdvertiser(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Penempatan Slot Iklan</label>
                  <select
                    value={adLocation}
                    onChange={(e) => setAdLocation(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none"
                  >
                    <option value="hero">Hero Banner (Carousel Atas)</option>
                    <option value="sidebar">Sidebar Promo Widget (Kanan)</option>
                    <option value="popup">Pop-up Promo Alert (Layar Penuh)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Judul Utama Promosi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Diskon Kemerdekaan! Hemat s/d 40% Hari Ini!"
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Keterangan Ringkas Promosi</label>
                  <textarea
                    placeholder="Masukkan teks promosi menarik, penawaran diskon, atau instruksi tindakan (call-to-action)..."
                    value={adDesc}
                    onChange={(e) => setAdDesc(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none h-16"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">URL Gambar Spanduk / Banner</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={adImageUrl}
                    onChange={(e) => setAdImageUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Tautan Tujuan (Target Link)</label>
                  <input
                    type="text"
                    placeholder="https://shopee.co.id/promo-rewards"
                    value={adTargetUrl}
                    onChange={(e) => setAdTargetUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 font-mono">Status Awal</label>
                  <select
                    value={adStatus}
                    onChange={(e) => setAdStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-white focus:border-red-600 outline-none"
                  >
                    <option value="active">Aktif langsung (Tayangkan)</option>
                    <option value="inactive">Nonaktif (Simpan draf)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold rounded text-xs uppercase font-mono border"
                >
                  Tayangkan Iklan
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdForm(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded text-xs transition-all cursor-pointer uppercase font-mono border border-slate-300"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium border-collapse">
                <thead>
                  <tr className="bg-slate-150 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider font-mono">
                    <th className="p-3 text-[9px]">Kampanye Iklan</th>
                    <th className="p-3 text-[9px]">Penempatan</th>
                    <th className="p-3 text-[9px]">Impressions</th>
                    <th className="p-3 text-[9px]">Clicks</th>
                    <th className="p-3 text-[9px]">CTR (%)</th>
                    <th className="p-3 text-[9px]">Status</th>
                    <th className="p-3 text-[9px]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {db.ads.map(ad => {
                    const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={ad.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <img 
                              src={ad.imageUrl} 
                              alt={ad.title} 
                              className="w-10 h-10 rounded object-cover bg-slate-150 border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 truncate max-w-[180px] text-xs">{ad.title}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">By: {ad.advertiser} • ID: {ad.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                            {ad.location}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800 font-mono">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5 text-slate-400" /> {ad.impressions}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800 font-mono">
                          <span className="inline-flex items-center gap-1">
                            <MousePointerClick className="h-3.5 w-3.5 text-slate-400" /> {ad.clicks}
                          </span>
                        </td>
                        <td className="p-3 font-black text-red-650 font-mono">{ctr}%</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleAdStatus(ad)}
                            className="transition-colors hover:opacity-85 cursor-pointer"
                          >
                            {ad.status === 'active' ? (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-250 flex items-center gap-1 w-fit font-mono uppercase">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Aktif
                              </span>
                            ) : (
                              <span className="text-[9px] bg-slate-50 text-slate-500 font-bold px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 w-fit font-mono uppercase">
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Off
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              if (window.confirm(`Yakin ingin menghapus kampanye iklan "${ad.title}"?`)) {
                                onDeleteAd(ad.id);
                                triggerAlert('Iklan berhasil dihapus.');
                              }
                            }}
                            className="p-1 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer bg-white"
                            title="Hapus Iklan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: SETTING ADMIN & BRANDING */}
      {/* ========================================================= */}
      {activeTab === 'branding' && (
        <form onSubmit={handleConfigSubmit} className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm space-y-4 animate-scale-up">
          <div>
            <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase font-mono">Setting Admin & Branding</h3>
            <p className="text-xs text-slate-500 mt-0.5">Atur pilihan transaksi harga/poin kasir, teks logo portal, dan instruksi panduan langkah demi langkah.</p>
          </div>

          {/* DYNAMIC TRANSACTION PRESETS SECTION */}
          <div className="space-y-3.5 border-t pt-4">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-red-600 font-mono">Pilihan Transaksi Harga & Poin (Kasir)</h4>
              <button
                type="button"
                onClick={handleAddPresetRow}
                className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded text-[10px] flex items-center gap-1 font-mono border border-red-200 transition-all cursor-pointer active:scale-95"
              >
                <PlusCircle className="h-3 w-3" /> Tambah Pilihan
              </button>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">Pilihan di bawah akan otomatis muncul sebagai preset tombol cepat di Kasir Photobooth & simulator poin pelanggan.</p>
            
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {cfgPresets.map((pr, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 items-start sm:items-center">
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 w-full">
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5 font-mono">Nama Pilihan</label>
                      <input
                        type="text"
                        required
                        value={pr.name}
                        onChange={(e) => handleUpdatePresetRow(idx, 'name', e.target.value)}
                        placeholder="Regular Photobooth"
                        className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white font-extrabold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5 font-mono">Harga / Nominal (Rp)</label>
                      <input
                        type="number"
                        required
                        value={pr.amount}
                        onChange={(e) => handleUpdatePresetRow(idx, 'amount', e.target.value)}
                        placeholder="35000"
                        className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5 font-mono">Poin Didapat (PTS)</label>
                      <input
                        type="number"
                        required
                        value={pr.points}
                        onChange={(e) => handleUpdatePresetRow(idx, 'points', Number(e.target.value))}
                        placeholder="3"
                        className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white font-mono font-black text-red-600"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5 font-mono">Deskripsi</label>
                      <input
                        type="text"
                        value={pr.desc}
                        onChange={(e) => handleUpdatePresetRow(idx, 'desc', e.target.value)}
                        placeholder="Sesi Regular"
                        className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white text-slate-600"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleRemovePresetRow(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded border border-transparent hover:border-slate-200 hover:bg-white self-end sm:self-center shrink-0 transition-all cursor-pointer"
                    title="Hapus Preset"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {cfgPresets.length === 0 && (
                <p className="p-4 text-[11px] text-slate-400 font-mono text-center uppercase">Belum ada preset transaksi dikonfigurasi</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Teks Logo Portal Utama</label>
              <input
                type="text"
                required
                value={cfgLogo}
                onChange={(e) => setCfgLogo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-bold"
              />
              <p className="text-[9px] text-slate-400 mt-0.5">Muncul di baris atas header customer (e.g., ⚡️ KLIKKA // PORTAL)</p>
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Sub-Header Text</label>
              <input
                type="text"
                required
                value={cfgHeader}
                onChange={(e) => setCfgHeader(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-bold"
              />
              <p className="text-[9px] text-slate-400 mt-0.5">Muncul di baris bawah header customer (e.g., Loyalty Hub)</p>
            </div>
          </div>

          <div className="space-y-3.5 border-t pt-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-red-600 font-mono">Langkah Panduan Penggunaan Loyalty Hub</h4>
            
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Panduan Langkah 1</label>
              <textarea
                required
                value={cfgStep1}
                onChange={(e) => setCfgStep1(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none h-14"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Panduan Langkah 2</label>
              <textarea
                required
                value={cfgStep2}
                onChange={(e) => setCfgStep2(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none h-14"
              />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Panduan Langkah 3</label>
              <textarea
                required
                value={cfgStep3}
                onChange={(e) => setCfgStep3(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none h-14"
              />
            </div>
          </div>

          <div className="space-y-3.5 border-t pt-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-red-600 font-mono">Kredensial Akses Admin</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Ubah email dan password/PIN untuk pengamanan halaman Admin Panel ini.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Email Admin</label>
                <input
                  type="email"
                  required
                  value={cfgAdminEmail}
                  onChange={(e) => setCfgAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-bold"
                  placeholder="admin@klikka.com"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1 font-mono">Password Admin</label>
                <input
                  type="text"
                  required
                  value={cfgAdminPassword}
                  onChange={(e) => setCfgAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-red-600 outline-none font-mono font-bold"
                  placeholder="admin123"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingConfig}
              className="px-4 py-2 bg-slate-900 hover:bg-red-600 text-white font-black rounded-lg text-xs transition-all active:scale-95 cursor-pointer uppercase font-mono tracking-wider border-2 border-slate-900 hover:border-red-650 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
            >
              {isSavingConfig ? 'Menyimpan...' : 'Simpan Konfigurasi Branding'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
