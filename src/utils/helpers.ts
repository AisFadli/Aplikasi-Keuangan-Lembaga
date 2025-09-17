
import type { CompanySettings, TaxSettings, Account } from '../types';

export const formatCurrency = (amount: number, currency = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

export const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

export const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const defaultCompanySettings: CompanySettings = {
    name: 'An Nahl Islamic School',
    address: 'Jl. Raya Ciangsana KM.07 Gunung Putri Bogor',
    phone: '',
    email: '',
    npwp: '',
    businessType: 'education',
    currency: 'IDR',
    taxYear: new Date().getFullYear().toString(),
    periodStart: getTodayDateString(),
    website: '',
    owner: '',
    description: '',
};

export const defaultTaxSettings: TaxSettings = {
    enableIncomeTax: false,
    corporateTaxRate: 25,
    taxCalculationBasis: 'income-before-tax',
    minimumTaxableIncome: 0,
    roundTaxAmount: true,
    taxExpenseAccount: '5500',
    taxPayableAccount: '2300',
    autoCreateTaxEntry: false,
};

export const defaultAccounts: Omit<Account, 'id'>[] = [
    {code: '1100', name: 'Kas', type: 'Aset', balance: 0, description: 'Kas di tangan perusahaan'},
    {code: '1200', name: 'Bank', type: 'Aset', balance: 0, description: 'Rekening bank perusahaan'},
    {code: '1300', name: 'Piutang Dagang', type: 'Aset', balance: 0, description: 'Tagihan kepada pelanggan'},
    {code: '1400', name: 'Persediaan', type: 'Aset', balance: 0, description: 'Barang dagangan'},
    {code: '1500', name: 'Peralatan', type: 'Aset', balance: 0, description: 'Peralatan operasional'},
    {code: '1600', name: 'Akumulasi Penyusutan Peralatan', type: 'Aset', balance: 0, description: 'Akumulasi penyusutan peralatan'},
    {code: '2100', name: 'Utang Dagang', type: 'Liabilitas', balance: 0, description: 'Utang kepada supplier'},
    {code: '2200', name: 'Utang Bank', type: 'Liabilitas', balance: 0, description: 'Pinjaman bank'},
    {code: '3100', name: 'Modal Saham', type: 'Modal', balance: 0, description: 'Modal disetor pemegang saham'},
    {code: '3200', name: 'Laba Ditahan', type: 'Modal', balance: 0, description: 'Akumulasi laba yang ditahan'},
    {code: '4100', name: 'Pendapatan Jasa Pendidikan', type: 'Pendapatan', balance: 0, description: 'Pendapatan dari jasa pendidikan'},
    {code: '5100', name: 'Beban Pokok Pendapatan', type: 'Beban', balance: 0, description: 'Biaya langsung terkait pendapatan'},
    {code: '5200', name: 'Beban Gaji', type: 'Beban', balance: 0, description: 'Gaji karyawan'},
    {code: '5300', name: 'Beban Sewa', type: 'Beban', balance: 0, description: 'Biaya sewa tempat usaha'},
    {code: '5400', name: 'Beban Penyusutan', type: 'Beban', balance: 0, description: 'Penyusutan aset tetap'},
    {code: '5500', name: 'Beban Pajak Penghasilan', type: 'Beban', balance: 0, description: 'Beban pajak penghasilan badan'},
    {code: '2300', name: 'Utang Pajak Penghasilan', type: 'Liabilitas', balance: 0, description: 'Utang pajak penghasilan yang belum dibayar'}
];

// Calculation helpers can be added here as the app grows
