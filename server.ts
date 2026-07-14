import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { createServer as createViteServer } from 'vite';
import { DatabaseState, Member, Reward, Transaction, Advertisement } from './src/types';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, writeBatch, getDocFromServer } from 'firebase/firestore';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Read Firebase Config synchronously or fallback to environment variables
let firebaseConfig: any;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fsSync.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fsSync.readFileSync(configPath, 'utf-8'));
  } else {
    throw new Error("Config file not found");
  }
} catch (e) {
  // Fallback to Environment Variables for easy production/GitHub/Vercel deployment
  firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.FIREBASE_APP_ID || "",
    firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || ""
  };
}
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || undefined);

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
    console.log("Koneksi Firestore Berhasil!");
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Harap periksa konfigurasi Firebase Anda.");
    }
  }
}
testConnection();

// Error handler enum & interfaces
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to generate voucher codes
function generateVoucherCode(pattern: string): string {
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  if (pattern.includes('XXXX')) {
    return pattern.replace('XXXX', randomChars);
  }
  return `${pattern}-${randomChars}`;
}

const DEFAULT_DB: DatabaseState = {
  members: [
    {
      id: "M-001",
      name: "Budi Santoso",
      email: "budi.santoso@example.com",
      phone: "+62 812-3456-7890",
      points: 2450,
      totalPointsEarned: 4500,
      tier: "Gold",
      joinDate: "2025-01-15",
      barcode: "MEMBER-BUDI-2450",
      password: "klikka123"
    },
    {
      id: "M-002",
      name: "Siti Rahma",
      email: "siti.rahma@example.com",
      phone: "+62 856-9876-5432",
      points: 850,
      totalPointsEarned: 1850,
      tier: "Silver",
      joinDate: "2025-03-10",
      barcode: "MEMBER-SITI-850",
      password: "siti123"
    },
    {
      id: "M-003",
      name: "Andi Wijaya",
      email: "andi.wijaya@example.com",
      phone: "+62 819-2233-4455",
      points: 150,
      totalPointsEarned: 350,
      tier: "Bronze",
      joinDate: "2025-05-20",
      barcode: "MEMBER-ANDI-150",
      password: "andi123"
    }
  ],
  rewards: [
    {
      id: "R-001",
      title: "Voucher Kopi Latte Gratis",
      description: "Nikmati 1 cup Kopi Latte gratis di gerai Kopi Kenangan terdekat. Berlaku hingga 31 Desember 2026.",
      pointsCost: 450,
      stock: 35,
      image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=400",
      category: "Food & Beverage",
      codePattern: "LATTE-XXXX"
    },
    {
      id: "R-002",
      title: "Tumbler Stainless Premium",
      description: "Tumbler stainless steel tahan panas/dingin hingga 12 jam dengan logo Loyalty Hub eksklusif.",
      pointsCost: 1200,
      stock: 8,
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=400",
      category: "Merchandise",
      codePattern: "TMBLR-XXXX"
    },
    {
      id: "R-003",
      title: "Voucher Diskon Belanja Rp 100.000",
      description: "Potongan langsung Rp 100.000 tanpa minimum transaksi di gerai minimarket Indomaret & Alfamart.",
      pointsCost: 900,
      stock: 15,
      image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=400",
      category: "Voucher",
      codePattern: "SHOP100K-XXXX"
    },
    {
      id: "R-004",
      title: "Paket Perawatan Rambut Salon",
      description: "Layanan cuci, potong, dan creambath gratis di Hair Studio pilihan Anda.",
      pointsCost: 1800,
      stock: 4,
      image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=400",
      category: "Services",
      codePattern: "HAIRCARE-XXXX"
    }
  ],
  transactions: [
    {
      id: "T-001",
      memberId: "M-001",
      memberName: "Budi Santoso",
      type: "earn",
      description: "Pembelian Menu Paket Lunch Double",
      points: 150,
      date: new Date(Date.now() - 3600000 * 5).toISOString() // 5 hours ago
    },
    {
      id: "T-002",
      memberId: "M-001",
      memberName: "Budi Santoso",
      type: "redeem",
      description: "Penukaran Tumbler Stainless Premium",
      points: 1200,
      date: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
      rewardId: "R-002",
      rewardCode: "TMBLR-A9F2K"
    },
    {
      id: "T-003",
      memberId: "M-002",
      memberName: "Siti Rahma",
      type: "earn",
      description: "Pembelian Kopi Espresso Blend",
      points: 50,
      date: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
    },
    {
      id: "T-004",
      memberId: "M-003",
      memberName: "Andi Wijaya",
      type: "earn",
      description: "Bonus Registrasi Anggota Baru",
      points: 150,
      date: new Date(Date.now() - 3600000 * 24).toISOString() // 24 hours ago
    }
  ],
  ads: [
    {
      id: "A-001",
      title: "Promo Gila-Gilaan Weekend!",
      description: "Dapatkan cashback s/d 30% untuk semua transaksi makan-minum menggunakan Gopay di mitra merchant pilihan.",
      imageUrl: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800",
      targetUrl: "https://gopay.co.id",
      status: "active",
      location: "hero",
      impressions: 142,
      clicks: 18,
      startDate: "2026-07-10",
      endDate: "2026-07-20",
      advertiser: "Gopay Indonesia"
    },
    {
      id: "A-002",
      title: "New Product Launch: Sea Salt Cream Cold Brew!",
      description: "Rasakan kesegaran cold brew kopi premium berbalut cream gurih dan sea salt terbaik. Hanya Rp 25.000!",
      imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=500",
      targetUrl: "https://kopikenangan.com",
      status: "active",
      location: "sidebar",
      impressions: 98,
      clicks: 12,
      startDate: "2026-07-12",
      endDate: "2026-07-26",
      advertiser: "Kopi Kenangan Group"
    },
    {
      id: "A-003",
      title: "Spesial Gaji Rewards Day!",
      description: "Tukarkan voucher diskon belanja Alfamart hari ini hemat 150 poin dari harga normal!",
      imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=500",
      targetUrl: "https://alfamart.co.id",
      status: "inactive",
      location: "popup",
      impressions: 0,
      clicks: 0,
      startDate: "2026-07-25",
      endDate: "2026-07-31",
      advertiser: "Alfamart Corp"
    }
  ],
  config: {
    headerText: "Loyalty Hub",
    logoText: "⚡️ KLIKKA // PORTAL",
    guideStep1: "Dapatkan poin otomatis dengan belanja photobooth atau menu merchandise partner Klikka.",
    guideStep2: "Buka tab Katalog & Voucher untuk memilih reward yang sesuai dengan saldo poin Anda.",
    guideStep3: "Tunjukkan kartu keanggotaan digital di tab Setting untuk discan oleh kasir.",
    presets: [
      { name: 'Regular Photobooth 📸', amount: '35000', points: 3, desc: 'Sesi Regular Klikka Photobooth' },
      { name: 'Wide Angle Session ⚡️', amount: '50000', points: 5, desc: 'Sesi Wide Angle Klikka Photobooth' },
      { name: 'Merchandise Premium 👕', amount: '100000', points: 10, desc: 'Pembelian Merchandise Premium Klikka' },
      { name: 'Promo Combo Special 🔥', amount: '150000', points: 15, desc: 'Sesi Combo Photo + Keychain Premium' },
    ],
    adminEmail: "admin@klikka.com",
    adminPassword: "admin123"
  }
};

