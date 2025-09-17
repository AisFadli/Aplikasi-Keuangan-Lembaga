
import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/helpers';
import type { Account } from '../types';

const ReportRow: React.FC<{ label: string; amount: number; isTotal?: boolean; indent?: boolean }> = ({ label, amount, isTotal = false, indent = false }) => (
    <div className={`flex justify-between py-2 ${isTotal ? 'border-t border-gray-600 mt-2 pt-2 font-bold' : 'border-b border-gray-800'} ${indent ? 'pl-6' : ''}`}>
        <span className={isTotal ? 'text-white' : 'text-gray-300'}>{label}</span>
        <span className="font-mono">{formatCurrency(amount)}</span>
    </div>
);

const IncomeStatement: React.FC = () => {
    const { accounts } = useData();

    const { revenues, totalRevenue, expenses, totalExpense, netIncome } = useMemo(() => {
        const revenues = accounts.filter(a => a.type === 'Pendapatan');
        const expenses = accounts.filter(a => a.type === 'Beban');

        const totalRevenue = revenues.reduce((sum, acc) => sum + acc.balance, 0);
        const totalExpense = expenses.reduce((sum, acc) => sum + acc.balance, 0);

        const netIncome = totalRevenue - totalExpense;

        return { revenues, totalRevenue, expenses, totalExpense, netIncome };
    }, [accounts]);
    
    return (
        <div>
            <h3 className="text-xl font-semibold mb-2">Laporan Laba Rugi</h3>
            <p className="text-sm text-gray-400 mb-4">Untuk Periode yang Berakhir {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <div className="space-y-4">
                <div>
                    <h4 className="font-bold text-lg mb-2">Pendapatan</h4>
                    {revenues.map(acc => <ReportRow key={acc.code} label={acc.name} amount={acc.balance} indent />)}
                    <ReportRow label="Total Pendapatan" amount={totalRevenue} isTotal />
                </div>
                <div>
                    <h4 className="font-bold text-lg mb-2">Beban</h4>
                    {expenses.map(acc => <ReportRow key={acc.code} label={acc.name} amount={acc.balance} indent />)}
                    <ReportRow label="Total Beban" amount={totalExpense} isTotal />
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg">
                     <ReportRow label="Laba (Rugi) Bersih" amount={netIncome} isTotal />
                </div>
            </div>
        </div>
    );
};

const BalanceSheet: React.FC = () => {
    const { accounts } = useData();
    
    const { assets, totalAssets, liabilities, totalLiabilities, equity, totalEquity, totalLiabilitiesAndEquity, isBalanced } = useMemo(() => {
        const assets = accounts.filter(a => a.type === 'Aset');
        const liabilities = accounts.filter(a => a.type === 'Liabilitas');
        const equity = accounts.filter(a => a.type === 'Modal');

        const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
        const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);
        
        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

        return { assets, totalAssets, liabilities, totalLiabilities, equity, totalEquity, totalLiabilitiesAndEquity, isBalanced: totalAssets === totalLiabilitiesAndEquity };
    }, [accounts]);

    return (
        <div>
            <h3 className="text-xl font-semibold mb-2">Neraca</h3>
             <p className="text-sm text-gray-400 mb-4">Per {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h4 className="font-bold text-lg mb-2 border-b border-gray-600 pb-2">Aset</h4>
                    {assets.map(acc => <ReportRow key={acc.code} label={acc.name} amount={acc.balance} />)}
                    <ReportRow label="Total Aset" amount={totalAssets} isTotal />
                </div>
                <div>
                    <div className="mb-6">
                        <h4 className="font-bold text-lg mb-2 border-b border-gray-600 pb-2">Liabilitas</h4>
                        {liabilities.map(acc => <ReportRow key={acc.code} label={acc.name} amount={acc.balance} />)}
                        <ReportRow label="Total Liabilitas" amount={totalLiabilities} isTotal />
                    </div>
                     <div>
                        <h4 className="font-bold text-lg mb-2 border-b border-gray-600 pb-2">Modal</h4>
                        {equity.map(acc => <ReportRow key={acc.code} label={acc.name} amount={acc.balance} />)}
                        <ReportRow label="Total Modal" amount={totalEquity} isTotal />
                    </div>
                    <div className="mt-6">
                         <ReportRow label="Total Liabilitas dan Modal" amount={totalLiabilitiesAndEquity} isTotal />
                    </div>
                </div>
            </div>
            <div className={`mt-8 p-4 rounded-lg text-center ${isBalanced ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                <p className="font-bold">{isBalanced ? 'Seimbang (Balanced)' : 'Tidak Seimbang (Unbalanced)'}</p>
            </div>
        </div>
    );
};


const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'income' | 'balance'>('income');
    const { loading, error } = useData();

    const TabButton: React.FC<{ tab: 'income' | 'balance'; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
        >
            {label}
        </button>
    );

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl md:text-3xl font-bold">Laporan Keuangan</h2>
                <div className="flex space-x-2">
                    <TabButton tab="income" label="Laporan Laba Rugi" />
                    <TabButton tab="balance" label="Neraca" />
                </div>
            </div>
            
            {loading && <div className="text-center py-8">Memuat data laporan...</div>}
            {error && <div className="text-center py-8 text-red-400">Error: {error}</div>}

            {!loading && !error && (
                <div>
                    {activeTab === 'income' ? <IncomeStatement /> : <BalanceSheet />}
                </div>
            )}
        </Card>
    );
};

export default Reports;
