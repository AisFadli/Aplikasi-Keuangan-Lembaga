
import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { useData } from '../contexts/DataContext';
import type { CompanySettings } from '../types';

const StatItem: React.FC<{ label: string; value: number | string, icon: string }> = ({ label, value, icon }) => (
    <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
        <div className="flex items-center">
            <span className="mr-3 text-lg">{icon}</span>
            <span className="text-gray-300">{label}</span>
        </div>
        <span className="font-bold text-lg">{value}</span>
    </div>
);

const DataStatistics: React.FC = () => {
    const { transactionCount, accountCount, assetCount, loading } = useData();

    if (loading) {
        return (
             <div className="text-center text-gray-400 py-8">
                <p>Memuat statistik...</p>
            </div>
        )
    }

    // Perkiraan kasar ukuran data, untuk tujuan ilustrasi.
    const estimatedSize = (transactionCount * 256) + (accountCount * 128) + (assetCount * 128);
    const formattedSize = (estimatedSize / 1024).toFixed(2) + ' KB';

    return (
        <div className="space-y-3">
            <StatItem label="Total Transaksi" value={transactionCount} icon="🔄" />
            <StatItem label="Total Akun" value={accountCount} icon="📚" />
            <StatItem label="Total Aset" value={assetCount} icon="🏠" />
            <StatItem label="Perkiraan Ukuran Data" value={formattedSize} icon="💾" />
        </div>
    );
};

const CompanySettingsForm: React.FC = () => {
    const { companySettings, saveCompanySettings } = useData();
    const [formData, setFormData] = useState<CompanySettings>(companySettings);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setFormData(companySettings);
    }, [companySettings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await saveCompanySettings(formData);
            // Optionally, show a success message to the user
            alert('Pengaturan perusahaan berhasil disimpan!');
        } catch (error: any) {
            console.error("Failed to save company settings:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const InputField: React.FC<{ name: keyof CompanySettings, label: string, type?: string, placeholder?: string, required?: boolean }> = ({ name, label, type = 'text', placeholder, required = false }) => (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <input
                type={type}
                name={name}
                id={name}
                value={formData[name] || ''}
                onChange={handleChange}
                placeholder={placeholder}
                required={required}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"
            />
        </div>
    );

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <InputField name="name" label="Nama Perusahaan" required />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-1">Alamat</label>
                    <textarea name="address" id="address" value={formData.address} onChange={handleChange} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"></textarea>
                </div>
                <InputField name="phone" label="Telepon" />
                <InputField name="email" label="Email" type="email" />
                <InputField name="website" label="Website" type="url" />
                <InputField name="owner" label="Pemilik" />
                <InputField name="npwp" label="NPWP" />
                <InputField name="businessType" label="Jenis Usaha" />
                <InputField name="currency" label="Mata Uang" />
                <InputField name="taxYear" label="Tahun Pajak" />
                <div className="md:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Deskripsi Singkat</label>
                    <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2"></textarea>
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-6 rounded-lg disabled:bg-gray-500">
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
            </div>
        </form>
    );
};


const Settings: React.FC = () => {
    return (
        <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Pengaturan Sistem</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <Card className="lg:col-span-2">
                    <h3 className="text-xl font-semibold mb-4">Informasi Perusahaan</h3>
                    <CompanySettingsForm />
                </Card>
                 <Card className="lg:col-span-2">
                    <h3 className="text-xl font-semibold mb-4">Pengaturan Pajak & Lainnya</h3>
                    <div className="text-center text-gray-400 py-8">
                        <p>Fitur ini sedang dikembangkan.</p>
                    </div>
                </Card>
            </div>
            <div className="mt-8">
                <Card>
                    <h3 className="text-xl font-semibold mb-4">Statistik Data</h3>
                    <DataStatistics />
                </Card>
            </div>
        </div>
    );
};

export default Settings;
