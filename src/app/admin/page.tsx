'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  deleted_at?: string | null;
}

interface Listing {
  id: number;
  title: string;
  price: number;
  location: string;
  user_id?: number;
  images?: string[];
  average_rating?: number;
  review_count?: number;
  owner_name?: string | null;
  owner_email?: string | null;
  deleted_at?: string | null;
}

interface Review {
  id: number;
  listing_id: number;
  rating: number;
  comment: string;
  reviewer_name?: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<'users' | 'listings'>('users');
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListingReviews, setSelectedListingReviews] = useState<Record<number, Review[]>>({});
  const [userQuery, setUserQuery] = useState('');
  const [listingQuery, setListingQuery] = useState('');
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const [showDeletedListings, setShowDeletedListings] = useState(false);
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
      fetchListings(token);
    } catch (err) {
      setError('Token tidak valid');
      setLoading(false);
    }
  }, [router]);

  const fetchUsers = async (token: string, includeDeleted = showDeletedUsers) => {
    try {
      const res = await fetch(`/api/users${includeDeleted ? '?includeDeleted=1' : ''}`, { headers: { Authorization: `Bearer ${token}` } });
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

  const fetchListings = async (token: string, includeDeleted = showDeletedListings) => {
    try {
      const res = await fetch(`/api/listings${includeDeleted ? '?includeDeleted=1' : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Gagal mengambil data listings');
      const data = await res.json();
      setListings(data);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const softDeleteUser = async (userId: number) => {
    if (!confirm('Hapus pengguna ini (soft-delete)?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: userId }) });
      if (!res.ok) throw new Error('Gagal menghapus pengguna');
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const restoreUser = async (userId: number) => {
    if (!confirm('Restore pengguna ini?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/users', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: userId, action: 'restore' }) });
      if (!res.ok) throw new Error('Gagal merestore pengguna');
      fetchUsers(token);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const softDeleteListing = async (listingId: number) => {
    if (!confirm('Hapus listing ini (soft-delete)?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Gagal menghapus listing');
      setListings(listings.filter(l => l.id !== listingId));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const restoreListing = async (listingId: number) => {
    if (!confirm('Restore listing ini?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'restore' }) });
      if (!res.ok) throw new Error('Gagal merestore listing');
      fetchListings(token);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const fetchReviewsForListing = async (listingId: number) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/reviews?listingId=${listingId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Gagal mengambil ulasan');
      const data = await res.json();
      // toggle: if already shown, close; otherwise replace with this listing's reviews only
      setSelectedListingReviews(prev => {
        if (prev[listingId]) return {};
        return { [listingId]: data };
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const softDeleteReview = async (reviewId: number, listingId: number) => {
    if (!confirm('Hapus ulasan ini (soft-delete)?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/reviews', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: reviewId }) });
      if (!res.ok) throw new Error('Gagal menghapus ulasan');
      // update local state
      setSelectedListingReviews(prev => ({ ...prev, [listingId]: (prev[listingId] || []).filter(r => r.id !== reviewId) }));
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex gap-3">
                <button onClick={() => setTab('users')} className={`rounded px-3 py-1 ${tab === 'users' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Users</button>
                <button onClick={() => setTab('listings')} className={`rounded px-3 py-1 ${tab === 'listings' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>Listings</button>
              </div>
              <div className="flex gap-3 items-center">
                {tab === 'users' && (
                  <>
                    <input value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="Cari pengguna..." className="rounded border px-3 py-1 text-sm" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showDeletedUsers} onChange={e => { const checked = e.target.checked; setShowDeletedUsers(checked); const token = localStorage.getItem('token'); if (token) fetchUsers(token, checked); }} /> Tampilkan deleted</label>
                  </>
                )}
                {tab === 'listings' && (
                  <>
                    <input value={listingQuery} onChange={e => setListingQuery(e.target.value)} placeholder="Cari listing..." className="rounded border px-3 py-1 text-sm" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showDeletedListings} onChange={e => { const checked = e.target.checked; setShowDeletedListings(checked); const token = localStorage.getItem('token'); if (token) fetchListings(token, checked); }} /> Tampilkan deleted</label>
                  </>
                )}
              </div>
            </div>

            {tab === 'users' && (
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
                {users.filter(u => {
                  const q = userQuery.trim().toLowerCase();
                  if (!q) return true;
                  return `${u.name} ${u.email}`.toLowerCase().includes(q);
                }).map((user) => (
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
                        {user.role !== 'owner' && user.role !== 'landlord' && !user.deleted_at && <button onClick={() => updateUserRole(user.id, 'owner')} className="rounded bg-emerald-500 px-3 py-1 text-xs text-white hover:bg-emerald-600">Jadikan Owner</button>}
                        {user.role !== 'user' && !user.deleted_at && <button onClick={() => updateUserRole(user.id, 'user')} className="rounded bg-slate-400 px-3 py-1 text-xs text-white hover:bg-slate-500">Jadikan User</button>}
                        {!user.deleted_at && <button onClick={() => softDeleteUser(user.id)} className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600">Hapus</button>}
                        {user.deleted_at && <button onClick={() => restoreUser(user.id)} className="rounded bg-emerald-500 px-3 py-1 text-xs text-white hover:bg-emerald-600">Restore</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            )}

            {tab === 'listings' && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Judul</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Harga</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Lokasi</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.filter(l => {
                    const q = listingQuery.trim().toLowerCase();
                    if (!q) return true;
                    return `${l.title} ${l.location}`.toLowerCase().includes(q);
                  }).map((l) => (
                    <tr key={l.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-900">{l.title}</td>
                      <td className="px-6 py-4 text-slate-600">{l.price}</td>
                      <td className="px-6 py-4 text-slate-600">{l.location}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 items-center">
                          <div className="text-xs text-slate-600 mr-2">Owner: {l.owner_name || l.owner_email || 'N/A'}</div>
                          <button onClick={() => fetchReviewsForListing(l.id)} className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600">Lihat Ulasan</button>
                          {!l.deleted_at && <button onClick={() => softDeleteListing(l.id)} className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600">Hapus</button>}
                          {l.deleted_at && <button onClick={() => restoreListing(l.id)} className="rounded bg-emerald-500 px-3 py-1 text-xs text-white hover:bg-emerald-600">Restore</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {tab === 'users' && users.length === 0 && <div className="text-center py-8 text-slate-600">Tidak ada pengguna ditemukan</div>}
          {tab === 'listings' && listings.length === 0 && <div className="text-center py-8 text-slate-600">Tidak ada listing ditemukan</div>}

          {/* Reviews section for selected listing(s) */}
          {Object.keys(selectedListingReviews).map(k => {
            const lid = Number(k);
            const reviews = selectedListingReviews[lid] || [];
            return (
              <div key={k} className="mt-6 rounded-lg border bg-slate-50 p-4">
                <h3 className="font-semibold">Ulasan untuk listing #{lid}</h3>
                {reviews.length === 0 && <div className="text-sm text-slate-600">Tidak ada ulasan</div>}
                {reviews.map(r => (
                  <div key={r.id} className="mt-2 flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">{r.reviewer_name || 'Anonim'}</div>
                      <div className="text-xs text-slate-600">Rating: {r.rating}</div>
                      <div className="text-sm">{r.comment}</div>
                    </div>
                    <div>
                      <button onClick={() => softDeleteReview(r.id, lid)} className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600">Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}