// Seed Firestore Database with default values if empty
async function seedDatabase(): Promise<void> {
  const batch = writeBatch(firestoreDb);

  DEFAULT_DB.members.forEach(m => {
    batch.set(doc(firestoreDb, 'members', m.id), m);
  });

  DEFAULT_DB.rewards.forEach(r => {
    batch.set(doc(firestoreDb, 'rewards', r.id), r);
  });

  DEFAULT_DB.transactions.forEach(t => {
    batch.set(doc(firestoreDb, 'transactions', t.id), t);
  });

  DEFAULT_DB.ads.forEach(a => {
    batch.set(doc(firestoreDb, 'ads', a.id), a);
  });

  if (DEFAULT_DB.config) {
    batch.set(doc(firestoreDb, 'config', 'app_config'), DEFAULT_DB.config);
  }

  try {
    await batch.commit();
    console.log("Seeding default data ke Firestore berhasil!");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch-seed');
  }
}

// Database read/write helpers using Firestore
async function readDatabase(): Promise<DatabaseState> {
  try {
    const [membersSnap, rewardsSnap, transactionsSnap, adsSnap, configSnap] = await Promise.all([
      getDocs(collection(firestoreDb, 'members')),
      getDocs(collection(firestoreDb, 'rewards')),
      getDocs(collection(firestoreDb, 'transactions')),
      getDocs(collection(firestoreDb, 'ads')),
      getDocFromServer(doc(firestoreDb, 'config', 'app_config'))
    ]);

    const members: Member[] = [];
    membersSnap.forEach(d => {
      members.push(d.data() as Member);
    });

    const rewards: Reward[] = [];
    rewardsSnap.forEach(d => {
      rewards.push(d.data() as Reward);
    });

    const transactions: Transaction[] = [];
    transactionsSnap.forEach(d => {
      transactions.push(d.data() as Transaction);
    });

    const ads: Advertisement[] = [];
    adsSnap.forEach(d => {
      ads.push(d.data() as Advertisement);
    });

    let config = DEFAULT_DB.config;
    if (configSnap.exists()) {
      config = {
        ...DEFAULT_DB.config,
        ...(configSnap.data() as any)
      };
    }

    // If database is completely empty, initialize and seed with default data
    if (members.length === 0 && rewards.length === 0 && ads.length === 0) {
      console.log("Firestore kosong. Menyiapkan database loyalty...");
      await seedDatabase();
      return DEFAULT_DB;
    }

    // Sort transactions by date descending (match initial expectation)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      members,
      rewards,
      transactions,
      ads,
      config
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'readDatabase');
    return DEFAULT_DB;
  }
}

