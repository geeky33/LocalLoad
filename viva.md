# LocalLoad – Viva Preparation Guide

This guide explains LocalLoad in simple language so you can present it and answer a professor's questions. Everything here describes what is **actually implemented** in this repository.

---

## Explain the Complete Project in 2 Minutes

> "Good morning. Our project is **LocalLoad**, a companion app for Mumbai local trains. Its tagline is *Know your train. Beat the rush.*
>
> Mumbai commuters have two daily questions: *Where is my train?* and *How crowded is it?* LocalLoad answers both.
>
> The app is built with **React Native and Expo**, so it runs on an iPhone through Expo Go. The backend is **Node.js with Express**, the data is stored in **MongoDB**, and real-time updates are sent with **Socket.IO**.
>
> First, **train tracking**. We don't have access to real railway GPS, so we **simulate** it honestly. We stored about 69 station records on the Western, Central and Harbour lines with approximate coordinates, plus 13 demo trains. Every few seconds the server moves each train a little along the line between two stations using **coordinate interpolation**, and sends the new position to phones through Socket.IO. On the map you see the route, the stations and the train marker moving, along with the next station, ETA and speed. Every screen clearly says the data is simulated.
>
> Second, **crowd reporting**. Any user can report a train as green, yellow or red. We don't trust a single report: a crowd level is **confirmed only when at least five different users** report within 10 minutes **and** one colour has a **strict majority**. Otherwise we show 'Unverified 3/5' or 'Mixed reports'. Each user can vote only once per train and station in that window, and a unique index in MongoDB enforces this. Delays work the same way.
>
> Users can also **save daily routes**. When a crowd or delay status is confirmed on their route, they get an **alert**. The **Insights** screen shows the busiest hours, the best time to travel and weekly trends, from sample historical data.
>
> There is also login with **JWT** and **bcrypt**, a small admin screen to control the simulation, light and dark themes, and automated tests for the verification rules. Thank you."

---

## Core questions

### 1. What is LocalLoad?
A mobile app for Mumbai suburban rail commuters. It shows simulated live train positions on a map, a demo timetable, crowd and delay levels verified by the community, saved daily routes with alerts, and crowd insights.

### 2. Why did we choose this project?
Local trains are the lifeline of Mumbai, and we face the crowd problem ourselves. The project also covers every important mobile-development topic: UI, navigation, REST APIs, authentication, databases, maps, real-time communication and notifications.

### 3. What real-world problem does it solve?
Commuters can't see how crowded a train is before it arrives, and rumours aren't reliable. LocalLoad collects reports from many commuters and only shows a status once enough people agree, so the information can be trusted.

### 4. What are the main features?
Login/signup, train search with filters, simulated live tracking on a map, crowd reporting with five-user verification, delay reporting, saved routes, route alerts, insights charts, profile with contribution points, an admin dashboard, and light/dark themes.

### 5. Explain the frontend architecture.
- `App.tsx` wraps the app in providers: SafeArea → **ThemeContext** → **AuthContext** → **NavigationContainer**.
- **RootNavigator** shows the auth screens (Welcome, Login, Signup) when logged out and the main app when logged in.
- The main app is a **bottom tab navigator** (Home, Track, Report, Insights, Profile) inside a stack, which also holds the Tracking map, Route form, Notifications and Admin screens.
- Reusable components live in `components/`, API code in `services/`, and custom hooks in `hooks/` (for example `useTrainTracking` for sockets and `useAsync` for loading and error states).

### 6. Explain the backend architecture.
It is a layered Express app: **routes** (URL + validation) → **controllers** (request handling) → **services** (business logic such as verification and alerts) → **Mongoose models** (database). A **SimulationEngine** class moves trains on a timer, and a **Socket.IO** server pushes updates. Middleware handles JWT authentication, admin checks, validation errors and general errors.

### 7. Why React Native?
We write one JavaScript/TypeScript codebase and get a native iOS (and Android) app. It uses React concepts we already know (components, state, hooks), and with **Expo** we can run it on an iPhone through Expo Go without Xcode.

### 8. Why Node.js and Express?
We use the same language (TypeScript) on the frontend and backend. Node handles many simultaneous connections well, which matters for Socket.IO. Express is minimal and easy to organise into routes and middleware.

### 9. Why MongoDB?
Our data is naturally document-shaped (a train with an ordered list of stations, a report with a few fields). MongoDB stores JSON-like documents, Mongoose gives us schemas and validation, and its **aggregation pipeline** makes the Insights statistics easy. Unique indexes help us block duplicate votes.

### 10. What is a REST API?
A way for the app to talk to the server over HTTP using URLs and methods: `GET` to read, `POST` to create, `PUT` to update, `DELETE` to remove. For example, `GET /api/trains/search?from=Dadar&to=Andheri` returns matching trains as JSON.

