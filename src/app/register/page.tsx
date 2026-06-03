'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Gagal mendaftar, coba lagi.');
        setLoading(false);
        return;
      }

      setSuccess('Akun berhasil dibuat! Silakan login.');
      setName('');
      setEmail('');
      setPassword('');
      setTimeout(() => router.push('/login'), 1200);
    } catch (err) {
      setError('Terjadi kesalahan, silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Daftar Akun Baru</h1>
        <p className="mb-6 text-sm text-slate-600">Buat akun untuk mengelola listing kost Anda.</p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nama Lengkap</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-black bg-white px-4 py-3 text-black placeholder:text-slate-400 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-xl border border-black bg-white px-4 py-3 text-black placeholder:text-slate-400 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="mt-2 w-full rounded-xl border border-black bg-white px-4 py-3 text-black placeholder:text-slate-400 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500">
            Login di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
