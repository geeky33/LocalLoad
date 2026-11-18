# LocalLoad

**Know your train. Beat the rush.**

LocalLoad is a Mumbai suburban railway companion app built with React Native (Expo), Node.js/Express, MongoDB and Socket.IO. Commuters can follow trains on a map, see crowd levels that other commuters have verified, report crowds and delays, and save their daily routes.

> ⚠️ **All train positions and timetables in LocalLoad are SIMULATED.** The backend generates them from dummy data and approximate station coordinates. LocalLoad does not use real railway GPS data, real railway APIs or the official timetable.

---

## 1. Project overview

LocalLoad has five tabs: **Home, Track, Report, Insights, Profile**. Signed-in users can:

- search a demo timetable (by train number or name, from/to station, line, fast/slow, up/down),
- open a train and watch its **simulated live position** move along the route on a map,
- report **crowd levels** (green / yellow / red) and **delays**,
- see a crowd or delay status only once **at least five different users agree** (a strict majority),
- save daily routes and get **alerts** when a confirmed crowd or delay status changes on them,
- look at insights built from **sample historical crowd data**,
- switch between **light, dark and system** themes.

## 2. Problem statement

Mumbai locals carry millions of passengers a day, and commuters have no easy way to know how crowded the next train is or whether it is late. Crowd information usually spreads by word of mouth and can't be trusted. A single false report can mislead everyone.

## 3. Objectives

1. Show train movement visually on a map, the way well-known commuter apps do, using clearly labelled simulated data.
2. Collect crowd and delay information from commuters.
3. Make that information trustworthy with a **five-distinct-user verification** rule and duplicate-vote protection.
4. Notify users only about **meaningful, confirmed** changes on routes they care about.
5. Keep the architecture simple enough for a college Mobile Application Development project.

## 4. Features