### 11. What is JWT?
A **JSON Web Token** is a signed string the server gives the user after login. It contains the user id and role. The app sends it in the `Authorization: Bearer <token>` header. The server checks the signature with its secret, so it knows who the user is without storing sessions. Our tokens expire after 7 days by default.

### 12. What is password hashing?
We never store the actual password. **bcrypt** turns it into a one-way hash with a random salt (cost 10). At login, bcrypt compares the typed password with the stored hash. If the database leaks, the passwords can't simply be read.

### 13. What is Socket.IO?
A library for **two-way, real-time** communication over WebSockets. The server can push data to the phone without the phone asking repeatedly. We use **rooms**: a phone joins `train:<id>` and receives updates only for that train.

### 14. How does simulated train tracking work?
The backend loads each train's ordered list of stations with coordinates. Every tick (`SIMULATION_INTERVAL_MS`, 3 s by default), each train either waits at a station or moves forward a little towards the next station. Its new latitude and longitude are calculated by interpolation, saved in MongoDB, and broadcast to the train's Socket.IO room.

### 15. How are fake GPS coordinates generated?
We did **not** use any GPS or geocoding API. Each station has approximate coordinates that we typed into `seed/data.ts`. The train's coordinates are **calculated** points on the straight line between two consecutive stations.

### 16. How does coordinate interpolation work?
If station A is at (latA, lngA), station B is at (latB, lngB), and the train has covered a fraction `t` of the way (0 = at A, 1 = at B):
```
lat = latA + (latB − latA) × t
lng = lngA + (lngB − lngA) × t
```
At t = 0.5 the train is exactly halfway. Each tick increases `t` by `distance moved ÷ segment length`.

### 17. How does the train marker move on the map?
The tracking screen joins the train's room. Every `train-position-update` event changes the marker's coordinate. To avoid jumpy movement, a small hook (`useSmoothCoord`) animates the marker from the old point to the new one over about 0.9 seconds. This is only visual; the server's position is always the true one.

### 18. How does the app calculate the next station?
The engine stores `segmentIndex`, the station the train last left. The previous station is `route[segmentIndex]` and the next one is `route[segmentIndex + 1]`. When `t` reaches 1, the train has arrived, so `segmentIndex` increases by one and `t` resets to 0. At the last station the train is "completed", and after a short rest it restarts from the origin.

### 19. How does the five-user crowd verification work?
For a given train and station:
1. Take only reports from the last 10 minutes.
2. Keep one (the latest) vote per user.
3. If there are fewer than 5 users → **Unverified** ("Insufficient reports — n/5").
4. If one colour has **more than half** of the votes → **Confirmed** with that colour.
5. Otherwise → **Mixed reports — no clear consensus.**

### 20. Why are five different users required?
One person could be wrong, joking or malicious. Requiring five independent people makes a single bad report harmless and makes the status trustworthy, while still being reachable on a busy train.

### 21. How do we prevent duplicate voting?
At three levels:
1. **Controller check:** if the user already has a vote for this train and station in the last 10 minutes, the server returns **409 Conflict**.
2. **Database unique index:** `{user, trainInstance, station, windowBucket}` must be unique, where `windowBucket = floor(time ÷ 10 minutes)`. Even two simultaneous requests cannot both be saved.
3. **Algorithm:** `computeVerdict` counts only one vote per user anyway.

The frontend does nothing special. The protection is entirely on the backend.

### 22. What happens if fewer than five reports are received?
The status is **Unverified**, with a message like "Insufficient reports — 3/5 reports received." The app shows the colour distribution faded and labelled *Provisional*, and the coach meter stays grey. We never present an unconfirmed colour as confirmed.

### 23. What happens if there is a tie?
A tie can never be a strict majority (for example 3 of 6 is exactly half, not more than half), so the result is **Mixed reports — no clear consensus.**

### 24. How are delays verified?
With the **same function and the same rules**: 5 distinct users within 10 minutes and a strict majority among the six categories (On time, 1–5, 5–10, 10+ minutes late, Not arrived, Cancelled). Community-reported delay is shown separately from the simulated ETA, so the two are never mixed up.

### 25. What is a database collection?
A group of documents of the same kind, like a table in SQL. For example, `users` holds all users and `crowdreports` holds all crowd reports.

### 26. Explain the MongoDB models.
| Model | Purpose |
|---|---|
| User | name, unique email, password hash, role (user/admin), points, notification settings |
| Station | name, code, line, latitude, longitude, sequence number |
| Train | demo number, name, line, fast/slow, up/down, ordered station list, departure time, duration |
| TrainInstance | the running copy of a train: current segment, progress, lat/lng, speed, status |
| CrowdReport | user, train instance, train, station, level, time, window bucket |
| DelayReport | same as CrowdReport, with a delay category |
| SavedRoute | user's route: name, source, destination, time, line, fast/slow preference |
| Notification | alert title and body for a user, read/unread |

