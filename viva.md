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

### 35. How does the nearest-station feature work?
1. The app asks for **foreground location permission** with `expo-location`. It only asks while the app is open.
2. It reads the phone's latitude and longitude, using a recent cached fix if one exists.
3. It calls `GET /api/stations/nearest?lat=…&lng=…`.
4. The server calculates the **haversine distance** from that point to every station, merges stations that are on several lines (such as Dadar on Western and Central), sorts by distance and returns the closest three, with an approximate walking time (distance ÷ 4.5 km/h).
5. If even the closest station is more than 40 km away, the server sets `outOfArea`, and the app explains that LocalLoad covers Mumbai only.

The location is **not stored** in the database. It is used for this one calculation only. If permission is denied, the card shows an "Allow location" or "Open Settings" button instead.

### 37. How do nearest-station alerts work?
1. The app finds your nearest station (see Q35) and sends only its **name** to the server with the Socket.IO event `watch-station`. The server puts the socket in room `station:<name>`.
2. The simulation engine raises an **arrival event** whenever a train reaches a station.
3. If anyone is watching that station, the server looks up the train's crowd status: the confirmed status at this station, otherwise its latest confirmed status on the run.
4. Only a **confirmed green or yellow** status triggers an alert. Red, unverified and mixed trains never do.
5. The server saves a `Notification` (type `nearby`) and emits `route-alert` to the user. The phone shows it as a local notification.
6. A **60-second cooldown** per user and station prevents spam, and the alert can be turned off in Profile ("Trains at my nearest station").

### 36. Why is "Recent crowd updates" always filled? Who are the reporters?
The server runs **simulated commuters**: 15 demo accounts (for example *Aarav Shah*), flagged `isDemo` in the database. Every 15 seconds a small group of them "stands on the platform" of a running train, at the station the train is at **right now**, and reports the crowd.
- The level comes from the **current Mumbai time**: busy at 8–10am and 5–8pm, quiet late at night, lighter at weekends, busier at hubs such as Dadar and Kurla. Each commuter agrees with that level about 75% of the time, so mixed and unverified results happen naturally too.
- Their reports go through **the same code path as real users**, so the 10-minute window, duplicate protection and five-user verification all apply.
- Home shows **who reported** each status. Real users appear as "First L." for privacy, and demo commuters carry a **demo** tag so they're never mistaken for real people.
- They skip train 90101, which is kept clean for the live five-user demo, and their reports never send route alerts.

### 34. What are the future enhancements?
Real data feeds, real track shapes, remote push notifications, a reputation system for reporters, platform and coach-level crowding, offline timetable, and multi-language support (Marathi/Hindi).

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
