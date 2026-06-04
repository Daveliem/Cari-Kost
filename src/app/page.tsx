'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const SearchMap = dynamic(() => import('@/components/SearchMap'), { ssr: false });

interface Listing {
  id: number;
  title: string;
  price: number;
  location: string;
  room_type: string;
  description: string;
  images?: string[];
  average_rating?: number;
  review_count?: number;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    roomType: '',
    amenities: [] as string[],
  });
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const amenityOptions = ['AC', 'WiFi', 'Kamar mandi dalam', 'Dapur', 'Parkir', 'Laundry', 'Listrik 24 jam', 'Air panas', 'TV', 'Ruang tamu'];
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const router = useRouter();

  const hasLocation = Boolean(
    userLocation &&
      typeof userLocation.lat === 'number' &&
      typeof userLocation.lng === 'number'
  );

  const currentUserLocation = hasLocation && userLocation ? userLocation : null;

  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  };

  const fetchListings = async () => {
    const params = new URLSearchParams();
    if (search) params.append('location', search);
    if (filters.priceMin) params.append('priceMin', filters.priceMin);
    if (filters.priceMax) params.append('priceMax', filters.priceMax);
    if (filters.amenities && filters.amenities.length > 0) params.append('amenities', filters.amenities.join(','));
    if (filters.roomType) params.append('roomType', filters.roomType);

    const res = await fetch(`/api/listings?${params}`);
    if (!res.ok) {
      setListings([]);
      return;
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      setListings([]);
      return;
    }
    const parsed = (data as Listing[]).map((listing) => {
      const latitude = listing.latitude != null ? Number(listing.latitude) : undefined;
      const longitude = listing.longitude != null ? Number(listing.longitude) : undefined;
      const parsedListing = {
        ...listing,
        latitude,
        longitude,
        distanceKm:
          currentUserLocation && latitude !== undefined && longitude !== undefined
            ? Number(getDistanceKm(currentUserLocation.lat, currentUserLocation.lng, latitude, longitude).toFixed(1))
            : undefined,
      };
      return parsedListing;
    });
    setListings(parsed);
  };

  const fetchFavorites = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setFavoriteIds([]);
      return;
    }

    const res = await fetch('/api/favorites', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setFavoriteIds(data);
    } else {
      setFavoriteIds([]);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters]);

  const detectNearby = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung penentuan lokasi.');
      return;
    }

    setLoadingNearby(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords;
        if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
          setUserLocation({ lat: coords.latitude, lng: coords.longitude });
          setNearbyOnly(true);
          fetchListings();
        } else {
          setUserLocation(null);
          alert('Lokasi tidak tersedia. Coba lagi nanti.');
        }
        setLoadingNearby(false);
      },
      () => {
        setUserLocation(null);
        setLoadingNearby(false);
        alert('Gagal mendapatkan lokasi Anda. Pastikan izin lokasi diberikan.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchListings();
  };

  const toggleFavorite = async (id: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const isFavorite = favoriteIds.includes(id);
    const method = isFavorite ? 'DELETE' : 'POST';
    const res = await fetch('/api/favorites', {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ listingId: id }),
    });

    if (res.ok) {
      setFavoriteIds((current) =>
        isFavorite ? current.filter((item) => item !== id) : [...current, id]
      );
    }
  };

  const enrichedListings = listings.map((listing) => ({
    ...listing,
    distanceKm:
      currentUserLocation && listing.latitude != null && listing.longitude != null
        ? Number(getDistanceKm(currentUserLocation.lat, currentUserLocation.lng, listing.latitude, listing.longitude).toFixed(1))
        : undefined,
  }));

  const visibleListings = favoriteOnly
    ? enrichedListings.filter((listing) => favoriteIds.includes(listing.id))
    : enrichedListings;

  const nearbyListings = nearbyOnly
    ? visibleListings.filter((listing) => listing.distanceKm !== undefined && listing.distanceKm <= 5)
    : visibleListings;

  const displayListings = nearbyOnly
    ? nearbyListings.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    : visibleListings;

  const mapListings = displayListings.filter(
    (listing) => listing.latitude != null && listing.longitude != null
  ) as Array<Listing & { latitude: number; longitude: number }>;

  const mapCenter: [number, number] = currentUserLocation
    ? [currentUserLocation.lat, currentUserLocation.lng]
    : mapListings.length > 0
    ? [mapListings[0].latitude as number, mapListings[0].longitude as number]
    : [-6.200000, 106.816666];

  const renderStars = (rating: number) => {
    const filled = Math.round(rating);
    return Array.from({ length: 5 }, (_, index) => (
      <span key={index} className={index < filled ? 'text-amber-400' : 'text-slate-300'}>
        ★
      </span>
    ));
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="space-y-12">
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-600 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_30%)] opacity-80" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="space-y-7 lg:max-w-3xl">
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/90">Cari Kos & Apartemen</p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Temukan kos nyaman dekat kampus, kantor, dan tempat favoritmu.</h1>
              <p className="max-w-2xl text-base leading-8 text-slate-200/90 sm:text-lg">
                Jelajahi pilihan kos dengan harga terbaik, fasilitas lengkap, dan lokasi strategis. Gunakan filter untuk mempersempit hasil dengan cepat.
              </p>
              <form id="search" onSubmit={handleSearch} className="grid gap-3 sm:max-w-2xl">
                <label className="sr-only" htmlFor="search-input">Cari lokasi kos</label>
                <input
                  id="search-input"
                  type="text"
                  placeholder="Masukkan lokasi, nama kos, atau fasilitas..."
                  className="min-w-0 rounded-full border border-white/20 bg-white/10 px-5 py-4 text-slate-100 placeholder-slate-300 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] outline-none transition duration-200 focus:border-emerald-300 focus:bg-white/20 focus:ring-2 focus:ring-emerald-300/30"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <p className="mt-2 text-sm text-slate-200">Cari berdasarkan nama atau lokasi kos. Ketik untuk melihat hasil otomatis.</p>
              </form>
              {userLocation && (
                <p className="text-sm text-slate-200">
                  Menampilkan kos terdekat dalam radius 5 km dari lokasi Anda.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Lihat hasil di peta</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Sorot lokasi kos pada peta untuk melihat pilihan yang paling dekat dengan Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!nearbyOnly) {
                    detectNearby();
                  } else {
                    setNearbyOnly(false);
                    setUserLocation(null);
                  }
                }}
                className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${nearbyOnly ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-emerald-500 text-white hover:bg-emerald-600'} btn-strong`}
              >
                {nearbyOnly ? 'Tampilkan semua' : 'Hanya kos dekat saya'}
              </button>
            </div>
            <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100">
              {mapListings.length > 0 ? (
                <SearchMap listings={mapListings} userLocation={userLocation ?? undefined} center={mapCenter} />
              ) : (
                <div className="flex h-56 items-center justify-center px-6 text-center text-sm text-slate-700">
                  Peta belum tersedia karena belum ada listing dengan data koordinat lengkap. Tambahkan listing dengan latitude/longitude agar dapat ditampilkan.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-white p-6 shadow-sm shadow-slate-200 card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Persempit pencarian</h2>
                <p className="mt-2 text-sm text-slate-700">Atur harga, tipe kamar, dan fasilitas agar hasil muncul lebih akurat.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setFilters({ priceMin: '', priceMax: '', roomType: '', amenities: [] });
                  setFavoriteOnly(false);
                  fetchListings();
                }}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 btn-strong btn-ghost"
              >
                Atur ulang filter
              </button>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              <div className="rounded-3xl border border-slate-200 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">Rentang harga</h3>
                <div className="grid gap-3">
                  <label className="block text-xs font-medium uppercase tracking-[0.2em] text-slate-700">Min</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Rp 0"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={filters.priceMin ? Number(filters.priceMin).toLocaleString('id-ID') : ''}
                    onChange={(e) => setFilters({ ...filters, priceMin: e.target.value.replace(/\D/g, '') })}
                  />
                  <label className="block text-xs font-medium uppercase tracking-[0.2em] text-slate-700">Max</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Rp 5.000.000"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={filters.priceMax ? Number(filters.priceMax).toLocaleString('id-ID') : ''}
                    onChange={(e) => setFilters({ ...filters, priceMax: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">Tipe kamar</h3>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  value={filters.roomType}
                  onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
                >
                  <option value="">Pilih tipe kamar...</option>
                  <option value="single">Single</option>
                  <option value="shared">Shared</option>
                </select>
              </div>


              <div className="rounded-3xl border border-slate-200 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">Fasilitas</h3>
                <div className="space-y-4">
                  <label className="block text-xs font-medium uppercase tracking-[0.2em] text-slate-700 mb-2">Pilih fasilitas</label>
                  <div className="grid gap-2 max-h-60 overflow-y-auto pr-2">
                    {amenityOptions.map((a) => {
                      const checked = filters.amenities.includes(a);
                      return (
                        <label key={a} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setFilters({
                                ...filters,
                                amenities: e.target.checked
                                  ? [...filters.amenities, a]
                                  : filters.amenities.filter((x) => x !== a),
                              })
                            }
                          />
                          {a}
                        </label>
                      );
                    })}
                  </div>
                  {filters.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {filters.amenities.map((a) => (
                        <span key={a} className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {a}
                          <button
                            type="button"
                            onClick={() =>
                              setFilters({
                                ...filters,
                                amenities: filters.amenities.filter((x) => x !== a),
                              })
                            }
                            className="cursor-pointer hover:text-emerald-900"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">Favorit</h3>
                <button
                  type="button"
                  onClick={() => setFavoriteOnly(!favoriteOnly)}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${favoriteOnly ? 'bg-emerald-500 text-white' : 'border border-slate-200 bg-slate-50 text-slate-700'}`}
                >
                  {favoriteOnly ? 'Hanya favorit' : 'Tampilkan favorit'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Hasil pencarian</h2>
              <p className="mt-2 text-sm text-slate-700">
                Menampilkan {displayListings.length} kos{favoriteOnly ? ' favorit' : ''}{nearbyOnly ? ' dalam radius 5 km' : ''} yang cocok dengan pilihanmu.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              {filters.roomType && <span className="rounded-full bg-slate-100 px-3 py-2">Tipe: {filters.roomType}</span>}
              {filters.priceMin && <span className="rounded-full bg-slate-100 px-3 py-2">Min: Rp {Number(filters.priceMin).toLocaleString()}</span>}
              {filters.priceMax && <span className="rounded-full bg-slate-100 px-3 py-2">Max: Rp {Number(filters.priceMax).toLocaleString()}</span>}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayListings.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-700">
                {favoriteOnly ? 'Tidak ada kos favorit. Tandai beberapa item terlebih dahulu.' : 'Tidak ada listing yang cocok.'}
              </div>
            ) : (
              displayListings.map((listing) => {
                const isFavorite = favoriteIds.includes(listing.id);
                return (
                  <div key={listing.id} className="overflow-hidden rounded-[2rem] bg-white shadow-sm shadow-slate-200 transition hover:-translate-y-1 hover:shadow-md border border-black">
                    <div className="relative h-56 bg-slate-200">
                      <div
                        className={`absolute inset-0 bg-cover bg-center ${listing.images && listing.images.length > 0 ? '' : 'bg-slate-200'}`}
                        style={listing.images && listing.images.length > 0 ? { backgroundImage: `url(${listing.images[0]})` } : undefined}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent px-5 py-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/90">{listing.room_type}</p>
                      </div>
                    </div>
                    <div className="space-y-4 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-semibold text-slate-900">{listing.title}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                            <span>{listing.location}</span>
                            {listing.distanceKm !== undefined && (
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                {listing.distanceKm} km
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(listing.id)}
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-lg transition ${isFavorite ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}
                          aria-label={isFavorite ? 'Hapus favorit' : 'Tambah favorit'}
                        >
                          {isFavorite ? '★' : '☆'}
                        </button>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="flex items-center gap-1">
                          {renderStars(listing.average_rating ?? 0)}
                        </span>
                        <span>({listing.review_count ?? 0} ulasan)</span>
                      </div>
                      <p className="text-sm leading-6 text-slate-700 line-clamp-2">{listing.description ?? 'Deskripsi singkat kos.'}</p>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xl font-semibold text-emerald-600">Rp {listing.price.toLocaleString()}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-700">Per bulan</p>
                        </div>
                        <Link
                          href={`/listing/${listing.id}`}
                          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Lihat detail
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white p-10 shadow-sm shadow-slate-200 border border-black">
            <h2 className="text-2xl font-bold text-slate-900">Tentang Kami</h2>
            <p className="mt-4 text-slate-700">
              Website ini bertujuan untuk kalian yang ingin menemukan kos yang nyaman, terjangkau, dan dekat dengan lokasi favorit kalian.
            </p>
          </div>
        </section>

        <section id="help" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span id="contact" className="sr-only">Kontak</span>
          <div className="grid gap-6 rounded-3xl bg-white p-10 shadow-sm shadow-slate-200 md:grid-cols-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Bantuan</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>Cari penggunaan</li>
                <li>Kebijakan privasi</li>
                <li>Syarat & ketentuan</li>
                <li>Hubungi kami</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Kontak</h3>
              <p className="mt-4 text-sm text-slate-700">unika@gmail.com</p>
              <p className="text-sm text-slate-700">0812-3456-7890</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Favorit</h3>
              <p className="mt-4 text-sm text-slate-700">Tandai kos favorit agar mudah dicari kembali.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
