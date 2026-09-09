# Solène House — Hotel & Reservations

A demonstration hotel booking system with a continuous 3D journey through the exterior, opening entrance doors, reception and two guest-room wings. Includes date and guest selection, availability, pricing, saved confirmation, booking history and hotel management. Both room categories can be selected and reserved from the 3D tour, with room size, guest capacity, dates and total pricing displayed alongside the model.

## Run the downloaded hotel

1. Install Node.js 24, then extract the complete ZIP into a normal folder.
2. On Windows, double-click START_HOTEL.bat. On macOS or Linux, run `node server/local.mjs --open` from this folder.
3. The hotel opens at http://127.0.0.1:4173. Keep the terminal window open while using it. Copy this address into your browser if it does not open automatically.

No npm installation is needed to run the included build. Do not open public/index.html directly: availability and confirmed bookings need the included server. If port 4173 is in use, stop the earlier copy or set the SOLENE_PORT environment variable.

The local version binds only to your computer and treats its operator as the hotel manager. Reservations survive restarts in data/hotel.sqlite. Stop the server and keep the entire data directory when moving or backing up your hotel. The downloaded copy and the hosted site have separate databases.

## Booking and management

- Deluxe King: ₹6,500 per night, up to 2 guests, 12 rooms.
- Signature Suite: ₹10,500 per night, up to 3 guests, 4 rooms.
- Optional breakfast: ₹650 per guest per night. All demonstration room charges are included; no online payment is taken.
- Choose dates and guests, reserve an available category, review guest details and the price, then confirm. Only a successful database save creates a confirmation reference and assigned room number.
- My bookings shows saved reservations and confirmation downloads. Guests can cancel before their arrival date.
- Management shows reservations, search, status filters and totals. Managers can cancel confirmed reservations, check in during the scheduled stay, and check out a checked-in guest.

The hotel is fictional. A confirmation records a reservation in this application only; it does not arrange a real hotel stay, process payment or send email. Connect real property inventory and payment/email providers before selling actual accommodation.

## Hosted implementation

The Sites Worker serves assets locally and uses D1 (DB) for durable reservations. The generated Drizzle migration is packaged with the Worker. Hosted management is restricted on the server to the verified account email in HOTEL_MANAGER_EMAIL; guest records are scoped to the trusted signed-in user ID. For older dispatch responses without that ID, only the configured manager can use the verified email header; an owner key keeps these reservations consistent across both response formats. Existing reservations under a forwarded user ID remain visible to that user.

Availability is checked inside an atomic guarded SQL insert, preventing overlapping bookings of the same room. A unique request key makes retries idempotent. Prices and stay limits are computed on the server. Dates use the hotel's India timezone; checkout dates can be reused for another arrival.

## Source and checks

public/ contains the interface, fonts, photographs and Three.js scene. server/hotel.js contains the API. server/worker.js is the hosted entrypoint. server/local.mjs runs the identical compiled Worker with SQLite. db/schema.ts and drizzle/ define the database.

Run `node scripts/build.mjs` to build dist/. Run `node --test tests/booking.test.mjs` for database-backed booking checks. To create a new schema migration, install dependencies with `npm install` and run `npm run db:generate`. Never edit an applied migration.

Reduced-motion preferences and a manual motion control are supported. If WebGL is unavailable, hotel photography and booking controls remain usable. JavaScript and a running server are required for reservations.
