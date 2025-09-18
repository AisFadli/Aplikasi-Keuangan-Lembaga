
import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import type { Account, Asset } from '../types';

// Helper to get start and end of the current year
const getYearRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
    return { start, end };
};


const ReportRow: React.FC<{ label: string; amount: number; isTotal?: boolean; indent?: boolean; isHeader?: boolean }> = ({ label, amount, isTotal = false, indent = false, isHeader = false }) => (
    <div className={`flex justify-between py-2 ${isTotal ? 'border-t border-gray-600 mt-2 pt-2 font-bold' : isHeader ? '' : 'border-b border-gray-800'} ${indent ? 'pl-6' : ''}`}>
        <span className={`${isTotal ? 'text-white' : 'text-gray-300'} ${isHeader ? 'font-bold text-lg' : ''}`}>{label}</span>
        <span className={`font-mono ${isHeader ? 'font-bold text-lg' : ''}`}>{isHeader ? '' : formatCurrency(amount)}</span>
    </div>
);

interface ReportData {
    revenues: Account[];
    totalRevenue: number;
    expenses: Account[];
    totalExpense: number;
    netIncome: number;
    assets: Account[];
    totalAssets: number;
    liabilities: Account[];
    totalLiabilities: number;
    equity: Account[];
    totalEquity: number;
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
}

interface DepreciationRowData {
    asset: Asset;
    openingAccumulated: number;
    periodDepreciation: number;
    closingAccumulated: number;
    bookValue: number;
}