async function writeDatabase(state: DatabaseState): Promise<void> {
  try {
    const [membersSnap, rewardsSnap, transactionsSnap, adsSnap] = await Promise.all([
      getDocs(collection(firestoreDb, 'members')),
      getDocs(collection(firestoreDb, 'rewards')),
      getDocs(collection(firestoreDb, 'transactions')),
      getDocs(collection(firestoreDb, 'ads'))
    ]);

    const existingMemberIds = membersSnap.docs.map(d => d.id);
    const existingRewardIds = rewardsSnap.docs.map(d => d.id);
    const existingTransactionIds = transactionsSnap.docs.map(d => d.id);
    const existingAdIds = adsSnap.docs.map(d => d.id);

    const batch = writeBatch(firestoreDb);

    // Save/update members
    const newMemberIds = state.members.map(m => m.id);
    state.members.forEach(m => {
      batch.set(doc(firestoreDb, 'members', m.id), m);
    });
    existingMemberIds.forEach(id => {
      if (!newMemberIds.includes(id)) {
        batch.delete(doc(firestoreDb, 'members', id));
      }
    });

    // Save/update rewards
    const newRewardIds = state.rewards.map(r => r.id);
    state.rewards.forEach(r => {
      batch.set(doc(firestoreDb, 'rewards', r.id), r);
    });
    existingRewardIds.forEach(id => {
      if (!newRewardIds.includes(id)) {
        batch.delete(doc(firestoreDb, 'rewards', id));
      }
    });

    // Save/update transactions
    const newTransactionIds = state.transactions.map(t => t.id);
    state.transactions.forEach(t => {
      batch.set(doc(firestoreDb, 'transactions', t.id), t);
    });
    existingTransactionIds.forEach(id => {
      if (!newTransactionIds.includes(id)) {
        batch.delete(doc(firestoreDb, 'transactions', id));
      }
    });

    // Save/update ads
    const newAdIds = state.ads.map(a => a.id);
    state.ads.forEach(a => {
      batch.set(doc(firestoreDb, 'ads', a.id), a);
    });
    existingAdIds.forEach(id => {
      if (!newAdIds.includes(id)) {
        batch.delete(doc(firestoreDb, 'ads', id));
      }
    });

    // Save/update config
    if (state.config) {
      batch.set(doc(firestoreDb, 'config', 'app_config'), state.config);
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'writeDatabase');
  }
}

