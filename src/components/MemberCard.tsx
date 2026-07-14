import React from 'react';
import { Award, Sparkles, Shield, Mail, Phone, Calendar } from 'lucide-react';
import { Member } from '../types';

interface MemberCardProps {
  member: Member;
}

export default function MemberCard({ member }: MemberCardProps) {
  const isGold = member.tier === 'Gold';
  const isSilver = member.tier === 'Silver';

  // Tier theme styling
  const cardThemes = {
    Gold: {
      bg: 'from-amber-500 via-yellow-600 to-amber-700 text-white border-amber-400',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: <Sparkles className="h-6 w-6 text-yellow-200 animate-pulse" />,
      text: 'text-amber-100',
      pill: 'bg-yellow-400/20 text-yellow-100'
    },
    Silver: {
      bg: 'from-slate-400 via-gray-500 to-slate-600 text-white border-slate-300',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      icon: <Award className="h-6 w-6 text-slate-200" />,
      text: 'text-slate-100',
      pill: 'bg-slate-200/20 text-slate-100'
    },
    Bronze: {
      bg: 'from-amber-700 via-orange-800 to-amber-900 text-white border-amber-600',
      badge: 'bg-orange-100 text-orange-900 border-orange-300',
      icon: <Shield className="h-6 w-6 text-orange-300" />,
      text: 'text-orange-200',
      pill: 'bg-orange-900/40 text-orange-200'
    }
  };

  const theme = cardThemes[member.tier];

  // Helper to generate a fake barcode graphic
  const generateBarcodeLines = (code: string) => {
    const chars = code.split('');
    return (
      <div className="flex items-center justify-center bg-white p-2 rounded-md h-12 w-full gap-[2px] overflow-hidden select-none">
        {chars.map((char, idx) => {
          const widthClass = idx % 3 === 0 ? 'w-1' : idx % 2 === 0 ? 'w-[2px]' : 'w-[3px]';
          const opacity = (char.charCodeAt(0) % 5 === 0) ? 'bg-transparent' : 'bg-gray-900';
          return <div key={idx} className={`h-8 ${widthClass} ${opacity}`} />;
        })}
      </div>
    );
  };

  return (
    <div className={`relative rounded-xl p-5 shadow-lg border overflow-hidden hologram-card bg-gradient-to-br ${theme.bg}`}>
      {/* Holographic light effect (simulated via absolute glow blobs) */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/20 rounded-full blur-2xl" />

      {/* Card Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest opacity-80 font-bold font-mono">
            Digital Membership
          </span>
          <h3 className="text-lg font-black tracking-wider mt-0.5 font-mono text-white">LOYALTY.HUB</h3>
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs border border-white/20 ${theme.pill}`}>
          {theme.icon}
          {member.tier}
        </div>
      </div>

      {/* Points & Name info */}
      <div className="mb-4 flex justify-between items-end">
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider opacity-75 font-mono">Nama Anggota</p>
          <p className="text-base font-bold tracking-wide truncate max-w-[170px] text-white">{member.name}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider opacity-75 font-mono">Saldo Poin</p>
          <p className="text-2xl font-black tracking-tight text-white">{member.points.toLocaleString('id-ID')} <span className="text-xs font-semibold opacity-80 font-mono">PTS</span></p>
        </div>
      </div>

      {/* Barcode representation */}
      <div className="mt-4 bg-black/15 p-2.5 rounded border border-white/10 backdrop-blur-xs">
        {generateBarcodeLines(member.barcode)}
        <div className="text-center mt-1 font-mono text-[10px] opacity-80 tracking-widest uppercase text-white">
          {member.barcode}
        </div>
      </div>

      {/* Card Footer details */}
      <div className="mt-4 pt-2.5 border-t border-white/15 flex justify-between text-[9px] font-mono opacity-80 text-white/90">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>JOIN: {new Date(member.joinDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' })}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>ID: {member.id}</span>
        </div>
      </div>
    </div>
  );
}
