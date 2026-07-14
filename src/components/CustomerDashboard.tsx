import React, { useState, useEffect } from 'react';
import { 
  Menu, X, Home, Ticket, Clock, Settings, User, QrCode, 
  Sparkles, Check, Edit2, LogIn, ExternalLink, ShoppingBag, 
  Search, Info, CreditCard, ChevronRight, ChevronLeft, Plus,
  TrendingUp, Award, Smartphone, ShieldCheck, Zap
} from 'lucide-react';
import { DatabaseState, Member, Reward, Transaction, Advertisement } from '../types';

interface CustomerDashboardProps {
  db: DatabaseState;
  currentMember: Member;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  onSelectMember: (id: string) => void;
  onEarnPoints: (points: number, description: string) => void;
  onRedeemReward: (rewardId: string) => void;
  onUpdateProfile: (name: string, email: string, phone: string, password?: string, profileImage?: string) => void;
  onTrackAd: (adId: string, actionType: 'impression' | 'click') => void;
}

export default function CustomerDashboard({
  db,
  currentMember,
  isLoggedIn,
  setIsLoggedIn,
  onSelectMember,
  onEarnPoints,
  onRedeemReward,
  onUpdateProfile,
  onTrackAd
}: CustomerDashboardProps) {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<'beranda' | 'promo' | 'riwayat' | 'setting'>('beranda');
  
  // Hamburger menu drawer open/close
  const [menuOpen, setMenuOpen] = useState(false);

  // Login Form States
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Search and Category for Rewards (Promo tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  
  // Edit Profile States
  const [editName, setEditName] = useState(currentMember.name);
  const [editEmail, setEditEmail] = useState(currentMember.email);
  const [editPhone, setEditPhone] = useState(currentMember.phone);
  const [editPassword, setEditPassword] = useState(currentMember.password || '');
  const [profileImage, setProfileImage] = useState(currentMember.profileImage || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Sync profile edits when member changes
  useEffect(() => {
    setEditName(currentMember.name);
    setEditEmail(currentMember.email);
    setEditPhone(currentMember.phone);
    setEditPassword(currentMember.password || '');
    setProfileImage(currentMember.profileImage || '');
    setUpdateSuccess(false);
  }, [currentMember]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // High quality fast client-side scaling to keeping payload <5KB
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setProfileImage(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Simulation helpers
  const [simPoints, setSimPoints] = useState('100');
  const [simDesc, setSimDesc] = useState('Belanja Photobooth');

  // Ad Carousel State
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);

  // Retrieve active hero/sidebar ads
  const activeAds = db.ads.filter(a => a.status === 'active');

  // Track impressions of visible ads
  useEffect(() => {
    activeAds.forEach(ad => {
      onTrackAd(ad.id, 'impression');
    });
  }, [currentMember.id, db.ads.length]);

  // Handle ad automatic transition (right to left feel)
  useEffect(() => {
    if (activeAds.length <= 1) return;
    const interval = setInterval(() => {
      setActiveAdIndex(prev => (prev + 1) % activeAds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeAds.length]);

  // Filter rewards for catalog
  const categories = ['Semua', 'Voucher', 'Merchandise', 'Food & Beverage', 'Services'];
  const filteredRewards = db.rewards.filter(reward => {
    const matchesSearch = reward.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          reward.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || reward.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter points history
  const myTransactions = db.transactions.filter(t => t.memberId === currentMember.id);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    const formattedInput = loginInput.trim().toLowerCase();
    
    // Find member by Email, Phone, or ID
    const foundMember = db.members.find(m => {
      const matchesEmail = m.email.trim().toLowerCase() === formattedInput;
      const matchesPhone = m.phone.trim().replace(/[\s-+]/g, '') === formattedInput.replace(/[\s-+]/g, '');
      const matchesId = m.id.trim().toLowerCase() === formattedInput;
      return matchesEmail || matchesPhone || matchesId;
    });

    if (!foundMember) {
      setLoginError("Ups! Akun tidak ditemukan. Silakan periksa kembali email atau nomor HP Anda.");
      return;
    }

    const memberPassword = foundMember.password || '123456';
    if (memberPassword !== loginPassword) {
      setLoginError("Password atau PIN yang Anda masukkan salah. Silakan coba lagi.");
      return;
    }

    // Success login!
    onSelectMember(foundMember.id);
    setIsLoggedIn(true);
    setLoginInput('');
    setLoginPassword('');
  };

  const handleUpdateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setTimeout(() => {
      onUpdateProfile(editName, editEmail, editPhone, editPassword, profileImage);
      setIsUpdating(false);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    }, 600);
  };

  const handleAdClick = (ad: Advertisement) => {
    onTrackAd(ad.id, 'click');
    setSelectedAd(ad);
  };

  const executeAdAction = (ad: Advertisement) => {
    window.open(ad.targetUrl, '_blank');
    setSelectedAd(null);
  };

  // Helper barcode generator
  const renderBarcode = (code: string) => {
    const chars = code.split('');
    return (
      <div className="flex items-center justify-center bg-white p-2 rounded-lg h-14 w-full gap-[2px] overflow-hidden select-none shadow-inner">
        {chars.map((char, idx) => {
          const widthClass = idx % 3 === 0 ? 'w-[1.5px]' : idx % 2 === 0 ? 'w-[3px]' : 'w-[2px]';
          const opacity = (char.charCodeAt(0) % 6 === 0) ? 'bg-transparent' : 'bg-slate-900';
          return <div key={idx} className={`h-10 ${widthClass} ${opacity}`} />;
        })}
      </div>
    );
  };

  // Gen Z Tier Stylings (Dynamic)
  const getTierStyle = (tier: 'Bronze' | 'Silver' | 'Gold') => {
    switch (tier) {
      case 'Gold':
        return {
          cardBg: "bg-gradient-to-br from-amber-400 via-yellow-200 to-amber-600 text-amber-950 border-2 border-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
          badgeBg: "bg-amber-950 text-yellow-300 border border-yellow-400/50",
          pointsText: "text-amber-950",
          sticker: "👑 GOLD VIP",
          themeColor: "text-yellow-600",
          glow: "shadow-[0_0_20px_rgba(234,179,8,0.45)]",
          icon: "✨",
          textColor: "text-amber-950",
          mutedText: "text-amber-900/80",
          accentBtn: "bg-amber-950 hover:bg-amber-900 text-yellow-300",
          glowDot: "bg-yellow-400"
        };
      case 'Silver':
        return {
          cardBg: "bg-gradient-to-br from-slate-300 via-zinc-100 to-slate-400 text-slate-900 border-2 border-zinc-200 shadow-[0_0_15px_rgba(148,163,184,0.3)]",
          badgeBg: "bg-slate-900 text-zinc-100 border border-zinc-300/50",
          pointsText: "text-slate-950",
          sticker: "⚡️ SILVER PRO",
          themeColor: "text-slate-600",
          glow: "shadow-[0_0_15px_rgba(148,163,184,0.3)]",
          icon: "⭐",
          textColor: "text-slate-950",
          mutedText: "text-slate-800/80",
          accentBtn: "bg-slate-900 hover:bg-slate-800 text-zinc-100",
          glowDot: "bg-sky-400"
        };
      case 'Bronze':
      default:
        return {
          cardBg: "bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white border-2 border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.25)]",
          badgeBg: "bg-orange-950 text-orange-200 border border-orange-400/50",
          pointsText: "text-white",
          sticker: "📸 BRONZE CLUB",
          themeColor: "text-orange-600",
          glow: "shadow-[0_0_10px_rgba(249,115,22,0.2)]",
          icon: "🔥",
          textColor: "text-white",
          mutedText: "text-orange-50/80",
          accentBtn: "bg-orange-950 hover:bg-orange-900 text-orange-200",
          glowDot: "bg-orange-400"
        };
    }
  };

  const ts = getTierStyle(currentMember.tier);

  return (
    <div className="sm:min-h-[750px] min-h-screen flex items-center justify-center sm:py-4 p-0 bg-slate-100/60 font-sans">
      
      {/* PHONE MOCKUP SHELL CONTAINER (MAX-W-MD) */}
      <div className="w-full sm:max-w-md bg-white sm:rounded-[32px] rounded-none sm:shadow-2xl shadow-none sm:border-4 border-none border-slate-900 overflow-hidden relative flex flex-col sm:min-h-[710px] min-h-screen h-full">
        
        {/* PHONE TOP STATUS BAR (BEAUTIFUL UX DECORATION) */}
        <div className={`${isLoggedIn ? 'bg-red-600' : 'bg-slate-900'} text-white px-6 pt-2 pb-1 flex justify-between items-center text-[11px] font-mono select-none tracking-tight transition-colors`}>
          <span className="font-bold">09:41</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-black tracking-wider uppercase text-[9px]">
              {isLoggedIn ? `${currentMember.tier} CONNECTED` : 'SECURE GATEWAY'}
            </span>
          </div>
        </div>

        {!isLoggedIn ? (
          <div className="flex-grow flex flex-col bg-slate-50 overflow-y-auto">
            {/* INTERACTIVE CUSTOM HEADER FOR LOGIN */}
            <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-6 text-center shadow-md border-b border-slate-950 flex-shrink-0">
              <div className="flex flex-col items-center">
                <div className="bg-red-600 p-2.5 rounded-2xl text-white mb-2 shadow-md border-2 border-slate-900">
                  <Award className="h-6 w-6 animate-pulse" />
                </div>
                <h1 className="text-sm font-black tracking-widest text-white font-mono flex items-center gap-1 uppercase">
                  {db.config?.logoText || '⚡️ KLIKKA // PORTAL'}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 font-mono tracking-wide uppercase mt-1">
                  MEMBER LOYALTY GATEWAY
                </p>
              </div>
            </header>

            <div className="p-5 flex-grow space-y-6">
              <div className="text-center space-y-1.5">
                <h2 className="text-base font-black text-slate-900 tracking-tight">Masuk Akun Member</h2>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Masukkan No. Handphone/Email dan Password PIN Anda yang sudah terdaftar di kasir/admin.
                </p>
              </div>

              {loginError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl border-2 border-red-200 text-[11px] font-bold flex items-center gap-2 animate-bounce">
                  <span className="shrink-0 bg-red-100 p-1 rounded-md text-red-600">⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">Email / No. Handphone / ID</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: budi.santoso@example.com atau ID"
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-0 text-slate-900 font-bold bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block mb-1.5 font-mono">Password / PIN Akun</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required
                      placeholder="Masukkan PIN keamanan"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border-2 border-slate-900 focus:outline-none focus:ring-0 text-slate-900 font-bold bg-white font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs transition-all border-2 border-slate-900 cursor-pointer shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none uppercase tracking-wider font-mono flex items-center justify-center gap-1.5"
                >
                  <LogIn className="h-4 w-4" /> Masuk Sekarang ⚡
                </button>
              </form>

              {/* QUICK LOGIN / TESTERS SECTION */}
              <div className="pt-4 border-t-2 border-dashed border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 justify-center">
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                  <span className="text-[9px] font-black text-slate-800 uppercase tracking-wider font-mono">AKUN DEMO UNTUK PENGUJI</span>
                </div>
                
                <p className="text-[10px] text-center text-slate-500">
                  Klik kartu di bawah untuk login instan otomatis:
                </p>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {db.members.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setLoginInput(m.email);
                        setLoginPassword(m.password || '123456');
                        onSelectMember(m.id);
                        setIsLoggedIn(true);
                      }}
                      className="w-full p-2 bg-white hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-900 rounded-xl transition-all cursor-pointer flex justify-between items-center text-left"
                    >
                      <div className="flex items-center gap-2">
                        {m.profileImage ? (
                          <img src={m.profileImage} alt={m.name} className="h-7 w-7 rounded-full object-cover shrink-0 border" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 font-black text-[10px] uppercase">
                            {m.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-[11px] font-extrabold text-slate-900 leading-none">{m.name}</p>
                          <p className="text-[8.5px] text-slate-400 font-mono mt-0.5">Pass: <strong className="text-slate-600">{m.password || 'klikka123'}</strong></p>
                        </div>
                      </div>
                      <span className="text-[8.5px] font-black bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 uppercase font-mono shrink-0">
                        Login ⚡
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <>
            {/* ORIGINAL DASHBOARD HEADER */}
            <header className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3.5 flex items-center justify-between shadow-md relative z-30 border-b border-red-700">
          <button 
            onClick={() => setMenuOpen(true)}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-all duration-150 cursor-pointer text-white flex items-center justify-center border border-transparent hover:border-white/20 active:scale-95"
            id="hamburger-menu-btn"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <span className="text-[12px] font-black tracking-widest text-red-100 font-mono flex items-center gap-1 animate-pulse">
              {db.config?.logoText || '⚡️ KLIKKA // PORTAL'}
            </span>
            <span className="text-[9px] font-bold text-red-200 font-mono tracking-wide uppercase mt-0.5">
              {db.config?.headerText || 'LOYALTY SYSTEM'}
            </span>
          </div>

          {/* User Tier Mini Badge */}
          <button 
            onClick={() => setActiveTab('setting')}
            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider border shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
              currentMember.tier === 'Gold' 
                ? 'bg-amber-400 text-amber-950 border-amber-300 hover:bg-amber-300' 
                : currentMember.tier === 'Silver' 
                  ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200' 
                  : 'bg-orange-500 text-white border-orange-400 hover:bg-orange-600'
            }`}
          >
            <span>{ts.icon}</span>
            <span>{currentMember.tier}</span>
          </button>
        </header>

        {/* SIDE BAR / DRAWER (HAMBURGER MENU) */}
        {menuOpen && (
          <>
            {/* Backdrop Overlay */}
            <div 
              className="absolute inset-0 bg-slate-950/75 z-40 transition-opacity duration-300 animate-in fade-in"
              onClick={() => setMenuOpen(false)}
            />
            {/* Drawer Content */}
            <div className="absolute top-0 left-0 h-full w-[285px] bg-slate-950 text-white z-50 shadow-2xl flex flex-col justify-between transition-transform duration-300 transform translate-x-0 border-r border-slate-800">
              
              {/* Drawer Upper */}
              <div>
                {/* Header Profile Info inside Drawer */}
                <div className="bg-gradient-to-br from-red-650 to-red-800 p-5 relative overflow-hidden border-b border-red-900">
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                    <QrCode className="h-28 w-28 text-white" />
                  </div>
                  <div className="flex justify-between items-start">
                    {currentMember.profileImage ? (
                      <img src={currentMember.profileImage} alt={currentMember.name} className="h-10 w-10 rounded-full object-cover border-2 border-white/50 shrink-0" />
                    ) : (
                      <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <button 
                      onClick={() => setMenuOpen(false)}
                      className="p-1 hover:bg-white/15 rounded-lg text-white border border-transparent hover:border-white/10 transition-all"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-[9px] text-red-100 font-mono tracking-widest uppercase">Halo, Member Favorit!</p>
                    <h3 className="font-black text-lg tracking-tight truncate max-w-[210px] mt-0.5">{currentMember.name}</h3>
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${
                        currentMember.tier === 'Gold' 
                          ? 'bg-amber-400 text-amber-950 border-amber-300' 
                          : currentMember.tier === 'Silver' 
                            ? 'bg-slate-200 text-slate-900 border-slate-300' 
                            : 'bg-orange-500 text-white border-orange-400'
                      }`}>
                        {currentMember.tier} TIER
                      </span>
                      <span className="text-[10px] font-black font-mono text-white bg-black/30 px-2 py-0.5 rounded border border-white/5">
                        {currentMember.points} PTS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Navigation Items List */}
                <nav className="p-4 space-y-1.5">
                  <button
                    onClick={() => { setActiveTab('beranda'); setMenuOpen(false); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'beranda'
                        ? 'bg-red-600 text-white font-black'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Home className="h-4.5 w-4.5" />
                      <span>Beranda Utama</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => { setActiveTab('promo'); setMenuOpen(false); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'promo'
                        ? 'bg-red-600 text-white font-black'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Ticket className="h-4.5 w-4.5" />
                      <span>Katalog & Tukar Voucher</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => { setActiveTab('riwayat'); setMenuOpen(false); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'riwayat'
                        ? 'bg-red-600 text-white font-black'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4.5 w-4.5" />
                      <span>Riwayat Mutasi Poin</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => { setActiveTab('setting'); setMenuOpen(false); }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'setting'
                        ? 'bg-red-600 text-white font-black'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="h-4.5 w-4.5" />
                      <span>Profil & Kartu Digital</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => {
                      setIsLoggedIn(false);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <LogIn className="h-4.5 w-4.5 rotate-180" />
                      <span>Keluar Akun (Log Out)</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </button>
                </nav>
              </div>

              {/* Drawer Bottom: Simulasi Member (Dapat diganti kapan saja) */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Ganti Akun Demo</span>
                </div>
                <div className="space-y-1">
                  {db.members.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectMember(m.id);
                        setMenuOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left text-[11px] font-bold flex justify-between items-center transition-all ${
                        m.id === currentMember.id
                          ? 'bg-red-600 border-red-600 text-white font-black shadow-md'
                          : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="truncate">{m.name.split(' ')[0]} ({m.tier})</span>
                      <span className="font-mono text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white">{m.points} PTS</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}

        {/* MAIN PANEL CONTENT (SCROLLABLE SCROLLPORT) */}
        <div className="flex-grow overflow-y-auto p-4 space-y-5 bg-slate-50 pb-24">
          
          {/* TAB 1: BERANDA */}
          {activeTab === 'beranda' && (
            <div className="space-y-5">
              
              {/* GEN Z BRAND GREETING & POINTS SUMMARY (Differentiated by Tier beautifully) */}
              <div className={`rounded-[24px] p-5 shadow-lg relative overflow-hidden transition-all duration-300 border-2 ${ts.cardBg} ${ts.glow}`}>
                {/* Decorative retro circles / grid elements inside card */}
                <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-[-30px] left-[-30px] w-24 h-24 bg-black/10 rounded-full blur-xl pointer-events-none" />
                
                {/* Sticker badge */}
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1">
                  <span className={`text-[8px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full font-mono shadow-sm ${ts.badgeBg}`}>
                    {ts.sticker}
                  </span>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                  {currentMember.profileImage ? (
                    <img src={currentMember.profileImage} alt={currentMember.name} className="h-14 w-14 rounded-full object-cover border-2 border-white shrink-0 shadow-md bg-white/10" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md border-2 border-white flex items-center justify-center shrink-0 shadow-md">
                      <User className={`h-7 w-7 ${ts.textColor}`} />
                    </div>
                  )}
                  <div className="space-y-1 min-w-0 flex-grow">
                    <span className={`text-[10px] font-mono font-black uppercase tracking-widest ${ts.textColor} opacity-80 block`}>
                      Halo, Kakak 👋 {ts.icon}
                    </span>
                    <h2 className={`text-xl font-black tracking-tight leading-none truncate ${ts.textColor}`}>
                      {currentMember.name}
                    </h2>
                    <p className={`text-[10px] font-mono mt-1 ${ts.mutedText}`}>
                      Level kamu saat ini: <strong className="underline">{currentMember.tier}</strong>
                    </p>
                  </div>
                </div>

                {/* Main Points Box */}
                <div className="mt-7 pt-4 border-t border-black/10 flex justify-between items-end">
                  <div>
                    <p className={`text-[9px] font-black tracking-widest font-mono uppercase ${ts.textColor} opacity-80`}>SALDO POIN SAYA</p>
                    <p className={`text-3xl font-black font-mono tracking-tight mt-1 flex items-baseline gap-1 ${ts.textColor}`}>
                      {currentMember.points.toLocaleString('id-ID')}
                      <span className="text-xs font-bold uppercase tracking-wider font-sans opacity-85">PTS</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('promo')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-[10px] transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-md uppercase tracking-wider border border-white/15"
                  >
                    Tukar <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* SLIDING PROMO CAROUSEL (RIGHT-TO-LEFT AUTOMATION) */}
              {activeAds.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-[10px] font-black tracking-wider text-slate-800 uppercase font-mono flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100 shadow-xs">
                      <Sparkles className="h-3.5 w-3.5 text-red-600 animate-spin-slow" />
                      Promo & Penawaran Spesial
                    </h3>
                    <span className="text-[10px] text-slate-400 font-black font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {activeAdIndex + 1}/{activeAds.length}
                    </span>
                  </div>

                  {/* The Sliding Container Wrapper */}
                  <div 
                    onClick={() => handleAdClick(activeAds[activeAdIndex])}
                    className="relative bg-slate-950 rounded-2xl overflow-hidden h-40 border-2 border-slate-900 cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 group flex flex-col justify-end"
                  >
                    {/* Background slide */}
                    <img 
                      src={activeAds[activeAdIndex].imageUrl} 
                      alt={activeAds[activeAdIndex].title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Dark gradient overlay for typography safety */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                    
                    {/* Content inside ad */}
                    <div className="relative p-4 text-white space-y-1">
                      <span className="text-[8px] bg-red-600 font-extrabold uppercase px-2 py-0.5 rounded tracking-widest inline-flex items-center gap-1 font-mono border border-red-500">
                        ⚡️ CLICK ME
                      </span>
                      <h4 className="font-black text-xs text-white leading-tight truncate">
                        {activeAds[activeAdIndex].title}
                      </h4>
                      <p className="text-[10px] text-slate-350 truncate">
                        {activeAds[activeAdIndex].description}
                      </p>
                    </div>

                    {/* Small sponsor advertiser badge */}
                    <span className="absolute top-3 right-3 bg-black/75 backdrop-blur-xs border border-white/10 text-[8px] font-mono text-white px-2 py-0.5 rounded-lg">
                      Ad: {activeAds[activeAdIndex].advertiser}
                    </span>
                  </div>

                  {/* Manual Carousel Indicators / Control */}
                  <div className="flex justify-center items-center gap-3">
                    <button 
                      onClick={() => setActiveAdIndex(prev => (prev === 0 ? activeAds.length - 1 : prev - 1))}
                      className="p-1 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 bg-white"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-700" />
                    </button>
                    <div className="flex gap-1.5">
                      {activeAds.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveAdIndex(i)}
                          className={`h-2 rounded-full transition-all ${
                            i === activeAdIndex ? 'bg-red-600 w-4' : 'bg-slate-300 w-2'
                          }`}
                        />
                      ))}
                    </div>
                    <button 
                      onClick={() => setActiveAdIndex(prev => (prev + 1) % activeAds.length)}
                      className="p-1 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 bg-white"
                    >
                      <ChevronRight className="h-4 w-4 text-slate-700" />
                    </button>
                  </div>
                </div>
              )}

              {/* CARA MENGGUNAKAN LOYALTY HUB (FULLY EDITABLE FROM CONFIG) */}
              <div className="bg-white rounded-2xl border-2 border-slate-900 p-4 text-xs space-y-3.5 shadow-md">
                <h4 className="font-black text-slate-900 uppercase font-mono text-[10px] tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-red-600" />
                  PANDUAN LOYALTY HUB
                </h4>
                <div className="space-y-2 text-slate-600 leading-relaxed font-medium">
                  <div className="flex gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-red-600 text-white font-mono text-[10px] font-black flex items-center justify-center shrink-0 border border-slate-900">1</span>
                    <p>{db.config?.guideStep1 || "Dapatkan poin otomatis dengan belanja photobooth atau menu merchandise partner Klikka."}</p>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-red-600 text-white font-mono text-[10px] font-black flex items-center justify-center shrink-0 border border-slate-900">2</span>
                    <p>{db.config?.guideStep2 || "Buka tab Katalog & Voucher untuk memilih reward yang sesuai dengan saldo poin Anda."}</p>
                  </div>
                  <div className="flex gap-2.5">
                    <span className="h-5 w-5 rounded-full bg-red-600 text-white font-mono text-[10px] font-black flex items-center justify-center shrink-0 border border-slate-900">3</span>
                    <p>{db.config?.guideStep3 || "Tunjukkan kartu keanggotaan digital di tab Setting untuk discan oleh kasir."}</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PROMO (VOUCHER CATALOG) */}
          {activeTab === 'promo' && (
            <div className="space-y-4">
              
              {/* SEARCH & FILTERS */}
              <div className="space-y-2.5">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari voucher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border-2 border-slate-900 bg-white focus:outline-none font-medium text-slate-800 shadow-sm"
                  />
                  <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-600" />
                </div>

                {/* Categories sliding menu */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-[10px] font-black border-2 border-slate-900 shrink-0 transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* CATALOG GRID */}
              {filteredRewards.length > 0 ? (
                <div className="space-y-3">
                  {filteredRewards.map(reward => {
                    const canRedeem = currentMember.points >= reward.pointsCost;
                    const hasStock = reward.stock > 0;

                    return (
                      <div 
                        key={reward.id} 
                        className="bg-white rounded-2xl overflow-hidden border-2 border-slate-900 shadow-sm flex flex-col sm:flex-row group"
                      >
                        {/* Image banner thumb */}
                        <div className="h-28 sm:w-28 relative overflow-hidden bg-slate-100 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-200">
                          <img 
                            src={reward.image} 
                            alt={reward.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute top-1.5 left-1.5 text-[8px] font-black uppercase tracking-wider bg-black/75 text-white px-2 py-0.5 rounded font-mono border border-white/10">
                            {reward.category}
                          </span>
                        </div>

                        {/* Content description */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                          <div>
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="font-black text-slate-900 text-xs leading-tight truncate max-w-[170px]">
                                {reward.title}
                              </h4>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                                hasStock ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {hasStock ? `Stok: ${reward.stock}` : 'Habis'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium line-clamp-2 mt-0.5 leading-normal">
                              {reward.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                            <div>
                              <span className="text-[8px] text-slate-400 uppercase font-mono block">Biaya Tukar</span>
                              <span className="text-xs font-black text-red-600 font-mono">
                                {reward.pointsCost.toLocaleString('id-ID')} PTS
                              </span>
                            </div>

                            <button
                              disabled={!canRedeem || !hasStock}
                              onClick={() => onRedeemReward(reward.id)}
                              className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95 border-2 border-slate-900 uppercase font-mono ${
                                canRedeem && hasStock
                                  ? 'bg-red-600 text-white hover:bg-red-500 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                                  : 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed'
                              }`}
                            >
                              <ShoppingBag className="h-3.5 w-3.5" />
                              Tukar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                  <ShoppingBag className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700">Tidak Ada Voucher</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Ubah kategori atau kata kunci pencarian.</p>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: RIWAYAT MUTASI POIN */}
          {activeTab === 'riwayat' && (
            <div className="space-y-4">
              
              {/* Summary stat box */}
              <div className="bg-slate-950 text-white rounded-2xl p-4 border-2 border-slate-900 shadow-md flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-[-10px] right-[-10px] opacity-10">
                  <TrendingUp className="h-24 w-24 text-white" />
                </div>
                <div>
                  <p className="text-[9px] text-red-500 font-mono tracking-widest uppercase font-black">MUTASI POIN SAYA</p>
                  <p className="text-xs font-bold mt-1 text-slate-300">Total Transaksi:</p>
                  <p className="text-lg font-black font-mono mt-0.5">{myTransactions.length} Aktivitas</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-red-500 font-mono tracking-widest uppercase font-black">SALDO UTAMA</p>
                  <p className="text-xl font-black font-mono mt-1 text-red-500">{currentMember.points} PTS</p>
                </div>
              </div>

              {/* MUTASI LIST */}
              <div className="bg-white rounded-2xl border-2 border-slate-900 p-3 shadow-xs space-y-1.5 max-h-[390px] overflow-y-auto">
                {myTransactions.length > 0 ? (
                  myTransactions.map(t => {
                    const isEarn = t.type === 'earn';
                    return (
                      <div 
                        key={t.id} 
                        className="flex justify-between items-center p-3 hover:bg-slate-50/50 border-b border-slate-100 last:border-b-0 gap-3 text-xs font-medium"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-slate-900 font-black truncate text-[11px]">{t.description}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[9px] text-slate-400 font-mono">
                              {new Date(t.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })} • {new Date(t.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {t.rewardCode && (
                            <div className="mt-1">
                              <span className="text-[8px] font-black text-red-700 font-mono bg-red-50 px-2 py-0.5 rounded border border-red-100 inline-block">
                                KODE REWARD: {t.rewardCode}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right shrink-0">
                          <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg border ${
                            isEarn 
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                              : 'text-red-700 bg-red-50 border-red-200'
                          }`}>
                            {isEarn ? `+${t.points}` : `-${t.points}`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10">
                    <Clock className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-extrabold text-slate-400 font-mono uppercase">Belum Ada Riwayat Mutasi</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Lakukan transaksi untuk melihat perolehan poin Anda.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: SETTING (EDIT PROFILE & MEMBERSHIP CARD) */}
          {activeTab === 'setting' && (
            <div className="space-y-5">
              
              {/* BRANDED DIGITAL MEMBERSHIP CARD (Differentiated by tier beautifully) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Kartu Digital Member</h4>
                  <span className="flex items-center gap-1 text-[9px] font-black text-red-600 font-mono uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" /> Live Status
                  </span>
                </div>

                {/* Custom Branded Tier-themed Loyalty card */}
                <div className={`relative rounded-2xl p-5 text-white border-2 border-slate-900 overflow-hidden shadow-lg ${ts.cardBg} ${ts.glow}`}>
                  {/* Glowing decoration */}
                  <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/15 rounded-full blur-xl pointer-events-none" />

                  {/* Top line */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`text-[8px] uppercase tracking-widest opacity-80 font-black font-mono block ${ts.textColor}`}>KLIKKA PHOTOBOOTH</span>
                      <span className={`text-sm font-black tracking-wide font-sans ${ts.textColor}`}>VIP DIGITAL MEMBERSHIP</span>
                    </div>
                    <span className={`text-[8px] font-black font-mono tracking-wider px-2.5 py-0.5 rounded-full uppercase border shadow-xs ${ts.badgeBg}`}>
                      {currentMember.tier} TIER
                    </span>
                  </div>

                  {/* Mid Points details */}
                  <div className="flex justify-between items-end mb-4">
                    <div className="min-w-0">
                      <p className={`text-[8px] uppercase tracking-wider opacity-75 font-mono ${ts.textColor}`}>NAMA ANGGOTA</p>
                      <p className={`text-sm font-black tracking-wide truncate max-w-[160px] mt-0.5 ${ts.textColor}`}>{currentMember.name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[8px] uppercase tracking-wider opacity-75 font-mono ${ts.textColor}`}>SALDO POIN</p>
                      <p className={`text-lg font-black font-mono leading-none mt-0.5 ${ts.textColor}`}>
                        {currentMember.points} <span className="text-[10px] font-bold opacity-85">PTS</span>
                      </p>
                    </div>
                  </div>

                  {/* Simulation Barcode */}
                  <div className="bg-black/15 p-2 rounded-xl border border-white/10 backdrop-blur-xs">
                    {renderBarcode(currentMember.barcode)}
                    <div className="text-center mt-2 font-mono text-[9px] opacity-85 tracking-widest uppercase font-black">
                      {currentMember.barcode}
                    </div>
                  </div>

                  {/* Footer details */}
                  <div className="mt-4 pt-2.5 border-t border-black/10 flex justify-between text-[8px] font-mono opacity-80 font-black">
                    <span>ID: {currentMember.id}</span>
                    <span>JOIN: {currentMember.joinDate}</span>
                  </div>
                </div>
              </div>

              {/* EDIT PROFILE CONTACT INFO */}
              <div className="bg-white rounded-2xl border-2 border-slate-900 p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <User className="h-4.5 w-4.5 text-red-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Perbarui Data Kontak</h4>
                </div>

                {updateSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-extrabold text-emerald-800 flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>Profil berhasil diperbarui di cloud database!</span>
                  </div>
                )}

                <form onSubmit={handleUpdateProfileSubmit} className="space-y-3">
                  {/* Photo Profile Uploader */}
                  <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border-2 border-slate-200">
                    <div className="relative group shrink-0">
                      {profileImage ? (
                        <img src={profileImage} alt="Preview Avatar" className="h-16 w-16 rounded-full object-cover border-2 border-red-600 shadow-md bg-white" />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-400 font-bold text-[10px] uppercase font-mono shadow-inner">
                          No Pic
                        </div>
                      )}
                    </div>
                    <div className="flex-grow space-y-1">
                      <label className="text-[9.5px] font-black text-slate-700 uppercase font-mono block">Foto Profil Member</label>
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="profile-pic-file-input"
                      />
                      <label 
                        htmlFor="profile-pic-file-input"
                        className="inline-block px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-extrabold text-[10px] rounded-lg border-2 border-red-200 transition-all cursor-pointer uppercase font-mono active:scale-95"
                      >
                        Pilih & Kompres Foto
                      </label>
                      <p className="text-[8px] text-slate-400 font-medium">Foto dikompres otomatis (&lt;5KB) agar load cepat.</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1 font-mono">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-slate-900 outline-none text-slate-800 font-bold bg-slate-50/50"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1 font-mono">Email</label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-slate-900 outline-none text-slate-800 bg-slate-50/50 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1 font-mono">Nomor Handphone</label>
                    <input
                      type="text"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-slate-900 outline-none text-slate-800 bg-slate-50/50 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1 font-mono">Password / PIN Akun</label>
                    <input
                      type="password"
                      placeholder="Masukkan PIN keamanan"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border-2 border-slate-200 focus:border-slate-900 outline-none text-slate-800 bg-slate-50/50 font-mono font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-all border-2 border-slate-900 cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none uppercase tracking-wider font-mono"
                  >
                    {isUpdating ? 'Menyimpan...' : 'Simpan Profil'}
                  </button>
                </form>

                <div className="pt-4 border-t-2 border-dashed border-slate-200">
                  <button
                    onClick={() => setIsLoggedIn(false)}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold rounded-xl text-xs transition-all border-2 border-red-100 cursor-pointer active:scale-95 uppercase tracking-wider font-mono flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="h-4 w-4 rotate-180" /> Keluar dari Akun
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* BOTTOM FIXED NAVIGATION NAV-BAR (iOS LOOK) */}
        <nav className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] select-none">
          <button
            onClick={() => setActiveTab('beranda')}
            className={`flex flex-col items-center gap-1 p-1 cursor-pointer transition-colors duration-150 ${
              activeTab === 'beranda' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[9px] font-black tracking-wide font-sans">Beranda</span>
          </button>

          <button
            onClick={() => setActiveTab('promo')}
            className={`flex flex-col items-center gap-1 p-1 cursor-pointer transition-colors duration-150 ${
              activeTab === 'promo' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Ticket className="h-5 w-5" />
            <span className="text-[9px] font-black tracking-wide font-sans">Promo</span>
          </button>

          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex flex-col items-center gap-1 p-1 cursor-pointer transition-colors duration-150 ${
              activeTab === 'riwayat' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-[9px] font-black tracking-wide font-sans">Riwayat</span>
          </button>

          <button
            onClick={() => setActiveTab('setting')}
            className={`flex flex-col items-center gap-1 p-1 cursor-pointer transition-colors duration-150 ${
              activeTab === 'setting' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[9px] font-black tracking-wide font-sans">Setting</span>
          </button>
        </nav>

        {/* CUSTOM AD PENAWARAN DETAIL DIALOG MODAL */}
        {selectedAd && (
          <div className="absolute inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl overflow-hidden w-full max-w-[320px] shadow-2xl border-2 border-slate-900 flex flex-col justify-between animate-in fade-in zoom-in duration-200">
              
              {/* Ad Cover header */}
              <div className="relative h-40 bg-slate-100">
                <img 
                  src={selectedAd.imageUrl} 
                  alt={selectedAd.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedAd(null)}
                  className="absolute top-2.5 right-2.5 bg-slate-950/65 backdrop-blur-xs p-1.5 rounded-xl text-white hover:bg-slate-950 border border-transparent hover:border-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                <span className="absolute bottom-2.5 left-2.5 text-[8px] bg-red-600 text-white font-extrabold uppercase px-1.5 py-0.2 rounded font-mono border border-red-500">
                  Ad Sponsor
                </span>
              </div>

              {/* Content Body */}
              <div className="p-4 space-y-2.5 flex-grow">
                <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                  {selectedAd.title}
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  {selectedAd.description}
                </p>
                <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                  <span>Penyelenggara: {selectedAd.advertiser}</span>
                  <span>Mulai: {selectedAd.startDate}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
                <button
                  onClick={() => setSelectedAd(null)}
                  className="flex-1 py-2 bg-white hover:bg-slate-100 border-2 border-slate-900 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer uppercase font-mono"
                >
                  Tutup
                </button>
                <button
                  onClick={() => executeAdAction(selectedAd)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs border-2 border-slate-900 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 uppercase font-mono shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                >
                  Klaim Promo <ExternalLink className="h-3 w-3" />
                </button>
              </div>

            </div>
          </div>
        )}
          </>
        )}

      </div>

    </div>
  );
}
