
import React from 'react';
import Card from '../components/Card';

const Reconciliation: React.FC = () => {
    return (
        <Card>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Rekonsiliasi Bank</h2>
            <div className="text-center text-gray-400 py-8 px-4 rounded-lg bg-slate-800/50">
                <div className="text-4xl mb-4">🏦</div>
                <h3 className="text-xl font-semibold text-white mb-2">Fitur Sedang Dalam Pengembangan</h3>
                <p className="max-w-2xl mx-auto">
                    Modul Rekonsiliasi Bank akan segera hadir! Fitur ini akan membantu Anda membandingkan transaksi yang tercatat di pembukuan Anda (seperti di akun Kas atau Bank) dengan laporan rekening koran dari bank.
                </p>
                <p className="max-w-2xl mx-auto mt-2">
                    Tujuannya adalah untuk memastikan kedua catatan tersebut cocok, mengidentifikasi perbedaan, dan mendeteksi transaksi yang belum tercatat atau kesalahan.
                </p>
            </div>
        </Card>
    );
};

export default Reconciliation;
