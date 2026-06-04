# Pencarian Kos

Website pencarian kos untuk kota-kota di Indonesia. Platform web untuk pemilik kos menambah listing dan pencari kos mencari tempat tinggal.

## Fitur

- Pencarian kos dengan filter lokasi, harga, tipe kamar
- Dashboard untuk pemilik kos menambah listing
- Sistem ulasan anonim
- Autentikasi dasar untuk pemilik

## Teknologi

- Next.js 16 dengan TypeScript
- Tailwind CSS untuk styling
- SQLite untuk database lokal
- bcryptjs untuk hashing password
- jsonwebtoken untuk JWT

## Instalasi

1. Clone repository
2. Install dependencies: `npm install`
3. Jalankan development server: `npm run dev`
4. Buka [http://localhost:3000](http://localhost:3000)

## API Routes

- `POST /api/auth/register` - Register pemilik
- `POST /api/auth/login` - Login
- `GET/POST /api/listings` - Get listings / Create listing
- `GET /api/listings/[id]` - Get listing detail
- `GET/POST /api/reviews` - Get reviews / Add review

## Database Schema

- users: id, email, password, name, role
- listings: id, title, description, price, location, latitude, longitude, room_type, amenities, contact, user_id
- reviews: id, listing_id, rating, comment, created_at

## Deployment

Untuk production, gunakan hosting seperti DigitalOcean atau Vercel. Pastikan environment variable JWT_SECRET diset.
