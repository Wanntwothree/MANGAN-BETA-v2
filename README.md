# MANGAN beta

MANGAN is a local-first restaurant discovery beta for Dagupan. Food lovers can
search places by craving, inspect venue details, save favorites, and share beta
feedback. Restaurant owners can submit and manage listings. Admins can monitor
accounts, feedback, and listing approvals.

## Run locally

Requires Node.js 22.13 or later. Run `START-BETA.bat` or use PowerShell:

```powershell
node server.js
```

Open <http://localhost:3198>. Stop the server with `Ctrl+C`. The first start
creates `data/mangan.sqlite` and applies the numbered SQL migrations.

Optional server settings:

```powershell
$env:PORT = "3198"
$env:HOST = "127.0.0.1"
$env:DATABASE_PATH = "C:\path\to\mangan.sqlite"
node server.js
```

### Run through XAMPP (Apache)

The frontend is a static site and does not need Node.js. To run it:

1. Start **Apache** in the XAMPP Control Panel.
2. Copy this project folder into `C:\xampp\htdocs` (for example
   `C:\xampp\htdocs\mangan_sia-main`).
3. Open <http://localhost/mangan_sia-main/index.html> in your browser.

The root `index.html` forwards to `public/index.html`, where the app lives.

All CSS, JavaScript, image, and page links use relative paths, so the folder
can have any name. Login and favorites work locally through `localStorage`
(`demoCurrentUser` and `favorites_<email>`), and a built-in sample restaurant
catalog is used when the API is not running.

Node.js is optional. If you want live SQLite data, owner tools, admin
monitoring, geocoding, or weather, run `node server.js` as described above.
The optional XAMPP launcher (`START-XAMPP-BETA.bat`) starts the Node API on
port 3198 in addition to serving the static frontend.

### Admin account

Admin accounts cannot be registered from the public form. The app seeds the
default admin account `admin@mangan.com` / `admin_123` on first start. Override
both values with environment variables if you need different credentials; the
password must be between 8 and 128 characters:

```powershell
$env:ADMIN_EMAIL = "admin@example.test"
$env:ADMIN_PASSWORD = "Use-A-Unique-Local-Password!"
node server.js
```

The local beta shows a password-reset code on screen. Password-reset email
delivery is not configured; password recovery explicitly returns an error when
`NODE_ENV=production`. Do not expose this development beta or use real personal
credentials. For production, configure a proper email provider and HTTPS.

## Roles and walkthrough

- **Food lover:** Register at `/register.html`, choose **Food lover**, then
  search, filter, view details, and save restaurants.
- **Restaurant owner:** Register at `/register.html`, choose **Restaurant
  owner**, then use `/owner.html` to submit, edit, or remove listings. New and
  edited listings remain private until an admin approves them.
- **Admin:** Sign in with the environment-seeded account to use `/admin.html`.
  Review owner listings, suspend/restore non-admin accounts, and read feedback.
- **Guest:** Browse the sample catalog. Saving favorites and viewing full
  restaurant details requires signing in.

## Beta data and pricing

Seed restaurant details, ratings, review counts, sample hours, and prices are
presentation data and may not be current. The supplied restaurant and food
photos are bundled locally and mapped to the sample listings. Owner-submitted
price ranges and all displayed prices are in **Philippine pesos (₱)**. Confirm
venue information and image-use permissions before public presentation. The
sample catalog is not a live directory.

## Checks

```powershell
npm.cmd test
npm.cmd run check
```

Smoke tests use a temporary SQLite database and cover discovery, search,
filters, favorites, account registration/login, owner submissions, admin
approval, password reset, feedback, and route validation.

## API and migration path

The browser uses same-origin JSON endpoints:

- `GET /api/health`, `GET /api/auth/me`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `POST /api/auth/forgot`, `POST /api/auth/reset` (development only)
- `GET /api/restaurants?q=&category=&sort=`
- `GET /api/restaurants/:id/location` (approved restaurant location; geocoded and cached on first request when configured)
- `GET /api/restaurants/nearby?lat=&lng=&radiusKm=` (approved, geocoded listings; radius 0.1–100 km)
- `GET /api/weather?lat=&lng=` (current conditions and hot/cold comfort advice from Open-Meteo)
- `GET|POST /api/owner/restaurants`, `PATCH|DELETE /api/owner/restaurants/:id`
- `POST /api/owner/geocode` (owner-only Google Maps address lookup)
- `GET /api/admin/overview`, `PATCH /api/admin/restaurants/:id`,
  `PATCH /api/admin/users/:id`
- `GET|POST /api/favorites`, `DELETE /api/favorites/:restaurantId`
- `POST /api/feedback`

HTTP routing, authentication, SQLite migrations, and repository queries are
separated in `src/server.js`, `src/auth-service.js`, `src/database.js`, and
`src/restaurant-repository.js`. Add numbered SQL migrations under
`src/migrations/`. To move to a hosted database, preserve the HTTP/API contract
and replace the persistence adapter rather than rewriting the frontend.

## Google Maps integration

Restaurants now have optional validated `latitude` and `longitude` values,
persisted by migration `006_restaurant_coordinates.sql`. Owners can save
coordinates with a listing, and the nearby-restaurants API returns approved,
geocoded listings with distance in kilometers. Listings without coordinates are
left out of nearby results. Restaurant owners can use the address lookup in
their dashboard; it calls Google Geocoding API through the server and is
limited to 10 lookups per owner per minute.

Enable the Google Geocoding API and configure a server-side key before starting
the app:

```powershell
$env:GOOGLE_MAPS_API_KEY = "your-server-side-key"
$env:GOOGLE_MAPS_COUNTRY = "PH"
node server.js
```

Never commit the key or return it to the browser. Restrict the Google Cloud key
to the Geocoding API and set billing alerts/quotas. On first opening a
restaurant with no saved coordinates, MANGAN can geocode its approved listing
and cache that location. Public map lookups are limited to 20 per IP per minute.
The discovery details use Leaflet and OpenStreetMap tiles to show the restaurant
pin and (when permission is granted) the current user location. The dashed
connector is a straight-line preview; the Google Maps link opens turn-by-turn
directions.

The detail view also displays current destination weather from Open-Meteo,
including a cold/cool/warm/hot comfort note. It needs no API key; weather is
cached for five minutes and failures are shown as a status message rather than
breaking restaurant details. Both map tiles and weather need an internet
connection. Browser geolocation normally requires localhost or HTTPS and is
optional; denying permission still leaves the restaurant pin and directions.
