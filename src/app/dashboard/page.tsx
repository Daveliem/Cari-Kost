'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), { ssr: false });

interface Listing {
  id: number;
  title: string;
  price: number;
  location: string;
}

interface UserInfo {
  id: number;
  role: string;
  name: string;
}

export default function Dashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    latitude: '',
    longitude: '',
    room_type: 'single',
    amenities: [] as string[],
    images: [''],
    contact: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      // Decode JWT to get role
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      setUserRole(decoded.role);
      fetchListings(token);
    }
    setReady(true);
  }, []);

  const fetchListings = async (token: string) => {
    const res = await fetch('/api/listings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      setListings([]);
      return;
    }
    const data = await res.json();
    setListings(Array.isArray(data) ? data : []);
  };

  const uploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    setUploadError('');

    try {
      const formDataUpload = new FormData();
      Array.from(files).forEach((file) => {
        formDataUpload.append('images', file);
      });

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formDataUpload
      });

      if (!res.ok) {
        throw new Error('Gagal mengunggah gambar');
      }

      const data = await res.json();
      setFormData((prev: any) => ({
        ...prev,
        images: Array.isArray(prev.images) ? [...prev.images.filter(Boolean), ...data.images] : data.images
      }));
    } catch (error) {
      setUploadError((error as Error).message || 'Terjadi kesalahan upload');
    } finally {
      setUploadingImages(false);
    }
  };

  const formatRupiah = (value: string) => {
    if (!value) return '';
    return Number(value).toLocaleString('id-ID');
  };

  const handlePriceChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setFormData((prev: any) => ({ ...prev, price: digits }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    if (editingId) {
      await fetch(`/api/listings/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          amenities: Array.isArray(formData.amenities) ? formData.amenities.join(',') : formData.amenities,
          images: Array.isArray(formData.images) ? formData.images.filter(Boolean) : [],
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        })
      });
    } else {
      await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          amenities: Array.isArray(formData.amenities) ? formData.amenities.join(',') : formData.amenities,
          images: Array.isArray(formData.images) ? formData.images.filter(Boolean) : [],
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        })
      });
    }
    setFormData({
      title: '',
      description: '',
      price: '',
      location: '',
      latitude: '',
      longitude: '',
      room_type: 'single',
      amenities: [],
      images: [''],
      contact: ''
    });
    setEditingId(null);
    setShowForm(false);
    fetchListings(token);
  };

  const handleEdit = (listing: any) => {
    setFormData({
      title: listing.title || '',
      description: listing.description || '',
      price: listing.price != null ? String(listing.price) : '',
      location: listing.location || '',
      latitude: listing.latitude != null ? String(listing.latitude) : '',
      longitude: listing.longitude != null ? String(listing.longitude) : '',
      room_type: listing.room_type || 'single',
      amenities: typeof listing.amenities === 'string' ? (listing.amenities ? listing.amenities.split(',').map((s: string) => s.trim()) : []) : (listing.amenities || []),
      images: Array.isArray(listing.images) ? listing.images : typeof listing.images === 'string' ? (listing.images ? JSON.parse(listing.images) : []) : [],
      contact: listing.contact || ''
    });
    setEditingId(listing.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus listing ini? Tindakan ini tidak dapat dibatalkan.')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`/api/listings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchListings(token);
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  if (!ready) {
    return null;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-lg">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Pemilik</h1>
          <p className="mt-4 text-slate-600">Silakan login terlebih dahulu untuk melihat dan menambahkan listing kos.</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/login" className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400">
              Login
            </Link>
            <Link href="/register" className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
              Daftar
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">Kembali ke halaman utama untuk mencari kos tanpa login.</p>
        </div>
      </div>
    );
  }

  // Check if user is not an owner or admin
  if (userRole && userRole !== 'owner' && userRole !== 'landlord' && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-lg">
          <h1 className="text-3xl font-bold text-slate-900">Akses Terbatas</h1>
          <p className="mt-4 text-slate-600">Anda tidak memiliki izin untuk membuat listing kos. Hanya pemilik/owner yang dapat membuat listing.</p>
          <p className="mt-4 text-slate-600">Hubungi administrator untuk menjadi owner atau gunakan akun pemilik.</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/" className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400">
              Kembali ke Pencarian 111111
            </Link>
            <Link href="/profile" className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
              Profil Saya
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Pemilik</h1>
            <div className="flex flex-wrap items-center gap-3">
              <a href="/profile" className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                Profil Saya
              </a>
              <a href="/" className="text-blue-600">← Kembali ke Pencarian</a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
            	<button
              onClick={() => setShowForm(!showForm)}
              className="bg-green-600 text-white px-4 py-2 rounded btn-strong"
            >
              {showForm ? 'Batal' : 'Tambah Listing Baru'}
            </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-8 card">
            <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Listing' : 'Tambah Listing'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Judul"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full border p-2 rounded"
                required
              />
              <textarea
                placeholder="Deskripsi"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full border p-2 rounded"
              />
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">Rp</span>
                <input
                  type="text"
                  placeholder="Rp 0"
                  value={formData.price ? formatRupiah(formData.price) : ''}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full border p-2 rounded pl-14"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Lokasi"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full border p-2 rounded"
                required
              />
              <select
                value={formData.room_type}
                onChange={(e) => setFormData({...formData, room_type: e.target.value})}
                className="w-full border p-2 rounded"
              >
                <option value="single">Single</option>
                <option value="shared">Shared</option>
              </select>
              <div className="grid gap-2">
                {['AC','WiFi','Kamar mandi dalam','Dapur','Parkir','Laundry','Listrik 24 jam','Air panas','TV','Ruang tamu'].map((a) => {
                  const checked = Array.isArray(formData.amenities) && formData.amenities.includes(a);
                  return (
                    <label key={a} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setFormData((prev: any) => ({ ...prev, amenities: e.target.checked ? [...(Array.isArray(prev.amenities) ? prev.amenities : []), a] : (Array.isArray(prev.amenities) ? prev.amenities.filter((x: string) => x !== a) : []) }))}
                      />
                      <span className="text-sm">{a}</span>
                    </label>
                  );
                })}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="number"
                  placeholder="Latitude"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  className="w-full border p-2 rounded"
                />
                <input
                  type="number"
                  placeholder="Longitude"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  className="w-full border p-2 rounded"
                />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Pilih lokasi dari peta</p>
                    <p className="mt-1 text-sm text-slate-500">Klik di peta untuk mengatur koordinat latitude + longitude.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, latitude: '', longitude: '' }))}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Reset lokasi
                  </button>
                </div>
                <div className="mt-4">
                  <LocationPickerMap
                    latitude={formData.latitude ? Number(formData.latitude) : null}
                    longitude={formData.longitude ? Number(formData.longitude) : null}
                    onChange={(lat, lng) => setFormData((prev) => ({
                      ...prev,
                      latitude: String(lat),
                      longitude: String(lng),
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">Unggah Foto</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => uploadImages(e.target.files)}
                  className="w-full border p-2 rounded"
                />
                {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
                {uploadingImages && <p className="text-sm text-slate-500">Mengunggah foto...</p>}
              </div>

              {/* Preview thumbnails for uploaded / added images */}
              {Array.isArray(formData.images) && formData.images.filter(Boolean).length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-sm font-medium text-slate-700">Pratinjau Foto</p>
                  <div className="flex flex-wrap gap-3">
                    {formData.images.filter(Boolean).map((img: string, idx: number) => (
                      <div key={idx} className="relative w-28 h-20 overflow-hidden rounded-md border">
                        <img src={img} alt={`foto-${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData((prev: any) => ({ ...prev, images: prev.images.filter((_: string, i: number) => i !== idx) }))}
                          className="absolute top-1 right-1 rounded-full bg-white/80 px-2 py-1 text-xs text-red-600"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">Foto / URL Gambar</label>
                {formData.images.map((image, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <input
                      type="text"
                      placeholder="https://... atau /uploads/relative-path.png"
                      value={image}
                      onChange={(e) => setFormData((prev: any) => ({
                        ...prev,
                        images: prev.images.map((img: string, index: number) => index === idx ? e.target.value.trim() : img)
                      }))}
                      className="w-full border p-2 rounded"
                    />
                    {formData.images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev: any) => ({
                          ...prev,
                          images: prev.images.filter((_: string, index: number) => index !== idx)
                        }))}
                        className="rounded border px-3 py-2 text-sm text-red-600"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData((prev: any) => ({ ...prev, images: [...prev.images, ''] }))}
                  className="rounded border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700"
                >
                  Tambah URL Foto
                </button>
                <p className="mt-2 text-xs text-slate-500">Boleh menggunakan URL lengkap (https://...) atau path relatif dari server (mis. /uploads/xxx.png).</p>
              </div>

              <input
                type="text"
                placeholder="Kontak"
                value={formData.contact}
                onChange={(e) => setFormData({...formData, contact: e.target.value})}
                className="w-full border p-2 rounded"
                required
              />
              <div className="flex items-center gap-3">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded btn-strong">{editingId ? 'Update' : 'Simpan'}</button>
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setShowForm(false); setFormData({ title: '', description: '', price: '', location: '', latitude: '', longitude: '', room_type: 'single', amenities: [], images: [''], contact: '' }); }} className="rounded border px-4 py-2 text-sm btn-strong btn-ghost">Batal</button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow card">
          <h2 className="text-xl font-semibold mb-4">Listing Saya</h2>
          <div className="space-y-4">
            {listings.map((listing: any) => (
              <div key={listing.id} className="border p-4 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{listing.title}</h3>
                    <p>{listing.location} - Rp {listing.price?.toLocaleString?.()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(listing)} className="rounded bg-yellow-400 px-3 py-1 text-sm">Edit</button>
                    <button onClick={() => handleDelete(listing.id)} className="rounded bg-red-500 px-3 py-1 text-sm text-white">Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}