'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  name: string;a
  email: string;
  role: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      if (decoded.role !== 'admin') {
        setError('Anda tidak memiliki akses admin');
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      fetchUsers(token);
    } catch (err) {
      setError('Token tidak valid');
      setLoading(false);
    }
  }, [router]);

  const fetchUsers = async (token: string) => {
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Gagal mengambil data pengguna');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: number, newRole: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/update-user-role?id=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Gagal mengubah role');
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="rounded-3xl bg-white p-8 shadow-lg text-center"><p className="text-slate-700">Memuat...</p></div></div>;

  if (!isAdmin) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="rounded-3xl bg-white p-8 shadow-lg text-center"><h1 className="text-xl font-semibold text-slate-900">Akses Ditolak</h1><p className="mt-3 text-slate-600">{error}</p></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-8 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Admin Panel</h1>
            <Link href="/dashboard" className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">Kembali</Link>
          </div>
          {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">{error}</div>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Nama</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Email</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Role</th>
                  <th className="px-6 py-3 text-left font-semibold text-slate-900">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-900">{user.name}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-red-100 text-red-700' : user.role === 'owner' || user.role === 'landlord' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.role !== 'owner' && user.role !== 'landlord' && <button onClick={() => updateUserRole(user.id, 'owner')} className="rounded bg-emerald-500 px-3 py-1 text-xs text-white hover:bg-emerald-600">Jadikan Owner</button>}
                        {user.role !== 'user' && <button onClick={() => updateUserRole(user.id, 'user')} className="rounded bg-slate-400 px-3 py-1 text-xs text-white hover:bg-slate-500">Jadikan User</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && <div className="text-center py-8 text-slate-600">Tidak ada pengguna ditemukan</div>}
        </div>
      </div>
    </div>
  );
}