// REST API Endpoints

// 1. Get database state
app.get('/api/db', async (req, res) => {
  try {
    const db = await readDatabase();
    res.json(db);
  } catch (err) {
    res.status(500).json({ error: 'Gagal membaca database', details: String(err) });
  }
});

// 2. Reset database state
app.post('/api/db/reset', async (req, res) => {
  try {
    await writeDatabase(DEFAULT_DB);
    res.json({ message: 'Database direset ke bawaan', data: DEFAULT_DB });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mereset database', details: String(err) });
  }
});

// 3. Earn Points (Simulasi Transaksi Pembelian)
app.post('/api/members/earn', async (req, res) => {
  try {
    const { memberId, points, description } = req.body;
    if (!memberId || !points) {
      return res.status(400).json({ error: 'Data memberId dan points diperlukan.' });
    }

    const db = await readDatabase();
    const memberIndex = db.members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Anggota tidak ditemukan.' });
    }

    const ptsNum = parseInt(points, 10);
    const member = db.members[memberIndex];
    member.points += ptsNum;
    member.totalPointsEarned += ptsNum;

    // Recalculate Tier
    if (member.totalPointsEarned >= 3000) {
      member.tier = 'Gold';
    } else if (member.totalPointsEarned >= 1000) {
      member.tier = 'Silver';
    } else {
      member.tier = 'Bronze';
    }

    const transaction: Transaction = {
      id: `T-${Date.now().toString().slice(-5)}`,
      memberId: member.id,
      memberName: member.name,
      type: 'earn',
      description: description || 'Pembelian Produk Berhasil',
      points: ptsNum,
      date: new Date().toISOString()
    };

    db.transactions.unshift(transaction); // Add to beginning
    await writeDatabase(db);

    res.json({ member, transaction });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambahkan poin', details: String(err) });
  }
});

// 4. Redeem Points for Reward
app.post('/api/rewards/redeem', async (req, res) => {
  try {
    const { memberId, rewardId } = req.body;
    if (!memberId || !rewardId) {
      return res.status(400).json({ error: 'Data memberId dan rewardId diperlukan.' });
    }

    const db = await readDatabase();
    const member = db.members.find(m => m.id === memberId);
    if (!member) {
      return res.status(404).json({ error: 'Anggota tidak ditemukan.' });
    }

    const reward = db.rewards.find(r => r.id === rewardId);
    if (!reward) {
      return res.status(404).json({ error: 'Voucher reward tidak ditemukan.' });
    }

    if (reward.stock <= 0) {
      return res.status(400).json({ error: 'Stok reward sudah habis.' });
    }

    if (member.points < reward.pointsCost) {
      return res.status(400).json({ error: 'Poin anggota tidak mencukupi untuk menukar reward ini.' });
    }

    // Process redemption
    member.points -= reward.pointsCost;
    reward.stock -= 1;

    const rewardCode = generateVoucherCode(reward.codePattern);

    const transaction: Transaction = {
      id: `T-${Date.now().toString().slice(-5)}`,
      memberId: member.id,
      memberName: member.name,
      type: 'redeem',
      description: `Penukaran ${reward.title}`,
      points: reward.pointsCost,
      date: new Date().toISOString(),
      rewardId: reward.id,
      rewardCode: rewardCode
    };

    db.transactions.unshift(transaction);
    await writeDatabase(db);

    res.json({ member, reward, transaction });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menukarkan reward', details: String(err) });
  }
});

// 5. Create or Edit Reward
app.post('/api/rewards', async (req, res) => {
  try {
    const rewardData: Partial<Reward> = req.body;
    const db = await readDatabase();

    if (rewardData.id) {
      // Edit mode
      const index = db.rewards.findIndex(r => r.id === rewardData.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Reward tidak ditemukan.' });
      }
      db.rewards[index] = { ...db.rewards[index], ...rewardData } as Reward;
      res.json({ message: 'Reward berhasil diperbarui', rewards: db.rewards });
    } else {
      // Create mode
      const newReward: Reward = {
        id: `R-${Date.now().toString().slice(-4)}`,
        title: rewardData.title || 'Reward Baru',
        description: rewardData.description || 'Deskripsi reward.',
        pointsCost: Number(rewardData.pointsCost) || 100,
        stock: Number(rewardData.stock) || 10,
        image: rewardData.image || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=400',
        category: rewardData.category || 'Voucher',
        codePattern: rewardData.codePattern || 'VCHR-XXXX'
      };
      db.rewards.push(newReward);
      res.json({ message: 'Reward berhasil ditambahkan', rewards: db.rewards });
    }

    await writeDatabase(db);
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan reward', details: String(err) });
  }
});

