
import React, { useState } from 'react';
import Card from '../components/Card';
import { useData } from '../contexts/DataContext';

const Login: React.FC = () => {
    const { signIn } = useData();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const { error } = await signIn(email, password);
            if (error) {
                // Pesan kesalahan yang lebih ramah pengguna
                if (error.message.includes('Invalid login credentials')) {
                    setError('Email atau kata sandi tidak valid. Silakan coba lagi.');
                } else {
                    setError(error.message);
                }
            }
            // Tidak perlu memanggil onLoginSuccess, listener otentikasi di context akan menanganinya
        } catch (err: any) {
            setError('Terjadi kesalahan yang tidak terduga. Silakan coba lagi nanti.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen px-4">
            <Card className="w-full max-w-md">
                <div className="text-center mb-8">
                     <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-2xl mb-4">
                        <span className="text-white font-bold text-3xl">FF</span>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        FinanceFlow Pro
                    </h1>
                    <p className="text-gray-400 mt-2">Masukkan kredensial Anda untuk mengakses dasbor.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:ring-primary focus:border-primary"
                            placeholder="contoh@email.com"
                        />
                    </div>
                    <div>
                         <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Kata Sandi</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:ring-primary focus:border-primary"
                             placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md">{error}</p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Masuk...' : 'Masuk'}
                        </button>
                    </div>
                </form>
                 <div className="text-center mt-6 text-sm text-gray-400">
                    <p>Admin: admin@example.com / password</p>
                    <p>Staff: staff@example.com / password</p>
                    <p>Viewer: viewer@example.com / password</p>
                </div>
            </Card>
        </div>
    );
};

export default Login;
