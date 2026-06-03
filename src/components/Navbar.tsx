'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [userName, setUserName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUserName(null);
    router.push('/');
    setTimeout(() => { window.location.href = '/'; }, 50);
  };

  return (
    <header className="bg-slate-900 text-white shadow-sm" style={{ backgroundColor: '#0f172a' }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold tracking-tight text-white">
            CariKost
          </Link>
          <div className="flex items-center gap-3 text-sm text-white/80 sm:hidden">
            <span className="rounded-full border border-slate-500 px-3 py-1">{userName ? `Halo, ${userName}` : 'Akses cepat'}</span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-3 text-sm text-white/80">
          <Link href="/#search" className="hover:text-emerald-300">
            Cari Kost
          </Link>
          <Link href="/#about" className="hover:text-emerald-300">
            Tentang
          </Link>
          <Link href="/#help" className="hover:text-emerald-300">
            Bantuan
          </Link>
          <Link href="/#contact" className="hover:text-emerald-300">
            Kontak
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          {!mounted ? null : userName ? (
            <>
              <span className="hidden rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-100 sm:inline-block">
                Halo, {userName}
              </span>
              <Link
                href="/dashboard"
                className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-500/20 btn-strong"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 btn-strong"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-500/20 transition hover:bg-emerald-400 btn-strong">
                Login
              </Link>
              <Link href="/register" className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-500/20 btn-strong">
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
