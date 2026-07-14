import React, { useState } from 'react';
import { Check, Copy, X, QrCode, AlertCircle, Coffee } from 'lucide-react';
import { Reward, Transaction } from '../types';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  reward: Reward | null;
  transaction: Transaction | null;
}

export default function VoucherModal({ isOpen, onClose, reward, transaction }: VoucherModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !reward || !transaction) return null;

  const handleCopy = () => {
    if (transaction.rewardCode) {
      navigator.clipboard.writeText(transaction.rewardCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200 animate-scale-up">
        {/* Confetti-style colored header */}
        <div className="bg-slate-900 p-5 text-center text-white relative border-b border-slate-800">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="mx-auto bg-slate-800 p-2.5 rounded w-12 h-12 flex items-center justify-center mb-2.5 border border-slate-700">
            <Check className="h-6 w-6 text-emerald-400" />
          </div>
          <h3 className="text-base font-bold tracking-tight font-sans">Penukaran Sukses!</h3>
          <p className="text-xs text-slate-400 mt-0.5">Poin berhasil ditukarkan dengan voucher.</p>
        </div>

        {/* Reward detail preview */}
        <div className="p-5">
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4">
            <img 
              src={reward.image} 
              alt={reward.title} 
              className="w-14 h-14 rounded object-cover border border-slate-200 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                {reward.category}
              </span>
              <h4 className="text-xs font-bold text-slate-900 mt-1 leading-tight truncate">{reward.title}</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{reward.pointsCost} Poin Ditukarkan</p>
            </div>
          </div>

          {/* QR Code and Code box */}
          <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50/50 mb-4">
            {/* Fake QR code using lucide icon and grid style */}
            <div className="p-2 bg-white rounded border border-slate-200 mb-3">
              <QrCode className="h-28 w-28 text-slate-800" />
            </div>

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Kode Voucher Anda</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-lg font-extrabold tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded border border-emerald-100">
                {transaction.rewardCode}
              </span>
              <button 
                onClick={handleCopy}
                className="p-2 rounded border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Salin Kode"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500 animate-bounce" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Redemptions Steps */}
          <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-700 font-mono">Cara Penggunaan:</h5>
            <ol className="text-xs text-slate-600 space-y-1 list-decimal pl-4 leading-normal">
              <li>Kunjungi outlet merchant terdekat sesuai dengan produk voucher.</li>
              <li>Tunjukkan halaman detail atau scan kode QR ini saat memesan di kasir sebelum melakukan pembayaran.</li>
              <li>Kasir akan memverifikasi kode voucher dan memotong biaya transaksi Anda.</li>
            </ol>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-800 text-[10px] leading-normal">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Jangan membagikan kode voucher Anda kepada orang lain sebelum digunakan. Berlaku satu kali penukaran.</span>
          </div>
        </div>

        {/* Modal Action footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-xs transition-all active:scale-[0.98] cursor-pointer text-xs uppercase tracking-wider font-mono"
          >
            Selesai & Simpan Voucher
          </button>
        </div>
      </div>
    </div>
  );
}