They are connected with **references** (ObjectIds), for example a report points to a user, a train instance and a station.

### 27. How does authentication work?
1. Signup: validate the fields, check the email is unique, hash the password with bcrypt, save the user, return a JWT.
2. Login: find the user by email, compare with bcrypt, return a JWT (or 401 "Invalid email or password").
3. The app saves the token securely with **expo-secure-store** (iOS Keychain), and an Axios interceptor adds it to every request.
4. Protected routes use `requireAuth` middleware, which verifies the token. Admin routes also use `requireAdmin`.
5. On app start, the token is checked with `GET /api/auth/me`. Logout deletes the token and disconnects the socket.

### 28. How does real-time communication work?
The phone opens one Socket.IO connection (with its JWT). On the tracking screen it emits `join-train`; the server adds it to room `train:<id>` and sends the current position. Every tick the engine emits `train-position-update` to that room. When someone reports, the server emits `crowd-status-update` or `delay-status-update` to the same room. On leaving the screen the app emits `leave-train` and removes its listeners.

### 29. How are notifications implemented?
When a new report **changes the confirmed status** (for example from unverified to confirmed red, or from confirmed yellow to confirmed red), the server finds users whose saved routes this train serves (correct line, both stations in order, matching fast/slow preference) and whose notification settings allow it. It saves a `Notification` document and emits `route-alert` to each user's room `user:<id>`. The app receives it and shows a **local notification** with Expo Notifications. Normal individual reports never trigger alerts. We chose local notifications because remote push needs extra Apple setup and a development build; this means alerts appear while the app is running.

### 30. What are the limitations?
- Train positions and timetables are simulated. Trains loop continuously and don't follow the clock.
- Straight lines between stations instead of real track shape.
- Alerts are shown only while the app is running (no background push).
- Insights are mostly based on seeded sample data.
- One running instance per train.

### 31. What is the difference between actual GPS tracking and simulated tracking?
Actual GPS tracking would read real coordinates from a device on the train (or an official feed) and show where the train truly is. Our simulated tracking **calculates** a believable position from station coordinates and time, which is good for demonstrating the app but says nothing about real trains. That's why we label it "SIMULATED" everywhere.

### 32. How could actual railway data be integrated in the future?
Replace the `SimulationEngine` with a module that reads an official or licensed feed (or GPS from devices on board) and produces the same `PositionUpdate` objects. The Socket.IO rooms, the map screen and the database design would stay the same, because the rest of the app only depends on that update format.

