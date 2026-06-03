'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

const ListingMap = dynamic(() => import('@/components/ListingMap'), { ssr: false });

interface Listing {
  id: number;
  title: string;
  description: string;
  price: number;
  location: string;
  latitude: number;
  longitude: number;
  room_type: string;
  amenities: string;
  images?: string[];
  contact: string;
  average_rating?: number;
  review_count?: number;
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
  reviewer_email?: string;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const Stars = ({ value }: { value: number }) => (
  <div className="flex items-center gap-1">
    {Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={i < value ? 'text-amber-400' : 'text-slate-300'}>★</span>
    ))}
  </div>
);

export default function ListingDetail() {
  const params = useParams();
  const id = params.id as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const router = useRouter();

  useEffect(() => {
    fetchListing();
    fetchReviews();
  }, [id]);

  const fetchListing = async () => {
    const res = await fetch(`/api/listings/${id}`);
    if (!res.ok) {
      setListing(null);
      return;
    }
    const data = await res.json();
    const parsed = {
      ...data,
      images: typeof data.images === 'string' ? JSON.parse(data.images || '[]') : data.images || [],
      average_rating: data.average_rating != null ? Number(data.average_rating) : 0,
      review_count: data.review_count != null ? Number(data.review_count) : 0,
      latitude: data.latitude != null ? Number(data.latitude) : null,
      longitude: data.longitude != null ? Number(data.longitude) : null,
    };
    setListing(parsed);
  };

  const fetchReviews = async () => {
    const res = await fetch(`/api/reviews?listingId=${id}`);
    const data = await res.json();
    setReviews(data);
  };

  const submitReview = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ listingId: id, ...newReview })
    });
    setNewReview({ rating: 5, comment: '' });
    await fetchReviews();
    await fetchListing();
  };

  if (!listing) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <a href="/" className="text-blue-600">← Kembali ke Pencarian</a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {listing.images && listing.images.length > 0 ? (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {listing.images.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`${listing.title} foto ${idx + 1}`}
                className="h-48 w-full rounded-3xl object-cover shadow-sm"
              />
            ))}
          </div>
        ) : null}

        {typeof listing.latitude === 'number' && typeof listing.longitude === 'number' ? (
          <div className="mb-8 overflow-hidden rounded-3xl shadow-sm">
            <ListingMap
              latitude={listing.latitude}
              longitude={listing.longitude}
              title={listing.title}
              location={listing.location}
            />
          </div>
        ) : (
          <div className="mb-8 rounded-3xl bg-slate-50 p-6 text-slate-600 shadow-sm">
            Koordinat belum tersedia untuk lokasi ini.
          </div>
        )}
        <div className="bg-white p-6 rounded-lg shadow mb-8 card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
              <p className="text-slate-700">{listing.location}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900">Rating rata-rata</p>
              <p className="mt-1 text-lg font-semibold text-emerald-600">{Number(listing.average_rating ?? 0).toFixed(1)} / 5</p>
              <p className="text-slate-500">{listing.review_count ?? 0} ulasan</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 text-sm text-slate-700">
            <p><strong>Tipe:</strong> {listing.room_type}</p>
            <p><strong>Fasilitas:</strong> {listing.amenities}</p>
          </div>
          <p className="mt-4 text-slate-700">{listing.description}</p>
          <p className="mt-4 text-lg text-slate-900"><strong>Kontak:</strong> {listing.contact}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-8 card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Ulasan</h2>
            <div className="text-sm text-slate-500">{reviews.length} ulasan</div>
          </div>

          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold">{review.comment?.trim()?.[0]?.toUpperCase() ?? 'U'}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">{review.reviewer_name ?? 'Pengguna'}</div>
                      <div className="text-xs text-slate-600">{formatDate(review.created_at)}</div>
                    </div>
                    {review.reviewer_email && (
                      <div className="text-xs text-slate-600">{review.reviewer_email}</div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <Stars value={review.rating} />
                      <div className="text-sm text-slate-500">{review.rating}/5</div>
                    </div>
                    <p className="mt-3 text-slate-700">{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Tambah Ulasan</h3>
            <div className="flex items-center gap-2 mb-3">
              {([5,4,3,2,1] as number[]).map((n) => (
                <button
                  key={n}
                  onClick={() => setNewReview({...newReview, rating: n})}
                  className={`px-3 py-1 rounded ${newReview.rating === n ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-700'}`}
                >{n} ★</button>
              ))}
            </div>
            <textarea
              placeholder="Tulis ulasan Anda..."
              value={newReview.comment}
              onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
              className="border p-3 rounded w-full mb-3"
            />
            <div className="flex items-center gap-3">
              <button onClick={submitReview} className="bg-emerald-600 text-white px-4 py-2 rounded">Kirim Ulasan</button>
              <button onClick={() => setNewReview({ rating: 5, comment: '' })} className="rounded border px-3 py-1 text-sm">Batal</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}