// 6. Delete Reward
app.delete('/api/rewards/:id', async (req, res) => {
  try {
    const db = await readDatabase();
    const updatedRewards = db.rewards.filter(r => r.id !== req.params.id);
    if (updatedRewards.length === db.rewards.length) {
      return res.status(404).json({ error: 'Reward tidak ditemukan.' });
    }
    db.rewards = updatedRewards;
    await writeDatabase(db);
    res.json({ message: 'Reward berhasil dihapus', rewards: db.rewards });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus reward', details: String(err) });
  }
});

// 7. Create or Edit Ad
app.post('/api/ads', async (req, res) => {
  try {
    const adData: Partial<Advertisement> = req.body;
    const db = await readDatabase();

    if (adData.id) {
      // Edit
      const index = db.ads.findIndex(a => a.id === adData.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Iklan tidak ditemukan.' });
      }
      db.ads[index] = { ...db.ads[index], ...adData } as Advertisement;
      res.json({ message: 'Iklan berhasil diperbarui', ads: db.ads });
    } else {
      // Create
      const newAd: Advertisement = {
        id: `A-${Date.now().toString().slice(-4)}`,
        title: adData.title || 'Promosi Iklan Baru',
        description: adData.description || 'Keterangan detail promo diskon produk partner.',
        imageUrl: adData.imageUrl || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800',
        targetUrl: adData.targetUrl || 'https://google.com',
        status: adData.status || 'active',
        location: adData.location || 'hero',
        impressions: 0,
        clicks: 0,
        startDate: adData.startDate || new Date().toISOString().split('T')[0],
        endDate: adData.endDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        advertiser: adData.advertiser || 'Mitra Usaha'
      };
      db.ads.push(newAd);
      res.json({ message: 'Iklan berhasil ditambahkan', ads: db.ads });
    }

    await writeDatabase(db);
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan promosi iklan', details: String(err) });
  }
});

// 8. Delete Ad
app.delete('/api/ads/:id', async (req, res) => {
  try {
    const db = await readDatabase();
    const updatedAds = db.ads.filter(a => a.id !== req.params.id);
    if (updatedAds.length === db.ads.length) {
      return res.status(404).json({ error: 'Iklan tidak ditemukan.' });
    }
    db.ads = updatedAds;
    await writeDatabase(db);
    res.json({ message: 'Iklan berhasil dihapus', ads: db.ads });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus promosi iklan', details: String(err) });
  }
});

// 9. Track Ad Impressions & Clicks (Analytics)
app.post('/api/ads/track', async (req, res) => {
  try {
    const { adId, actionType } = req.body; // actionType is 'impression' or 'click'
    if (!adId || !actionType) {
      return res.status(400).json({ error: 'adId dan actionType diperlukan.' });
    }

    const db = await readDatabase();
    const ad = db.ads.find(a => a.id === adId);
    if (!ad) {
      return res.status(404).json({ error: 'Iklan tidak ditemukan.' });
    }

    if (actionType === 'impression') {
      ad.impressions += 1;
    } else if (actionType === 'click') {
      ad.clicks += 1;
    }

    await writeDatabase(db);
    res.json({ success: true, adId, impressions: ad.impressions, clicks: ad.clicks });
  } catch (err) {
    res.status(500).json({ error: 'Gagal melacak iklan', details: String(err) });
  }
});