| Area | What is implemented |
|---|---|
| Auth | Signup (name, email, password, confirm), login, logout, JWT sessions kept in the iOS Keychain (expo-secure-store), bcrypt password hashing, protected routes |
| Timetable | 69 station records on 3 lines, 13 demo trains (fast and slow, up and down), filters, search between two stations, the label "SIMULATED TRAIN TIMETABLE" |
| Live tracking | Map with the route polyline, station markers and a moving train marker; previous/next station, ETA, distance, speed and last-updated time; position updates over Socket.IO |
| Crowd reports | Green/yellow/red; 5-user verification; strict majority; "mixed" result; provisional ("Unverified") distribution; duplicate votes blocked in both code and the database |
| Delay reports | 6 categories; the same 5-user verification |
| Daily routes | Create / list / edit / delete; each route shows its next matching trains with crowd and delay status |
| Live crowd feed | **Simulated commuters** (15 demo accounts) report crowds every few seconds for trains at their *current* station. Levels follow the **current Mumbai time** (rush hour is busy, late night is quiet). Home's *Recent crowd updates* refreshes live and shows **who reported** each status (real users as "First L.", demo commuters labelled *demo*). |
| Nearest-station alerts | When a simulated train **arrives at your nearest station** and its crowd is **verified green or yellow**, you get a notification. The phone sends only the station *name* (never coordinates); 60-second cooldown per station; can be switched off in Profile. |
| Nearest station | Uses the phone's location (with permission) to show the closest station, its lines, distance and walking time, with a "Trains from here" shortcut; your position also appears on the tracking map. The location is never stored. |
| Notifications | Server creates a notification and emits `route-alert` when a **confirmed** status changes; the app shows it as a local notification; per-user settings |
| Insights | Best and busiest hours, hourly chart, morning vs evening, weekly trend, most crowded stations (tap for hourly pattern), most crowded trains. Filter **by weekday** (dropdown, defaults to today's weekday) or **by date** (calendar with dots on days that have data). |
| Admin / dev | Start, stop and reset the simulation, change its speed, view verification counts, reports and users (admin accounts only) |
| UI | Light/dark/system theme, line colours, a "coach meter" crowd indicator, loading, empty and error states |

## 5. Technology stack

- **Mobile:** React Native 0.88, Expo SDK 58, TypeScript, React Navigation (bottom tabs + native stack), Axios, react-native-maps (Apple Maps on iOS), socket.io-client, expo-notifications, expo-location, expo-secure-store (JWT), AsyncStorage (theme preference)
- **Backend:** Node.js, Express 5, TypeScript, MongoDB + Mongoose, JWT (jsonwebtoken), bcryptjs, Socket.IO, express-validator, dotenv, cors
- **Testing:** Node's built-in test runner, supertest, mongodb-memory-server, socket.io-client

## 6. Application architecture

```
 iPhone (Expo Go)                                Node.js server
 ┌─────────────────────────┐   REST (Axios)    ┌──────────────────────────────┐
 │ Screens / Components    │ ────────────────▶ │ Express routes → controllers │
 │ AuthContext, Theme      │                   │   ├─ services (verification, │
 │ useTrainTracking hook   │ ◀──── Socket.IO ─ │   │   status, alerts, trains)│
 │ local notifications     │   (rooms)         │   └─ SimulationEngine (tick) │
 └─────────────────────────┘                   └──────────────┬───────────────┘
                                                              │ Mongoose
                                                        ┌─────▼─────┐
                                                        │  MongoDB  │
                                                        └───────────┘
```

The **backend is the source of truth** for train positions. The app only displays them.

## 7. Frontend explanation (`mobile/`)

```
mobile/
├── App.tsx                 providers: SafeArea → Theme → Auth → Navigation
└── src/
    ├── navigation/         RootNavigator (auth stack vs app stack + 5 tabs), param types
    ├── screens/            Welcome, Login, Signup, Home, Track, Tracking (map), Report,
    │                       Insights, Profile, RouteForm, Notifications, Admin
    ├── components/         ui.tsx (Screen, Card, Button, Field, Chips, Pill, states),
    │                       Crowd.tsx (CoachMeter, CrowdStatusCard, pills), TrainCard,
    │                       StationPicker, BarChart (no chart library)
    ├── context/            AuthContext (JWT session), ThemeContext (light/dark/system)
    ├── hooks/              useAsync, useTrainTracking (socket join/leave), useSmoothCoord,
    │                       useRouteAlerts
    ├── services/           api.ts (Axios + token interceptor), socket.ts, notifications.ts,
    │                       tokenStorage.ts (SecureStore)
    ├── constants/theme.ts  colour palettes, line colours, spacing
    ├── types/              shared TypeScript types
    └── utils/format.ts     labels and time formatting
```

- The API URL comes from `EXPO_PUBLIC_API_URL`. If that is not set, the app uses the computer running the Expo dev server, on port 4000, so it usually works on an iPhone with no configuration.
- The tracking screen loads one snapshot over REST and then switches to Socket.IO updates. `useSmoothCoord` animates the marker between server updates; this is visual only.

## 8. Backend explanation (`server/`)

```
server/src/
├── server.ts        connects MongoDB, loads simulation, starts HTTP + Socket.IO
├── app.ts           Express app (cors, json, /api routes, error handlers)
├── config/          env.ts (all env vars), db.ts
├── models/          8 Mongoose models
├── routes/index.ts  all REST routes + validation
├── controllers/     auth, station, train, tracking, report, route, insights, notification, admin
├── middleware/      auth (JWT + admin), validate, error
├── services/        verification.ts (5-user algorithm), status.ts, alerts.ts, trains.ts, runtime.ts
├── simulation/      engine.ts (train movement)
├── sockets/         Socket.IO rooms and events
├── utils/geo.ts     haversine distance, interpolation, time helpers
├── seed/            data.ts (stations, trains), seed.ts (idempotent seed)
├── scripts/         demoVotes.ts (submit votes as demo riders)
└── tests/           verification.test.ts, api.test.ts
```

## 9. Database design

| Collection | Key fields | Indexes |
|---|---|---|
| `users` | name, email, passwordHash (hidden), role, points, notificationSettings | unique `email` |
| `stations` | name, code, line, lat, lng, sequence | unique `code`, `{line, sequence}` |
| `trains` | number, name, line, type, direction, source, destination, stations[] (refs), departureTime, durationMin | unique `number`, `{line, type, direction}` |
| `traininstances` | train (ref), status, segmentIndex, segmentProgress, lat, lng, speedKmph, lastUpdated | unique `train` |
| `crowdreports` | user, trainInstance, train, station, level, reportedAt, windowBucket, isSample | **unique `{user, trainInstance, station, windowBucket}`**, `{trainInstance, station, reportedAt}` |
| `delayreports` | same as crowd, with `category` instead of `level` | same as crowd |
| `savedroutes` | user, name, source, destination, preferredTime, line, preference | `user` |
| `notifications` | user, type, title, body, train, trainInstance, read | `{user, createdAt}` |

Stations are stored **once per line**, so the Dadar on Western and the Dadar on Central are separate records (`W-DDR`, `C-DR`). Search matches stations by name, so "Dadar" works on both lines.

## 10. Five-user crowd verification algorithm

Implemented in `server/src/services/verification.ts` (`computeVerdict`, a pure function):

1. Keep only reports from the **last 10 minutes** (`REPORT_WINDOW_MINUTES`) for that train instance and station.
2. Keep **one vote per user**, the latest.
3. If there are **fewer than 5** distinct users, the result is `unverified`: "Insufficient reports — 3/5 reports received." The distribution is shown, marked provisional.
4. Otherwise, a level is **confirmed** only if it has a **strict majority** (`count × 2 > total`).
5. If no level has a strict majority, the result is `mixed`: "Mixed reports — no clear consensus."

| Reports | Result |
|---|---|
| G1 Y1 R3 (5 users) | **Confirmed RED** |
| G1 Y1 R2 (4 users) | Unverified, 4/5 |
| G3 Y3 (6 users) | Mixed |
| G2 Y2 R1 (5 users) | Mixed |

**Duplicate protection** works on two levels:
- The controller rejects a second vote from the same user for the same train instance and station within the window, with HTTP 409.
- MongoDB has a **unique index** on `{user, trainInstance, station, windowBucket}`, where `windowBucket = floor(time / 10 min)`. Even simultaneous duplicate requests cannot both be stored.

Delay reports use exactly the same algorithm and threshold.

## 11. Simulated train tracking

Implemented in `server/src/simulation/engine.ts`:

1. On startup the server loads each train instance and the coordinates of its ordered halts.
2. Every `SIMULATION_INTERVAL_MS` (a "tick"), each train:
   - **waits** at a station for 2 ticks (8 ticks at the terminus), then
   - **moves**: `distance = speed × tick time × SIMULATION_SPEED_MULTIPLIER`, and `progress += distance / segment length`.
   - Its position is the **linear interpolation** between the two stations: `lat = latA + (latB − latA) × progress` (and the same for lng).
   - Speed follows a smooth curve: slower near stations and up to 65 km/h (fast) or 48 km/h (slow) mid-segment.
   - When `progress ≥ 1`, the train has **arrived**. The next station becomes the previous one and the following station becomes the next.
3. At the end of the route the train rests and then restarts from its origin, so the demo keeps running.
4. Each update is broadcast over Socket.IO and saved to the `traininstances` collection.
5. **ETA** = remaining distance ÷ (75% of cruise speed), in **simulated minutes**. **Distance** uses the haversine formula.

Admins can start, stop, reset and change the speed of the simulation.

## 12. Socket.IO real-time communication

| Direction | Event | Purpose |
|---|---|---|
| client → server | `join-train` (instanceId) | join room `train:<id>`; the server replies with the current position straight away |
| client → server | `leave-train` (instanceId) | leave the room (sent when the tracking screen unmounts) |
| client → server | `join-feed` / `leave-feed` | Home screen joins room `feed` for the live crowd feed |
| client → server | `watch-station` (stationName) | phone's nearest station name → joins room `station:<name>` for arrival alerts |
| server → client | `feed-update` | small ping to the `feed` room after any report; Home re-fetches `/crowd/recent` |
| server → client | `train-position-update` | new simulated position (only to that train's room) |
| server → client | `crowd-status-update` / `delay-status-update` | re-computed verification status after a report |
| server → client | `route-alert` | sent to room `user:<id>`: a confirmed change on a saved route, or a less-crowded train reaching your nearest station (`type: "nearby"`) |

The socket connects with the JWT in `auth.token`, so the server can put each user in their own `user:<id>` room.

## 13. Dummy data and fake coordinates

- Station coordinates in `server/src/seed/data.ts` are **approximate** values typed in by hand. No geocoding API is used.
- 13 trains are generated from line definitions. Fast trains only include the main halts.
- Scheduled time at each halt = departure + duration × (distance so far ÷ total distance).
- About 28 days of sample crowd reports (~6,500) and delay reports (~1,450) are generated with a **fixed random seed**, using a simple pattern (peaks at 8–10am and 5–8pm, busier towards town in the morning, quieter at weekends, busier at hubs). They are flagged `isSample: true` and the Insights screen labels them as sample data.

## 14. Installation requirements

- Node.js 20+ and npm
- MongoDB 6+ (local install, Docker, or MongoDB Atlas)
- An iPhone with the **Expo Go** app, on the **same Wi-Fi** as the computer (or the iOS Simulator)

## 15. Project setup

```bash
git clone <your-repo-url> LocalLoad
cd LocalLoad
```

## 16. Backend configuration

```bash
cd server
npm install
cp .env.example .env      # then edit JWT_SECRET (and MONGODB_URI if needed)
```

## 17. Frontend configuration

```bash
cd mobile
npm install
cp .env.example .env      # optional: set EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:4000
```

If `EXPO_PUBLIC_API_URL` is empty, the app uses the Expo dev server's IP with port 4000. **Do not use `localhost` on a physical phone**, because there it means the phone itself.

## 18. Environment variables

`server/.env`

| Variable | Example | Meaning |
|---|---|---|
| `PORT` | 4000 | API / Socket.IO port |
| `MONGODB_URI` | mongodb://127.0.0.1:27017/localload | database connection |
| `JWT_SECRET` | long random string | signs login tokens (required in production) |
| `JWT_EXPIRES_IN` | 7d | session length |
| `SIMULATION_INTERVAL_MS` | 3000 | time between simulation ticks |
| `SIMULATION_SPEED_MULTIPLIER` | 10 | how much faster than real time trains move |
| `SIMULATION_AUTOSTART` | true | start moving trains when the server boots |
| `SIMULATED_COMMUTERS` | true | demo commuters report crowds live (based on current time) |
| `NEARBY_ALERT_COOLDOWN_MS` | 60000 | at most one nearest-station alert per user per station in this time |
| `SIM_COMMUTER_INTERVAL_MS` | 8000 | how often a group of commuters reports |
| `SIM_COMMUTER_SKIP_TRAINS` | 90101 | trains the commuters never report on (kept clean for the live five-user demo) |
| `REPORT_WINDOW_MINUTES` | 10 | reporting window for votes |
| `VERIFICATION_THRESHOLD` | 5 | distinct users needed for confirmation |
| `SEED_DEMO_PASSWORD` | (choose one) | password given to the demo accounts the seed creates |

`mobile/.env`

| Variable | Meaning |
|---|---|
| `EXPO_PUBLIC_API_URL` | backend URL as seen from the phone, e.g. `http://192.168.1.10:4000` |

`.env` files are git-ignored. Only the `.env.example` files are committed.

## 19. Database setup

Choose one:

```bash
# A) Docker
docker run -d --name localload-mongo -p 27017:27017 mongo:7

# B) Local MongoDB Community Server: start the "mongod" service

# C) MongoDB Atlas: put the connection string into MONGODB_URI
```

## 20. Seed data

```bash
cd server
npm run seed
```

The seed creates or updates stations, trains, train instances and demo users, and regenerates the sample history. It is **idempotent**: you can run it again and nothing is duplicated, because stations, trains, instances and users are upserted by their unique keys, and only `isSample` reports are replaced.

## 21. How to run the application

```bash
# terminal 1 – backend
cd server
npm run dev          # http://0.0.0.0:4000, trains start moving automatically

# terminal 2 – mobile
cd mobile
npx expo start       # scan the QR code with the iPhone camera → opens in Expo Go
```

Other backend scripts: `npm run serve` (same as dev but without file watching; use it if you see `ENOSPC: System limit for number of file watchers reached`), `npm run build && npm start` (compiled JS), `npm test`, `npm run typecheck`.

> ▶️ Just want to run it? **[RUN.md](RUN.md)** has the simplest step-by-step instructions.
>
> 🎤 Presenting? **[demo.md](demo.md)** is a scene-by-scene demo script with every command, tap and talking point.

### Testing simulated tracking
1. Log in and open **Track** (or the "Running now" cards on Home), then tap a train.
2. The train marker moves along the coloured route every tick. The bottom panel updates "Between X and Y", the next station, ETA, speed, distance and last updated.
3. Log in as `admin@localload.dev` → Profile → **Admin** to stop, start or reset the simulation or change its speed. You can also use the REST endpoints with an admin token.

### Testing five-user verification
You only have one phone, so the seed creates 8 demo riders. With the server running:

```bash
cd server
npm run demo:votes -- 90101 Dadar red,green,yellow,red        # 4/5 → Unverified
npm run demo:votes -- 90101 Dadar red                         # rider1 again → 409 duplicate
# (wait 10 minutes, or use another station, for a fresh window)
npm run demo:votes -- 90101 Andheri green,yellow,red,red,red  # → CONFIRMED red
npm run demo:votes -- 95102 Thane green,green,green,yellow,yellow,yellow   # → MIXED
```

Keep the tracking screen for that train open on the phone: its crowd card updates live. If you save a route that the train serves (e.g. Western, Dadar → Borivali), you also get a route alert.

### Automated tests
```bash
cd server
npm test
```
There are 17 tests:
- **Unit tests** for all six verification cases from the specification (5 reports G1 Y1 R3, 4/5 unverified, 3–3 mixed, the same user voting repeatedly, expired reports, and 5 users with no majority).
- **Integration tests** against an in-memory MongoDB, covering signup, login, invalid credentials, duplicate email, protected routes, admin-only controls, train listing and search, Socket.IO position updates for a joined train, crowd reporting, duplicate-vote rejection, 5-user confirmation, mixed results, delay verification, saved-route CRUD and route alerts.

The first run downloads a MongoDB binary (~100 MB).

## 22. API endpoint summary

All endpoints are under `/api`. 🔒 = needs `Authorization: Bearer <token>`; 🛠 = admin only.

| Method | Path | Notes |
|---|---|---|
| POST | /auth/register | name, email, password |
| POST | /auth/login | returns `{ token, user }` |
| GET | /auth/me 🔒 | user + report stats |
| GET | /stations, /stations/:id | `?line=western` |
| GET | /stations/nearest | `?lat=19.02&lng=72.84&limit=3` → closest stations with distance, lines and walking minutes |
| GET | /trains, /trains/search | `q, line, type, direction, from, to` (station names) |
| GET | /trains/:id | halts with scheduled times + instanceId |
| GET | /trains/:id/status | position + crowd + delay |
| GET | /tracking/active | all simulated positions |
| GET | /tracking/:trainInstanceId | position + route |
| POST | /reports/crowd 🔒 | `trainInstanceId, stationId, level` |
| GET | /reports/crowd/:trainInstanceId | recent reports (anonymous) |
| GET | /crowd/status/:trainInstanceId | per-station verdicts + summary (each with `reporters`) |
| GET | /crowd/recent | `?limit=6` live feed: latest crowd statuses across all trains, with reporters |
| POST | /reports/delay 🔒 | `trainInstanceId, stationId, category` |
| GET | /delay/status/:trainInstanceId | per-station verdicts + summary |
| POST/GET | /routes 🔒 | create / list (with matching trains) |
| PUT/DELETE | /routes/:id 🔒 | update / delete own route |
| GET | /insights/overview, /insights/station/:stationId | sample-data aggregates; optional `?day=1..7` (Mon..Sun) or `?date=YYYY-MM-DD` (IST) |
| GET | /insights/weekly | average crowd score per weekday |
| GET | /insights/dates | dates that have reports (for the calendar) |
| GET | /notifications 🔒 | latest 30 |
| PUT | /notifications/settings 🔒, /notifications/read 🔒 | settings / mark read |
| GET | /admin/users, /admin/reports, /admin/verification, /admin/simulation/status 🛠 | |
| POST | /admin/simulation/start, /stop, /reset, /speed 🛠 | `/speed` body: `{ multiplier }` (1–100) |

Errors have the form `{ "error": "message" }`, with status codes 400 (validation), 401, 403, 404, 409 (duplicate) and 500.

## 23. Demo login credentials

`npm run seed` creates these **development-only** accounts. Their password is whatever you set as `SEED_DEMO_PASSWORD` in `server/.env`; `.env.example` contains a sample value.

| Email | Role |
|---|---|
| admin@localload.dev | admin (simulation controls) |
| rider1@localload.dev … rider8@localload.dev | normal users (used by `demo:votes`) |
| commuter1@localload.dev … commuter15@localload.dev | simulated commuters (named e.g. *Aarav Shah*, flagged `isDemo`) that report live |

You can also simply sign up a new account in the app.

## 24. Known limitations

- **Everything about train movement is simulated.** Trains run continuously and loop; they don't follow their "scheduled" departure times or real-world time of day.
- Segments between stations are straight lines, not the real track.
- Each train has a single running instance (no separate daily runs).
- Route alerts reach the phone over Socket.IO and are shown as **local notifications**, so they appear only while the app is running (foreground or recently backgrounded). Real background push would need Expo push tokens, an EAS development build and a push sender.
- A user can vote again after the 10-minute window, and old votes simply expire.
- Insights mostly come from generated sample data.
- The live crowd feed is mostly produced by **simulated demo commuters**. They follow a simple time-of-day pattern, not real observations, and are always labelled *demo* in the app. Their reports never trigger route alerts.
- The admin role is assigned only by the seed (there is no admin management UI).

## 25. Future scope

- Integrate official or licensed railway feeds (if available) in place of the simulation.
- Use real track geometry for the polylines.
- Remote push notifications with Expo push tokens.
- Reputation weighting for reliable reporters, and abuse detection.
- Platform numbers, ladies/first-class coach crowding, and accessibility information.
- Offline caching of the timetable.

---

LocalLoad is an academic demonstration project and is not affiliated with Indian Railways or any official railway app.
