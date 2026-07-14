/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  points: number;
  totalPointsEarned: number;
  tier: 'Bronze' | 'Silver' | 'Gold';
  joinDate: string;
  barcode: string;
  password?: string; // Gen Z password / pin field
  profileImage?: string; // Base64 compressed profile image
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  stock: number;
  image: string;
  category: 'Voucher' | 'Merchandise' | 'Food & Beverage' | 'Services';
  codePattern: string; // e.g. "VCHR-XXXX"
}

export interface Transaction {
  id: string;
  memberId: string;
  memberName: string;
  type: 'earn' | 'redeem';
  description: string;
  points: number;
  date: string;
  rewardId?: string;
  rewardCode?: string;
}

export interface Advertisement {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  status: 'active' | 'inactive';
  location: 'hero' | 'sidebar' | 'popup';
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
  advertiser: string;
}

export interface TransactionPreset {
  name: string;
  amount: string;
  points: number;
  desc: string;
}

export interface AppConfig {
  headerText: string;
  logoText: string;
  guideStep1: string;
  guideStep2: string;
  guideStep3: string;
  presets?: TransactionPreset[];
  adminEmail?: string;
  adminPassword?: string;
}

export interface DatabaseState {
  members: Member[];
  rewards: Reward[];
  transactions: Transaction[];
  ads: Advertisement[];
  config?: AppConfig;
}