// 10. Update Member Details (Profile & Admin edit)
app.post('/api/members/update', async (req, res) => {
  try {
    const { id, name, email, phone, password, points, tier, profileImage } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'ID anggota diperlukan.' });
    }

    const db = await readDatabase();
    const memberIndex = db.members.findIndex(m => m.id === id);
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Anggota tidak ditemukan.' });
    }

    db.members[memberIndex].name = name !== undefined ? name : db.members[memberIndex].name;
    db.members[memberIndex].email = email !== undefined ? email : db.members[memberIndex].email;
    db.members[memberIndex].phone = phone !== undefined ? phone : db.members[memberIndex].phone;
    db.members[memberIndex].password = password !== undefined ? password : db.members[memberIndex].password;
    db.members[memberIndex].profileImage = profileImage !== undefined ? profileImage : db.members[memberIndex].profileImage;
    
    if (points !== undefined) {
      db.members[memberIndex].points = Number(points);
    }
    if (tier !== undefined) {
      db.members[memberIndex].tier = tier;
    }

    await writeDatabase(db);
    res.json({ message: 'Profil berhasil diperbarui', member: db.members[memberIndex] });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui profil', details: String(err) });
  }
});

// 11. Register New Member
app.post('/api/members/register', async (req, res) => {
  try {
    const { name, email, phone, initialPoints, password } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nama lengkap diperlukan.' });
    }

    const db = await readDatabase();
    
    // Check if email already registered (only if provided and non-empty)
    if (email && email.trim() !== '') {
      const exists = db.members.some(m => m.email && m.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: 'Email sudah terdaftar.' });
      }
    }

    const nextIdNum = db.members.length + 1;
    const paddedId = String(nextIdNum).padStart(3, '0');
    const newId = `M-${paddedId}`;
    const pts = Number(initialPoints) || 0;

    let tier: 'Bronze' | 'Silver' | 'Gold' = 'Bronze';
    if (pts >= 3000) {
      tier = 'Gold';
    } else if (pts >= 1000) {
      tier = 'Silver';
    }

    const newMember: Member = {
      id: newId,
      name,
      email: email || '',
      phone: phone || '-',
      points: pts,
      totalPointsEarned: pts,
      tier,
      joinDate: new Date().toISOString().split('T')[0],
      barcode: `MEMBER-${name.toUpperCase().replace(/\s+/g, '-')}-${pts}`,
      password: password || '123456'
    };

    db.members.push(newMember);

    // If initial points > 0, create a transaction log too
    if (pts > 0) {
      const transaction: Transaction = {
        id: `T-${Date.now().toString().slice(-5)}`,
        memberId: newId,
        memberName: name,
        type: 'earn',
        description: 'Poin awal pendaftaran anggota baru',
        points: pts,
        date: new Date().toISOString()
      };
      db.transactions.unshift(transaction);
    }

    await writeDatabase(db);
    res.json({ message: 'Anggota berhasil didaftarkan!', member: newMember });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mendaftarkan anggota baru.', details: String(err) });
  }
});

// 12. Save App Configuration
app.post('/api/config', async (req, res) => {
  try {
    const { headerText, logoText, guideStep1, guideStep2, guideStep3, presets, adminEmail, adminPassword } = req.body;
    const db = await readDatabase();
    
    db.config = {
      headerText: headerText || (db.config?.headerText || "Loyalty Hub"),
      logoText: logoText || (db.config?.logoText || "⚡️ KLIKKA // PORTAL"),
      guideStep1: guideStep1 !== undefined ? guideStep1 : (db.config?.guideStep1 || ""),
      guideStep2: guideStep2 !== undefined ? guideStep2 : (db.config?.guideStep2 || ""),
      guideStep3: guideStep3 !== undefined ? guideStep3 : (db.config?.guideStep3 || ""),
      presets: presets !== undefined ? presets : (db.config?.presets || []),
      adminEmail: adminEmail !== undefined ? adminEmail : (db.config?.adminEmail || "admin@klikka.com"),
      adminPassword: adminPassword !== undefined ? adminPassword : (db.config?.adminPassword || "admin123")
    };
    
    await writeDatabase(db);
    res.json({ message: 'Konfigurasi sukses disimpan', config: db.config });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan konfigurasi', details: String(err) });
  }
});

// Setup Vite Dev server or static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Loyalty Hub running on http://localhost:${PORT}`);
  });
}

startServer();