const IncomeStatement: React.FC<{ data: ReportData, period: { start: string, end: string } }> = ({ data, period }) => {
    const { revenues, totalRevenue, expenses, totalExpense, netIncome } = data;
    return (
        <div>
            <h3 className="text-xl font-semibold mb-2">Laporan Laba Rugi</h3>
            <p className="text-sm text-gray-400 mb-4">Untuk Periode {formatDate(period.start)} s/d {formatDate(period.end)}</p>

            <div className="space-y-4">
                <div>
                    <ReportRow label="Pendapatan" amount={0} isHeader />
                    {revenues.map(acc => <ReportRow key={acc.code} label={acc.name} amount={acc.balance} indent />)}
                    <ReportRow label="Total Pendapatan" amount={totalRevenue} isTotal />
                </div>
                <div>
                    <ReportRow label="Beban" amount={0} isHeader />
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

const BalanceSheet: React.FC<{ data: ReportData, period: { end: string } }> = ({ data, period }) => {
    const { assets, totalAssets, liabilities, totalLiabilities, equity, totalEquity, totalLiabilitiesAndEquity, isBalanced } = data;

    return (
        <div>
            <h3 className="text-xl font-semibold mb-2">Neraca</h3>
             <p className="text-sm text-gray-400 mb-4">Per {formatDate(period.end)}</p>

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
                 {!isBalanced && <p className="text-sm">Selisih: {formatCurrency(Math.abs(totalAssets - totalLiabilitiesAndEquity))}</p>}
            </div>
        </div>
    );
};

const DepreciationSchedule: React.FC<{ data: DepreciationRowData[], period: { start: string, end: string } }> = ({ data, period }) => {
    const totalPeriodDepreciation = data.reduce((sum, item) => sum + item.periodDepreciation, 0);

    return (
        <div>
            <h3 className="text-xl font-semibold mb-2">Jadwal Penyusutan Aset</h3>
            <p className="text-sm text-gray-400 mb-4">Untuk Periode {formatDate(period.start)} s/d {formatDate(period.end)}</p>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-sm">
                    <thead>
                        <tr className="border-b border-gray-600">
                            <th className="text-left py-3 px-2">Nama Aset</th>
                            <th className="text-left py-3 px-2">Kategori</th>
                            <th className="text-right py-3 px-2">Harga Perolehan</th>
                            <th className="text-right py-3 px-2">Akum. Peny. (Awal)</th>
                            <th className="text-right py-3 px-2">Beban Peny. (Periode)</th>
                            <th className="text-right py-3 px-2">Akum. Peny. (Akhir)</th>
                            <th className="text-right py-3 px-2">Nilai Buku (Akhir)</th>
                            <th className="text-center py-3 px-2">Masa Manfaat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length > 0 ? (
                            data.map(item => (
                                <tr key={item.asset.id} className="border-b border-gray-700 hover:bg-slate-800/50">
                                    <td className="py-2 px-2">{item.asset.name}</td>
                                    <td className="py-2 px-2 text-gray-300">{item.asset.category}</td>
                                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(item.asset.cost)}</td>
                                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(item.openingAccumulated)}</td>
                                    <td className="py-2 px-2 text-right font-mono text-yellow-400">{formatCurrency(item.periodDepreciation)}</td>
                                    <td className="py-2 px-2 text-right font-mono">{formatCurrency(item.closingAccumulated)}</td>
                                    <td className="py-2 px-2 text-right font-mono font-bold">{formatCurrency(item.bookValue)}</td>
                                    <td className="py-2 px-2 text-center">{item.asset.life} thn</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="text-center text-gray-400 py-8">
                                    Tidak ada aset yang dapat disusutkan pada periode yang dipilih.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        {data.length > 0 && (
                            <tr className="font-bold border-t-2 border-gray-500">
                                <td colSpan={4} className="py-3 px-2 text-right">Total Beban Penyusutan Periode Ini</td>
                                <td className="py-3 px-2 text-right font-mono text-yellow-400">{formatCurrency(totalPeriodDepreciation)}</td>
                                <td colSpan={3}></td>
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>
        </div>
    );
};


const Reports: React.FC = () => {
    const { accounts, transactions, assets, companySettings, loading, error } = useData();
    const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'depreciation'>('income');
    const [period, setPeriod] = useState(getYearRange());
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [depreciationData, setDepreciationData] = useState<DepreciationRowData[] | null>(null);
    const [isCalculating, setIsCalculating] = useState(true);

    useEffect(() => {
        if (loading) return;

        setIsCalculating(true);
        const timer = setTimeout(() => {
            if (!period.start || !period.end || period.start > period.end) {
                setReportData(null);
                setDepreciationData(null);
                setIsCalculating(false);
                return;
            }

            const priorTransactions = transactions.filter(tx => tx.date < period.start);
            const periodTransactions = transactions.filter(tx => tx.date >= period.start && tx.date <= period.end);

            const openingBalances: { [code: string]: number } = {};
            accounts.forEach(acc => { openingBalances[acc.code] = 0; });

            priorTransactions.forEach(tx => {
                tx.entries.forEach(entry => {
                    const account = accounts.find(a => a.code === entry.account_code);
                    if (account) {
                        const change = entry.debit - entry.credit;
                        openingBalances[account.code] += (account.type === 'Aset' || account.type === 'Beban') ? change : -change;
                    }
                });
            });

            const periodChanges: { [code: string]: number } = {};
            accounts.forEach(acc => { periodChanges[acc.code] = 0; });

            periodTransactions.forEach(tx => {
                tx.entries.forEach(entry => {
                    const account = accounts.find(a => a.code === entry.account_code);
                    if (account) {
                        const change = entry.debit - entry.credit;
                        periodChanges[account.code] += (account.type === 'Aset' || account.type === 'Beban') ? change : -change;
                    }
                });
            });

            const revenues = accounts.filter(a => a.type === 'Pendapatan').map(acc => ({ ...acc, balance: -periodChanges[acc.code] || 0 }));
            const expenses = accounts.filter(a => a.type === 'Beban').map(acc => ({ ...acc, balance: periodChanges[acc.code] || 0 }));
            const totalRevenue = revenues.reduce((sum, acc) => sum + acc.balance, 0);
            const totalExpense = expenses.reduce((sum, acc) => sum + acc.balance, 0);
            const netIncome = totalRevenue - totalExpense;

            const finalAssets = accounts.filter(a => a.type === 'Aset').map(acc => ({ ...acc, balance: (openingBalances[acc.code] || 0) + (periodChanges[acc.code] || 0) }));
            const finalLiabilities = accounts.filter(a => a.type === 'Liabilitas').map(acc => ({ ...acc, balance: (openingBalances[acc.code] || 0) + (periodChanges[acc.code] || 0) }));
            const finalEquity = accounts.filter(a => a.type === 'Modal').map(acc => {
                let closingBalance = (openingBalances[acc.code] || 0) + (periodChanges[acc.code] || 0);
                if (acc.code === '3200') {
                    closingBalance += netIncome;
                }
                return { ...acc, balance: closingBalance };
            });

            const totalAssets = finalAssets.reduce((sum, acc) => sum + acc.balance, 0);
            const totalLiabilities = finalLiabilities.reduce((sum, acc) => sum + acc.balance, 0);
            const totalEquity = finalEquity.reduce((sum, acc) => sum + acc.balance, 0);
            const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
            const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

            setReportData({ revenues, totalRevenue, expenses, totalExpense, netIncome, assets: finalAssets, totalAssets, liabilities: finalLiabilities, totalLiabilities, equity: finalEquity, totalEquity, totalLiabilitiesAndEquity, isBalanced });

            const reportStartDate = new Date(period.start);
            const reportEndDate = new Date(period.end);
            const calculatedDepreciationData = assets.filter(asset => asset.is_depreciable && asset.life && asset.life > 0 && asset.method === 'straight-line').map(asset => {
                const acquisitionDate = new Date(asset.date);
                const depreciableBase = asset.cost - asset.residual;
                if (depreciableBase <= 0) return null;
                const dailyDepreciation = depreciableBase / (asset.life! * 365);
                let openingAccumulated = 0;
                if (reportStartDate > acquisitionDate) {
                    const daysBeforePeriod = (reportStartDate.getTime() - acquisitionDate.getTime()) / (1000 * 3600 * 24);
                    openingAccumulated = Math.max(0, daysBeforePeriod * dailyDepreciation);
                }
                openingAccumulated = Math.min(depreciableBase, openingAccumulated);
                let periodDepreciation = 0;
                const effectiveStartDate = reportStartDate > acquisitionDate ? reportStartDate : acquisitionDate;
                if (reportEndDate >= effectiveStartDate) {
                    const daysInPeriod = (reportEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 3600 * 24) + 1;
                    const remainingDepreciable = depreciableBase - openingAccumulated;
                    periodDepreciation = Math.max(0, daysInPeriod * dailyDepreciation);
                    periodDepreciation = Math.min(remainingDepreciable, periodDepreciation);
                }
                const closingAccumulated = openingAccumulated + periodDepreciation;
                const bookValue = asset.cost - closingAccumulated;
                return { asset, openingAccumulated, periodDepreciation, closingAccumulated, bookValue };
            }).filter((item): item is DepreciationRowData => item !== null);

            setDepreciationData(calculatedDepreciationData);
            setIsCalculating(false);
        }, 50);

        return () => clearTimeout(timer);
    }, [accounts, transactions, assets, period, loading]);


    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPeriod(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePrint = () => {
        window.print();
    };

    const TabButton: React.FC<{ tab: 'income' | 'balance' | 'depreciation'; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md transition-colors ${activeTab === tab ? 'bg-primary text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
        >
            {label}
        </button>
    );

    const printHeaderTitle = activeTab === 'income' ? 'Laporan Laba Rugi' : activeTab === 'balance' ? 'Neraca' : 'Jadwal Penyusutan';
    const printHeaderPeriod = activeTab === 'income' || activeTab === 'depreciation'
        ? `Untuk Periode ${formatDate(period.start)} s/d ${formatDate(period.end)}`
        : `Per ${formatDate(period.end)}`;

    const renderReportContent = () => {
        if (isCalculating) {
            return (
                <div className="relative h-64 flex items-center justify-center no-print">
                    <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-primary"></div>
                    <p className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-10 text-gray-400">Menghasilkan laporan...</p>
                </div>
            );
        }
        
        if (activeTab === 'income' && reportData) return <IncomeStatement data={reportData} period={period} />;
        if (activeTab === 'balance' && reportData) return <BalanceSheet data={reportData} period={period} />;
        if (activeTab === 'depreciation' && depreciationData) return <DepreciationSchedule data={depreciationData} period={period} />;
        
        return <div className="text-center py-8 text-yellow-400 no-print">Harap pilih rentang tanggal yang valid.</div>;
    };


    return (
        <div className="printable-area">
            <Card>
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 no-print">
                     <h2 className="text-2xl md:text-3xl font-bold">Laporan Keuangan</h2>
                    <div className="flex items-center space-x-2 flex-wrap">
                        <TabButton tab="income" label="Laporan Laba Rugi" />
                        <TabButton tab="balance" label="Neraca" />
                        <TabButton tab="depreciation" label="Jadwal Penyusutan" />
                    </div>
                </div>
                
                 <div className="mb-6 p-4 bg-slate-800/50 rounded-lg grid grid-cols-1 md:grid-cols-3 gap-4 items-end no-print">
                    <div className="md:col-span-1">
                        <label htmlFor="start" className="block text-sm font-medium text-gray-300 mb-1">Periode Mulai</label>
                        <input type="date" name="start" id="start" value={period.start} onChange={handleDateChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2" />
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="end" className="block text-sm font-medium text-gray-300 mb-1">Periode Selesai</label>
                        <input type="date" name="end" id="end" value={period.end} onChange={handleDateChange} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2" />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                         <button onClick={handlePrint} className="bg-accent hover:bg-accent/80 text-white font-bold py-2 px-6 rounded-lg w-full md:w-auto">
                            Cetak Laporan
                        </button>
                    </div>
                </div>

                {loading && <div className="text-center py-8 no-print">Memuat data laporan...</div>}
                {error && <div className="text-center py-8 text-red-400 no-print">Error: {error}</div>}

                <div id="report-content">
                    <div className="print-header hidden">
                        <h1>{companySettings.name}</h1>
                        <h2>{printHeaderTitle}</h2>
                        <p>{printHeaderPeriod}</p>
                    </div>
                    {!loading && !error && renderReportContent()}
                </div>
            </Card>
        </div>
    );
};

export default Reports;