### 33. What challenges were faced?
- Designing a fair verification rule (distinct users, time window, strict majority, ties).
- Preventing duplicate votes reliably, including simultaneous requests (solved with the unique index on a time bucket).
- Keeping real-time listeners clean, so that leaving the map does not leak socket listeners. We use one long-lived socket and only change its token on login/logout, so listeners are never lost.
- Making marker movement look smooth with updates every few seconds.
- Connecting a physical iPhone to a local server (`localhost` means the phone itself; we use the computer's LAN IP).
- Making the seed idempotent so running it twice creates no duplicates.

### 34. What are the future enhancements?
Real data feeds, real track shapes, remote push notifications, a reputation system for reporters, platform and coach-level crowding, offline timetable, and multi-language support (Marathi/Hindi).

### 35. How does the nearest-station feature work?
1. The app asks for **foreground location permission** with `expo-location`. It only asks while the app is open.
2. It reads the phone's latitude and longitude, using a recent cached fix if one exists.
3. It calls `GET /api/stations/nearest?lat=…&lng=…`.
4. The server calculates the **haversine distance** from that point to every station, merges stations that are on several lines (such as Dadar on Western and Central), sorts by distance and returns the closest three, with an approximate walking time (distance ÷ 4.5 km/h).
5. If even the closest station is more than 40 km away, the server sets `outOfArea`, and the app explains that LocalLoad covers Mumbai only.

The location is **not stored** in the database. It is used for this one calculation only. If permission is denied, the card shows an "Allow location" or "Open Settings" button instead.

### 36. Why is "Recent crowd updates" always filled? Who are the reporters?
The server runs **simulated commuters**: 15 demo accounts (for example *Aarav Shah*), flagged `isDemo` in the database. Every 15 seconds a small group of them "stands on the platform" of a running train, at the station the train is at **right now**, and reports the crowd.
- The level comes from the **current Mumbai time**: busy at 8–10am and 5–8pm, quiet late at night, lighter at weekends, busier at hubs such as Dadar and Kurla. Each commuter agrees with that level about 75% of the time, so mixed and unverified results happen naturally too.
- Their reports go through **the same code path as real users**, so the 10-minute window, duplicate protection and five-user verification all apply.
- Home shows **who reported** each status. Real users appear as "First L." for privacy, and demo commuters carry a **demo** tag so they're never mistaken for real people.
- They skip train 90101, which is kept clean for the live five-user demo, and their reports never send route alerts.

### 37. How do nearest-station alerts work?
1. The app finds your nearest station (see Q35) and sends only its **name** to the server with the Socket.IO event `watch-station`. The server puts the socket in room `station:<name>`.
2. The simulation engine raises an **arrival event** whenever a train reaches a station.
3. If anyone is watching that station, the server looks up the train's crowd status: the confirmed status at this station, otherwise its latest confirmed status on the run.
4. Only a **confirmed green or yellow** status triggers an alert. Red, unverified and mixed trains never do.
5. The server saves a `Notification` (type `nearby`) and emits `route-alert` to the user. The phone shows it as a local notification.
6. A **60-second cooldown** per user and station prevents spam, and the alert can be turned off in Profile ("Trains at my nearest station").

---

## How the App Works Internally

This part explains how the code is organised and how the phone, the server and the database work together. Everything here matches the actual files in the repository.

### A. Components, props and state

**Components** are the building blocks of the screens.

| Kind | Examples | Folder |
|---|---|---|
| Basic UI | `Screen`, `Card`, `Button`, `Field`, `Chips`, `Pill`, `Loading`, `ErrorState`, `Empty` | `mobile/src/components/ui.tsx` |
| Feature components | `TrainCard`, `CrowdStatusCard`, `CoachMeter`, `ReporterList`, `StationPicker`, `Dropdown`, `CalendarPicker`, `BarChart`, `NearestStationCard` | `mobile/src/components/` |
| Screens | Welcome, Login, Signup, Home, Track, Tracking (map), Report, Insights, Profile, RouteForm, Notifications, Admin | `mobile/src/screens/` |

**Props** are the inputs a parent passes to a component. The component only displays them; it doesn't fetch them.

```tsx
<TrainCard train={item} onTrack={() => nav.navigate('Tracking', { instanceId, trainId })} />
```

- `TrainCard`: `train` (data), `onTrack` (a function to call when tapped), `compact` (optional).
- `Button`: `title`, `onPress`, `variant` (primary / secondary / ghost / danger), `icon`, `loading`, `disabled`.
- `CrowdStatusCard`: `verdict`, the crowd status from the server (state, counts, distribution, reporters).
- `StationPicker` and `Dropdown`: `value` and `onChange`. This is a **controlled component**: the parent owns the value, and the child reports changes back.
- `BarChart`: `data`, `max`, `height`, `highlight`.
- **Navigation params** act as props for screens. The Tracking screen receives `{ instanceId, trainId, name }` in `route.params`.

**State** is data a component remembers. When it changes, React re-renders the screen.

1. **Local state (`useState`)** belongs to one screen. Examples: the Track screen's search text and filters (`q`, `line`, `type`, `direction`, `from`, `to`); Insights' `mode`, `day` and `date`; the Login form's fields, `error` and `busy` flags.
2. **Shared state (React Context)** is used by many screens:
   - `AuthContext`: `user`, `stats`, `loading`, `login()`, `register()`, `logout()`, `refresh()`.
   - `ThemeContext`: `mode` (system, light or dark), `colors`, `isDark`. Every component takes its colours from here, which is how dark mode applies everywhere.
   - `NearestStationContext`: the nearest station, found once and shared by the Home card and the alerts.
3. **Custom hooks** are reusable pieces of state logic:
   - `useAsync(fn)` returns `{ data, loading, error, reload }`, used for every data screen.
   - `useTrainTracking(id)` returns `{ position, crowd, delay, connected }`, kept live through Socket.IO.
   - `useSmoothCoord` animates the train marker; `useRouteAlerts` shows alerts as notifications; `useNearestStation` reads the location.
4. **`useEffect`** runs side effects (fetching data, subscribing to the socket, timers). Its *cleanup* function unsubscribes when the screen closes. **`useRef`** keeps values that shouldn't cause a re-render, such as the map object and debounce timers.

### B. How the frontend and backend are connected

```
iPhone (Expo Go)                              Laptop: Node.js on port 4000
─────────────────                             ─────────────────────────────
Axios  ──── HTTP request / JSON response ──▶  Express routes → controllers → services → Mongoose → MongoDB
Socket.IO client ◀──── live events ───────▶   Socket.IO server (rooms)
```

There are two channels:

1. **REST API (request → response)** is used for login, search, reports, routes, insights and settings.
   - `mobile/src/services/api.ts` creates one Axios client with base URL `http://<laptop-IP>:4000/api`.
   - The address comes from `EXPO_PUBLIC_API_URL`, or is detected from the Expo dev server's address.
   - An *interceptor* adds the login token to every request.
   - On the server, a request passes through: **route** (`routes/index.ts`: URL, validation, JWT check) → **controller** (reads the request, sends the response) → **service** (business logic, e.g. verification) → **Mongoose model** → **MongoDB**. The answer returns as JSON.
2. **Socket.IO (server pushes data)** is used for anything live. The phone keeps a single open WebSocket connection (`services/socket.ts`). **Rooms** ensure each phone receives only what it needs:

| Room | Who is in it | What it receives |
|---|---|---|
| `train:<instanceId>` | phones showing that train's map | `train-position-update` every tick, `crowd-status-update`, `delay-status-update` |
| `user:<userId>` | every logged-in phone of that user | `route-alert` (saved-route and nearest-station alerts) |
| `station:<name>` | users whose nearest station is `<name>` | used by the server to find who gets arrival alerts |
| `feed` | phones showing the Home screen | `feed-update`, a ping to re-fetch the live crowd feed |

### C. How the database is connected

- **The phone never connects to MongoDB.** Only the server does. If the app contained database credentials, anyone could extract them and read or delete all the data.
- MongoDB runs in Docker (`localload-mongo`, port 27017). When the server starts, `server/src/config/db.ts` runs `mongoose.connect(MONGODB_URI)` and then `syncIndexes()`. The unique indexes, including the one that blocks duplicate votes, therefore exist before any request arrives.
- The **Mongoose models** in `server/src/models/` define the 8 collections, the type of each field, the references between documents (a report points to a user, a train instance, a train and a station) and the indexes.
- The simulation engine writes train positions to the `traininstances` collection on every tick. When the server restarts, it reloads them, so trains continue from where they were.

### D. JWT: how the token is generated and used

1. **Register / login:** the server looks up the user by email and checks the password with `bcrypt.compare`. Passwords are stored only as bcrypt hashes.
2. **Generation** (`server/src/middleware/auth.ts`):
   ```ts
   jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
   ```
   The token has three base64url parts, `header.payload.signature`:
   - **header:** the algorithm, HS256;
   - **payload:** `{ id, role, iat, exp }` (issued-at and expiry times);
   - **signature:** an HMAC-SHA256 of the header and payload, made with `JWT_SECRET`. Without the secret, nobody can create a valid token or change one (for example, turn `role` into `admin`).
3. **Storage:** the app saves the token in the iPhone Keychain (`expo-secure-store`).
4. **Use:** the Axios interceptor sends `Authorization: Bearer <token>`. The `requireAuth` middleware calls `jwt.verify()`.
   - If the token is valid, it sets `req.user = { id, role }`. If not, the response is **401**.
   - Admin routes also check `role === 'admin'`, otherwise **403**.
5. **Socket:** the token is sent when the socket connects, so the server can put the phone in its `user:<id>` room.
6. **App launch:** the app calls `GET /api/auth/me`. If the token has expired, it's deleted and the login screen appears.
7. **Points to mention:** JWT is *stateless* (no sessions are stored on the server). The payload is only encoded, not encrypted, so it holds no secrets. Logout deletes the token on the phone, but a copied token would stay valid until it expires (a known limitation).

### E. Step-by-step flows between frontend and backend

**1. Opening the app and logging in**
1. `AuthContext` reads the token from secure storage.
2. If there is a token: `GET /api/auth/me` → the server verifies the JWT → returns the user → the app shows the tabs and connects the socket with the token.
3. If there is no token, or it is invalid: the Welcome screen is shown → Login → `POST /api/auth/login` → the server checks bcrypt and signs a JWT → the app stores it and shows the tabs.

**2. Searching and opening a train**
1. Track screen: `GET /api/stations` fills the station pickers.
2. Typing or choosing filters → `GET /api/trains/search?from=Dadar&to=Andheri&type=fast` → the server filters the timetable from MongoDB, calculates the scheduled times, attaches each train's crowd and delay status, and returns the trains.
3. Tapping **Track Train** opens the Tracking screen with `{ instanceId, trainId }`.

**3. Live train movement (server → phone)**
1. On the server, `SimulationEngine.tick()` runs every 3 s. Each train moves along its segment; its latitude and longitude are interpolated between two stations.
2. The engine saves the positions to MongoDB and emits `train-position-update` to room `train:<id>`.
3. The phone's `useTrainTracking` hook receives the event and updates its `position` state → React re-renders → `useSmoothCoord` glides the marker to the new point.

**4. Reporting crowd → verification → everyone updates**
1. Report screen: `POST /api/reports/crowd { trainInstanceId, stationId, level }` with the JWT.
2. The server checks that the station is on the route and that the user hasn't voted there in the last 10 minutes (otherwise **409**), then saves the report (the unique index blocks races).
3. It recomputes the verdict (*unverified* below 5 users, *confirmed* with a strict majority, *mixed* otherwise) and returns it to the reporter.
4. It emits `crowd-status-update` to `train:<id>` (open maps update), and `feed-update` to `feed` (Home refreshes its feed).
5. If the **confirmed** value changed, it finds users whose saved routes this train serves, saves a `Notification` and emits `route-alert` to `user:<id>`. The phone shows a local notification.

**5. Nearest station and arrival alerts**
1. The phone reads its location (with permission) → `GET /api/stations/nearest?lat=…&lng=…` → the server calculates haversine distances and returns the closest stations.
2. The phone emits `watch-station "Dadar"` (only the name, never the coordinates) and joins `station:Dadar`.
3. When a simulated train arrives at Dadar with a confirmed green or yellow status, the server emits `route-alert` (type `nearby`) to the watching users, at most once a minute.

**6. Insights for a weekday or date**
1. Insights opens with today's weekday → `GET /api/insights/overview?day=3`. Picking a date in the calendar → `?date=2026-11-16`.
2. The server adds a `$match` on the weekday or date (India time) to its aggregation pipelines and returns the hourly, morning/evening, station and train statistics.
3. `GET /api/insights/dates` tells the calendar which days have data, so it can show the dots.

### F. Screen-to-backend mapping

| Screen | REST calls | Socket events |
|---|---|---|
| Login / Signup | `POST /auth/login`, `POST /auth/register`; on start `GET /auth/me` | socket (re)connects with the token |
| Home | `GET /routes`, `GET /tracking/active`, `GET /trains`, `GET /crowd/recent`, `GET /stations/nearest` | `join-feed` → `feed-update`; `watch-station`; `route-alert` (on every screen) |
| Track (search) | `GET /stations`, `GET /trains/search` | — |
| Tracking (map) | `GET /tracking/:instanceId`, `GET /trains/:id/status` | `join-train` / `leave-train` → `train-position-update`, `crowd-status-update`, `delay-status-update` |
| Report | `GET /tracking/active`, `GET /trains/:id`, `POST /reports/crowd` or `/reports/delay`, `GET /auth/me` | (the server broadcasts the result to others) |
| Insights | `GET /insights/overview?day=…` or `?date=…`, `GET /insights/weekly`, `GET /insights/dates`, `GET /insights/station/:id` | — |
| Profile | `GET /routes`, `GET /auth/me`, `PUT /notifications/settings`, `DELETE /routes/:id` | — |
| Route form | `GET /stations`, `POST /routes`, `PUT /routes/:id`, `DELETE /routes/:id` | — |
| Notifications | `GET /notifications`, `PUT /notifications/read` | — |
| Admin | `GET /admin/simulation/status`, `/admin/verification`, `/admin/reports`, `/admin/users`; `POST /admin/simulation/start` / `stop` / `reset` / `speed` | — |

### G. The tracking map: what each element shows and where it comes from

The map is `MapView` from `react-native-maps` (Apple Maps on iOS) in `mobile/src/screens/TrackingScreen.tsx`.

| What you see on the map | Data source | How it is drawn |
|---|---|---|
| **Coloured route line** | `route` (ordered station list with lat/lng) from `GET /tracking/:instanceId` | `<Polyline>` through all station coordinates; colour from `LINE_COLORS` (Western purple, Central teal, Harbour pink) |
| **Station dots** | the same `route` list | one `<Marker>` per station; **filled** = already passed, **white** = still ahead; tapping shows the name and code |
| **Moving train marker** | `position.lat/lng`: first from REST, then every `train-position-update` | `<Marker>` with a train icon in the line colour; `useSmoothCoord` animates it between updates; it jumps instead of sliding when a train restarts its loop |
| **Your blue dot** | the phone's own GPS (only if location was already allowed) | `showsUserLocation`; your position never leaves the phone |
| **Initial view** | the train's position, then all stations | `initialRegion` centred on the train, then `fitToCoordinates` zooms to show the whole route |
| **Locate button** | the current train position | `animateToRegion` zooms to the train |
| **Dark map** | `isDark` from `ThemeContext` | `userInterfaceStyle="dark"` |
| **Top card** | `position`: name, number, line, type, direction; `delay.summary` | train details, the **SIMULATED LIVE TRACKING** badge, a green "live" dot when the socket is connected, the delay pill |
| **Bottom panel** | `position`: previous/next station, `etaMinutes`, `speedKmph`, `distanceToNextKm`, `lastUpdated`, `journeyProgress` | "Between X and Y" / "Halted at X", a progress strip, stat boxes, simulated coordinates |
| **Crowd card** | `crowd.summary` from REST, then `crowd-status-update` | the verified status, distribution and who reported it |

How a number on the screen is produced, for example the **ETA**: on each tick the server calculates `remaining km = segment length × (1 − progress)` and `ETA = remaining km ÷ (75% of cruise speed)`. It sends this in `train-position-update`, the hook stores it in `position`, and the bottom panel displays `~N min`.

The diagrams in the project report (architecture, use case, ER, sequence and verification flow) are generated from the Mermaid files in `docs/report/diagrams/` and show the same structure.

### H. Difficulties faced and how they were solved

| Problem | Cause | Solution |
|---|---|---|
| Phone couldn't reach the server | On the phone, `localhost` means the phone itself | Use the laptop's LAN IP, detected automatically from Expo's address |
| Duplicate votes from simultaneous requests | The application check alone allows a race | Unique MongoDB index on `{user, trainInstance, station, windowBucket}` |
| Train marker jumped every 3 seconds | Positions arrive in steps | `useSmoothCoord` animation; jumps (not slides) when a train restarts its loop |
| Missed alerts after login | Login replaced the socket, so earlier listeners were lost | One long-lived socket; only its token changes |
| Listeners leaking after leaving the map | The subscription was never closed | `useEffect` cleanup: `leave-train` and `socket.off(...)` |
| Expo API changes | SDK 58 renamed notification options (`shouldShowBanner`) | Read the versioned Expo documentation before coding |
| MongoDB wouldn't start for tests | The disk was almost full (MongoDB needs 500 MB free) | Freed space; tests use an in-memory database |
| `ENOSPC: file watchers` | Linux limits how many files can be watched | Raised `fs.inotify.max_user_watches`; added `npm run serve` without watching |
| `Port 4000 already in use` | An old server was still running | Clear error message with the command to stop it |
| Wrong day or hour in Insights | MongoDB stores times in UTC | All grouping is done in the `Asia/Kolkata` time zone |
| Empty live feed during demos | No real commuters | Simulated commuters, labelled "demo", that skip the demo train 90101 |
| Old pandoc for the report | Ubuntu's pandoc 2.9 lacks features | A numbering filter and XML fixes in the build script |

---

## Explain the Train Tracking Algorithm

1. **Load:** for every train instance, get the ordered halts with their latitude and longitude. Pre-compute each segment's length with the **haversine formula** (distance on the Earth's surface).
2. **Every tick** (default 3 seconds), for each train:
   - **If waiting at a station:** decrease the wait counter (2 ticks normally). When it reaches 0, start running.
   - **If running:**
     - speed = cruise × (0.35 + 0.65 × sin(π × progress)), which is slow near stations and fastest mid-way. Cruise is 65 km/h for fast trains and 48 km/h for slow ones.
     - distance moved = speed × (tick time in hours) × speed multiplier (×10 by default, so the demo is quicker).
     - progress += distance moved ÷ segment length.
     - position = interpolate(stationA, stationB, progress).
     - If progress ≥ 1: arrive. The next station becomes the current one, wait 2 ticks, and move on to the next segment.
   - **If at the final station:** rest 8 ticks, then restart from the origin.
