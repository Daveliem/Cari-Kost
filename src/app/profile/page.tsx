'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  role: string;
  listingCount: number;
  favoriteCount: number;
  reviewCount: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const result = await res.json();
          throw new Error(result.error || 'Gagal memuat profil');
        }
        return res.json();
      })
      .then((data) => setProfile(data))
      .catch((err) => {
        setError(err.message || 'Gagal memuat profil');
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="rounded-3xl bg-white p-8 shadow-lg text-center">
          <p className="text-slate-700">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="rounded-3xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-xl font-semibold text-slate-900">Profil tidak dapat dimuat</h1>
          <p className="mt-3 text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Profil Saya</h1>
              <p className="mt-2 text-slate-600">Lihat detail akun dan ringkasan aktivitas Anda.</p>
            </div>
            <a href="/dashboard" className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
              Kembali ke Dashboard
            </a>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Nama</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{profile.name}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Email</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{profile.email}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Role</p>
              <p className="mt-3 text-xl font-semibold text-slate-900">{profile.role}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Listing yang dibuat</p>
              <p className="mt-3 text-3xl font-bold text-emerald-600">{profile.listingCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Favorit tersimpan</p>
              <p className="mt-3 text-3xl font-bold text-emerald-600">{profile.favoriteCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Ulasan dibuat</p>
              <p className="mt-3 text-3xl font-bold text-emerald-600">{profile.reviewCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
