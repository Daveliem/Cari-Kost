'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        setUserName(user?.name ?? null);
      } catch {
        setUserName(null);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUserName(null);
    router.push('/');
    // ensure a full reload so server-rendered parts update
    setTimeout(() => { window.location.href = '/'; }, 50);
  };

  return (
    <header className="bg-slate-900 text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-white">
            CariKost
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-200 sm:hidden">
            <span className="rounded-full border border-slate-500 px-3 py-1">{userName ? `Halo, ${userName}` : 'Akses cepat'}</span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
          <Link href="#search" className="hover:text-emerald-300">
            Cari Kost
          </Link>
          <Link href="#about" className="hover:text-emerald-300">
            Tentang
          </Link>
          <Link href="#help" className="hover:text-emerald-300">
            Bantuan
          </Link>
          <Link href="#contact" className="hover:text-emerald-300">
            Kontak
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          {userName ? (
            <>
              <span className="hidden rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-100 sm:inline-block">
                Halo, {userName}
              </span>
              <Link
                href="/dashboard"
                className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm shadow-emerald-500/20"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded border border-slate-500 px-4 py-2 text-sm text-slate-100 transition hover:border-slate-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded border border-slate-500 px-4 py-2 text-sm text-slate-100 transition hover:border-slate-400">
                Masuk
              </Link>
              <Link href="/register" className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm shadow-emerald-500/20">
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