3. **Compute details:** next station, remaining km = segment length × (1 − progress), ETA = remaining km ÷ (75% of cruise) in simulated minutes, and journey progress in %.
4. **Broadcast** the update to room `train:<instanceId>` and **save** it in MongoDB.

Example: Dadar → Matunga Road is about 1.1 km. With progress 0.5, the train is about 0.55 km from Matunga Road, at the midpoint of the two coordinates.

---

## Explain the Five-User Verification Algorithm

**Rule:** at least **5 distinct users** in the last **10 minutes**, and one colour with **more than 50%** of their votes.

| # | Votes (distinct users) | Count | Strict majority? | Result |
|---|---|---|---|---|
| 1 | Green 1, Yellow 1, Red 3 | 5 | Red 3/5 = 60% ✔ | **Confirmed RED** |
| 2 | Green 1, Yellow 1, Red 2 | 4 | — (below 5) | **Unverified – 4/5 reports received** |
| 3 | Green 3, Yellow 3 | 6 | 3/6 = 50% ✘ | **Mixed reports** |
| 4 | Same user votes red 5 times | 1 | — | Counts as **one** vote → Unverified 1/5 (extra submissions are rejected with 409) |
| 5 | 5 red votes 11 min ago + 2 green now | 2 | — | Old votes **expired** → Unverified 2/5 |
| 6 | Green 2, Yellow 2, Red 1 | 5 | best is 2/5 = 40% ✘ | **Mixed reports** |

All six cases are automated tests in `server/src/tests/verification.test.ts`, and the API tests repeat the main ones through real HTTP requests.

---

## Important Technical Terms

| Term | Simple meaning |
|---|---|
| **React Native** | Framework for building native mobile apps with JavaScript/TypeScript and React components |
| **Expo** | Toolset around React Native that makes it easy to run the app (Expo Go), use device features and build it |
| **Node.js** | Runs JavaScript on the server, outside the browser |
| **Express.js** | Small Node.js framework for building web servers and REST APIs with routes and middleware |
| **MongoDB** | NoSQL database that stores JSON-like documents in collections |
| **Mongoose** | Library that adds schemas, validation and easy queries on top of MongoDB |
| **REST API** | Set of HTTP URLs (GET/POST/PUT/DELETE) that the app uses to read and change data |
| **JWT** | Signed token that proves who the user is on every request |
| **bcrypt** | Slow, salted hashing algorithm for storing passwords safely |
| **Socket.IO** | Library for real-time, two-way messages between server and app (built on WebSockets) |
| **GPS coordinates** | A position on Earth given as latitude and longitude |
| **Latitude** | How far north or south of the equator (Mumbai ≈ 19° N) |
| **Longitude** | How far east or west of Greenwich (Mumbai ≈ 72.8° E) |
| **Coordinate interpolation** | Calculating a point between two coordinates from a fraction 0–1 |
| **WebSocket** | A connection that stays open so both sides can send messages at any time |
| **Authentication** | Checking *who* you are (login) |
| **Authorization** | Checking *what you are allowed to do* (for example, only admins can stop the simulation) |
| **CRUD** | Create, Read, Update, Delete, the four basic data operations (as used for saved routes) |
| **JSON** | Text format for data, such as `{ "name": "Dadar", "lat": 19.01 }`, used by our API |

---

## Quick viva questions (rapid fire)

1. **Which port does the backend use?** 4000 by default (`PORT`).
2. **Where is the token stored on the phone?** In the iOS Keychain through expo-secure-store (key `localload.token`). AsyncStorage only stores the theme choice.
3. **What status code is returned for a duplicate vote?** 409 Conflict.
4. **What status code for a wrong password?** 401 Unauthorized.
5. **What happens if a normal user calls `/api/admin/simulation/stop`?** They get 403 Forbidden.
6. **How many stations and trains are seeded?** 69 station records on 3 lines and 13 trains.
7. **What does "up" direction mean?** Towards Churchgate/CSMT (the city); "down" means away from it.
8. **How are fast trains different in the data?** They only include major halts, such as Dadar, Bandra, Andheri and Borivali.
9. **Can the seed be run twice safely?** Yes. It upserts by unique keys and regenerates only the sample reports.
10. **Is the simulation speed configurable?** Yes, with `SIMULATION_INTERVAL_MS`, `SIMULATION_SPEED_MULTIPLIER` and the admin speed endpoint.
11. **What does the coach meter show?** Three coaches filled green, yellow or red, but only for a **confirmed** level. Otherwise they stay grey.
12. **How does the app find the server on an iPhone?** From `EXPO_PUBLIC_API_URL`, or else from the Expo dev server's IP with port 4000.
13. **What happens to socket listeners when leaving the map?** The app emits `leave-train` and removes every listener in the hook's cleanup function.
14. **How are Insights calculated?** With MongoDB aggregation pipelines, scoring green = 1, yellow = 2, red = 3 and averaging by hour, weekday, station and train, in the India time zone.
14a. **How does the weekday / date filter work?** The app sends `?day=3` (Wednesday) or `?date=2026-11-16`. For a weekday, the pipeline adds a `$match` on `$isoDayOfWeek` of the report time (Asia/Kolkata). For a date, it matches reports between midnight and midnight IST of that day. The calendar asks `/api/insights/dates` which days have data and marks them with a dot.
15. **Do Insights use machine learning?** No. They are simple averages of stored reports.
16. **How do you get contribution points?** +1 for every accepted report.
17. **What is the reporting window?** 10 minutes (`REPORT_WINDOW_MINUTES`).
18. **How is the theme chosen?** System, Light or Dark from Profile, remembered in AsyncStorage.
19. **How did you test the project?** With 17 automated tests (Node test runner + supertest + in-memory MongoDB + a Socket.IO client) plus the `demo:votes` script.
20. **Why use an in-memory MongoDB for tests?** The tests don't touch the real database, and each run starts clean.
21. **Why is the server the source of truth for positions?** So every user sees the same train position and nobody can fake it from the client.
22. **What is middleware?** A function that runs before the route handler, such as checking the JWT.
23. **What is `express-validator` used for?** Checking request fields (valid email, password length, valid ids, allowed crowd levels) and returning 400 errors.
24. **Why does each station on two lines have two records?** The sequence and coordinates differ per line; search matches by station name, so "Dadar" still works across lines.
25. **What is haversine?** A formula for the distance between two latitude/longitude points on a sphere.
