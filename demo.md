# LocalLoad – Live Demo Guide

A step-by-step script for presenting LocalLoad: what to run, what to tap, and what to say. The full demo takes about **15 minutes**; a 7-minute short version is at the end.

> Say this once at the start and point to the badges whenever they appear: **"All train positions and timetables are simulated for demonstration. We do not use real railway GPS data."**

---

## 1. What you need

| Item | Notes |
|---|---|
| Laptop | Node.js 20+, Docker (or a local MongoDB), this repository |
| iPhone | **Expo Go** installed from the App Store |
| Same Wi-Fi | The phone and laptop must be on the same network. College Wi-Fi often blocks device-to-device traffic, so a **phone hotspot** with the laptop connected to it is the safest option. |
| Projector | Mirror the iPhone (QuickTime on a Mac, or any screen-mirroring app) and keep one laptop terminal visible |

---

## 2. One-time setup (do this the day before)

> **Every command block in this guide starts from the project root**, the `Local-Load/` folder that contains `server/` and `mobile/`. Open a terminal there first, e.g. `cd ~/fun/Local-Load`. Running `cd server` from inside `mobile/` fails with *"No such file or directory"*.

```bash
# 1. MongoDB in Docker
docker run -d --name localload-mongo -p 27017:27017 mongo:7

# 2. Backend
cd server
npm install
cp .env.example .env          # set JWT_SECRET to any long random string
npm run seed                  # stations, trains, demo users, sample history

# 3. Mobile app
cd ../mobile
npm install
cd ..                         # back to the project root
```

Check that the backend tests pass:

```bash
cd server                     # from the project root (Local-Load/)
npm test                      # expect: tests 17, pass 17, fail 0
cd ..
```

---

## 3. On demo day: start everything (about 5 minutes before)

Open **four terminal tabs**, each starting in the project root (`cd ~/fun/Local-Load`).

**Terminal 1 – database**
```bash
docker start localload-mongo
```

**Terminal 2 – backend**
```bash
cd server
npm run serve
# expect: [server] LocalLoad API on http://0.0.0.0:4000  (13 simulated trains, running=true, simulated commuters=true)
```

**Terminal 3 – mobile app**
```bash
cd mobile
npx expo start
```
Scan the QR code with the iPhone camera. It opens in Expo Go.

**Terminal 4 – demo commands.** Keep this tab visible on the projector; you'll use it during the demo.
```bash
cd server
```

### Pre-demo checklist

1. **Find the laptop's IP:** run `hostname -I | awk '{print $1}'` on Linux (or `ipconfig getifaddr en0` on a Mac).
2. **Check the phone can reach the server:** in Safari on the iPhone, open `http://<laptop-IP>:4000/health`. You should see `{"ok":true,...}`.
   - If it doesn't load, check the firewall: `sudo ufw allow 4000/tcp` and `sudo ufw allow 8081/tcp`.
   - If the app still can't connect, create `mobile/.env` with `EXPO_PUBLIC_API_URL=http://<laptop-IP>:4000` and restart `npx expo start`.
3. **Reset the live reports** so the counts start at 0/5. Run this again after every rehearsal, because each user can vote only once per train and station every 10 minutes:
   ```bash
   docker exec localload-mongo mongosh localload --quiet --eval 'db.crowdreports.deleteMany({isSample:false}); db.delayreports.deleteMany({isSample:false}); db.notifications.deleteMany({})'
   ```
   This removes only real (non-sample) reports. The Insights sample data stays.
4. **Remove your rehearsal account** if you want to sign up fresh during the demo. Use the same email again later, or delete it:
   ```bash
   docker exec localload-mongo mongosh localload --quiet --eval 'db.users.deleteOne({email:"presenter@demo.dev"})'
   ```
5. **Allow notifications and location** in Expo Go. iOS asks for both the first time you log in; tap **Allow** for each.
6. **Set brightness and volume, and turn on Do Not Disturb** for everything except Expo Go.

### Accounts used in the demo

| Account | Password | Used for |
|---|---|---|
| `presenter@demo.dev` (you create it live) | anything with 6+ characters | the main walkthrough |
| `admin@localload.dev` | `SEED_DEMO_PASSWORD` from `server/.env` | the Admin screen |
| `rider1` … `rider8@localload.dev` | same | used automatically by `npm run demo:votes` |

---

## 4. The demo, scene by scene

### Scene 1 – Welcome, signup and validation (1.5 min)

1. Open the app. Point out the **Welcome screen**: the name, the tagline *"Know your train. Beat the rush."*, the animated train and the simulated-data notice.
2. Tap **Create account**.
3. **Show validation:** type a short name, an invalid email, a 3-character password and a different confirm password, then tap **Sign up**. Red error messages appear under each field.
4. **Show the duplicate-email check:** fill in valid fields with email `rider1@localload.dev`. The server replies *"An account with this email already exists"*.
5. Now sign up properly: name **Presenter Demo**, email **presenter@demo.dev**, password **demo123**.
6. Tap **Allow** on the notification prompt and on the location prompt.

> *Say:* "Passwords are hashed with bcrypt on the server. After login the server returns a JWT, which the app stores in the iPhone Keychain."

### Scene 2 – Home dashboard (1 min)

On the Home tab, point out:
- the greeting with your first name and today's date,
- the **search bar** and the **Track a Train** button,
- **"Add your daily route to get started."** (there are no routes yet),
- **Running now**: horizontal cards for every simulated train, with a progress bar and the **SIMULATED POSITIONS** badge,
- the **Nearest station to you** card: it uses the phone's location (tap **Allow** when asked) to show the closest station, its lines, the distance and walking time. Tap **Trains from <station>** to open Track with that station already filled in as *From*. (If you present outside Mumbai, the card says so and still shows the closest Mumbai station.)
- the **Report** quick button,
- **Recent crowd updates**, which **fills live**: simulated demo commuters report every ~15 seconds for trains at their current station. Each card shows the status (verified, unverified n/5 or mixed), how long ago it was reported, and **who reported it** (chips coloured by each person's vote, labelled *demo*). Point out that the levels match the **current time of day**: busy in the rush hour, quiet at night.

> *Say:* "These demo commuters use the same report API and the same five-user rule as real users. We added them so the feed is realistic during a demo. They are always labelled *demo*."

### Scene 3 – Save a daily route (1 min)

1. Tap the dashed **Add your daily route** card.
2. Fill in: Route name **Office**, line **Western**, From **Dadar**, To **Borivali**, time **08:30**, preference **Any**. Tap **Save route**.
3. Back on Home, the route card now shows the **next matching demo trains** with crowd and delay pills (currently "NOT ENOUGH REPORTS" and "NO DELAY DATA").

> *Say:* "Train 90101, the Churchgate–Virar Fast, stops at both Dadar and Borivali, so it matches this route. We'll use it to trigger an alert later."

### Scene 4 – Train search and the simulated timetable (1.5 min)

1. Open the **Track** tab and point to the **SIMULATED TRAIN TIMETABLE** badge.
2. Type **90101** in the search box to filter by number, then clear it.
3. Tap **From → Dadar** and **To → Andheri**. Only **down** trains appear, showing the boarding time at Dadar and the arrival at Andheri.
4. Tap the **swap** icon (⇄). Now the **up** trains appear.
5. Try the filters: **Fast**, the **Western / Central / Harbour** chips (each line has its own colour) and **Up / Down**.
6. Show an empty state: From **Andheri**, To **Thane**. They're on different lines, so the app shows *"No trains match these filters"*.
7. Clear the filters.

> *Say:* "Each card shows the scheduled time, fast or slow, and a crowd and delay status. When there aren't enough reports we say 'Not enough reports' instead of inventing a status."

### Scene 5 – Simulated live tracking ⭐ (2 min)

1. Search **90101** and tap **Track Train**.
2. Walk through the screen:
   - **Top card:** train name, number, line, Fast, Down ↓, and the **SIMULATED LIVE TRACKING** badge. The **green dot** means the live Socket.IO connection is up.
   - **Map:** the route **polyline** in the line colour, **station dots** (filled = already passed) and the **train marker** moving smoothly.
   - **Bottom panel:** "Between X and Y" (or "Halted at X"), a progress strip, **Next station, ETA, Speed, Distance, Updated** (the time changes every few seconds), and the **simulated coordinates** with % of journey.
3. Pinch to zoom, then tap the **locate** button to recentre on the train.
4. Point at the line *"Train positions are simulated for demonstration purposes."*

> *Say:* "The phone does not calculate the position. Every 3 seconds the **server** moves the train a little along the straight line between two stations. This is **linear interpolation**: latitude = latA + (latB − latA) × progress. The new position is pushed to this screen over Socket.IO, only to phones that joined this train's room. When I leave this screen, the app leaves the room and removes its listeners."

### Scene 6 – Five-user crowd verification ⭐⭐ (3 min)

This is the most important scene. Have the projector show **both the phone and Terminal 4**.

> Train **90101** is reserved for this scene: the simulated commuters never report on it, so it always starts at 0/5 after the reset.

**Step A – three other commuters report.** In Terminal 4:
```bash
npm run demo:votes -- 90101 Dadar red,yellow,red
```
Expected output:
```
rider1 -> red      [201] UNVERIFIED  | Insufficient reports — 1/5 reports received.
rider2 -> yellow   [201] UNVERIFIED  | Insufficient reports — 2/5 reports received.
rider3 -> red      [201] UNVERIFIED  | Insufficient reports — 3/5 reports received.
```
> *Say:* "This script logs in as three seeded demo riders through the **real API**, exactly as three phones would."

**Step B – you report from the phone (4th vote).**
1. On the tracking screen of 90101, tap **Report crowd or delay**. Train 90101 is preselected.
2. Choose station **Dadar**, mode **Crowd level**, and tap **RED · High crowd**.
3. Tap **Submit report**. The result card shows **Unverified**: *"Insufficient reports — 4/5 reports received"*, with a faded, **provisional** distribution and grey coaches.

> *Say:* "Even though most votes say red, we don't show red as confirmed. We need five different people."

**Step C – the fifth commuter confirms it.** In Terminal 4:
```bash
FIRST_RIDER=4 npm run demo:votes -- 90101 Dadar red
```
(On Windows PowerShell: `$env:FIRST_RIDER=4; npm run demo:votes -- 90101 Dadar red`)

Expected: `rider4 -> red [201] CONFIRMED red | Confirmed by 4 of 5 reports.`

Now show the result in the app:
- A **notification banner** appears on the phone: *"Crowd update: Churchgate – Virar Fast. High crowd confirmed by commuters at Dadar."* This is because your saved Dadar → Borivali route is served by this train.
- Go to **Track → 90101 → Track Train** again. The crowd card now says **High crowd · Verified by commuters**, the coaches are filled red, and it shows 5 reports. You can also see it on **Home → Recent crowd updates**.

> *Say:* "Confirmation needs **five distinct users within 10 minutes** and a **strict majority**. Here red has 4 of 5. The notification was sent only because the confirmed status **changed**, not for each individual report."

### Scene 7 – Duplicate vote prevention (1 min)

1. On the phone, go to **Report**, choose train **90101**, station **Dadar**, and tap **GREEN**. Submit.
2. A red message appears: *"You already reported for this train at this station. You can report again in 10 min."*
3. Optionally show the same thing from the terminal:
   ```bash
   FIRST_RIDER=4 npm run demo:votes -- 90101 Dadar green
   ```
   → `[409] You already reported for this train at this station...`

> *Say:* "This is enforced on the **backend**. The controller checks for an existing vote, and MongoDB has a **unique index** on (user, train instance, station, 10-minute window), so even two requests at the same instant cannot both be saved."

### Scene 8 – Mixed reports (1 min)

```bash
npm run demo:votes -- 90101 Borivali green,green,yellow,yellow,red,red
```
Expected: after rider5 it says **MIXED** (2 green, 2 yellow, 1 red: five users but no majority), and it stays **MIXED** at 6 reports (a 2–2–2 tie).

Reopen the 90101 tracking screen. The crowd card shows **No clear consensus / Mixed reports**, and Borivali is now the most recently updated station.

> *Say:* "A tie, or anything without a value above 50%, is never shown as a colour."

### Scene 9 – Delay reporting (1 min)

1. Optionally, report a delay from the phone first: **Report → 90101 → station Bandra → Delay → 5–10 min late → Submit**. It shows *Unverified 1/5*.
2. In Terminal 4, add the other commuters. If you did step 1, use `FIRST_RIDER=2` and four values; otherwise:
   ```bash
   npm run demo:votes -- 90101 Bandra 5-10,5-10,5-10,on-time,10-plus delay
   ```
   Expected: `rider5 -> 10-plus [201] CONFIRMED 5-10`.
3. Show the results:
   - another **notification banner** (a delay on your saved route),
   - **Home → Delay alerts**: "90101 · 5–10 min late, confirmed by 5 commuters at Bandra",
   - the **tracking screen**: a red **5–10 MIN LATE** pill in the top card.

> *Say:* "Delays use the same five-user rule. The community-reported delay is kept separate from the simulated ETA, so the two are never confused."

### Scene 9b – Nearest-station alerts (1 min)

1. On Home, the **Nearest station** card ends with: *"You'll get an alert when a train with a verified green or yellow crowd reaches <station>."*
2. Keep the app open for a minute or two. As simulated trains pull into that station with a verified low or moderate crowd, banners like this appear:
   *"🚆 95203 has reached Dadar — Low crowd – verified by 15 commuters at Matunga. Kalyan – CSMT Slow, next: Parel."*
3. To show it working instantly, go to Profile → **Send test notification**.

> *Say:* "The phone sends only the *name* of the nearest station, never its coordinates. The server alerts us only when a train arrives **and** its crowd is verified green or yellow by five or more commuters. Crowded trains never trigger it, and there's a one-minute cooldown so it doesn't spam."

### Scene 10 – Notifications screen (30 s)

On **Home**, tap the **bell** icon. The crowd and delay alerts appear, stored in MongoDB. Pull down to refresh.

### Scene 11 – Insights (1.5 min)

1. Open the **Insights** tab and point to the **SAMPLE HISTORICAL DATA** badge. It opens on **today's weekday** (e.g. "Showing every Wednesday").
   - Tap the **Weekday** dropdown and pick **Monday**, then **Saturday**: Saturday is noticeably quieter, and the highlighted bar in the weekly chart moves.
   - Switch to **By date** and tap the date field to open the **calendar**. Days with stored reports have a dot (green = quiet, yellow = moderate, red = busy). Pick a day and the whole screen updates for that date. Tap **Today** to see today's live reports, or pick a date without a dot to show the empty state.
2. Show **Best time to travel** (green) and **Most crowded slots** (red).
3. Show the **Crowd by hour** bar chart, with peaks in the morning and evening rush.
4. Show **Morning vs Evening**, with the distribution bars and percentages.
5. Show the **Weekly trend**, where weekends are lower.
6. Tap a station under **Most crowded stations** to expand its hourly chart.
7. Show **Most crowded demo trains**.

> *Say:* "These are MongoDB aggregation pipelines over stored reports: green counts 1, yellow 2, red 3, averaged by hour, day, station and train. The history is seeded sample data and is labelled that way. No machine learning is involved."

### Scene 12 – Profile, theme and settings (1 min)

1. Open the **Profile** tab and show the name, email, and the **Reports / Crowd / Points** counters (points went up with each report you made).
2. **Saved routes:** tap ✏️ to edit, change the time to **09:00** and save. Mention the 🗑 delete button.
3. **Appearance:** tap **☾ Dark**. The whole app switches, including the **map**. Tap **☀︎ Light**, then **System**.
4. **Notifications:** show the toggles for route alerts, crowd changes and delays (saved to the server).

### Scene 13 – Admin and simulation controls (1.5 min)

1. Tap **Log out**. You're back on the Welcome screen.
2. Log in as **admin@localload.dev**, using the password from `server/.env`.
3. Go to **Profile → Admin · simulation controls**.
4. **Simulation** tab:
   - Tap **Stop**. Open any train's tracking screen and the marker stops moving. Go back and tap **Start**.
   - Tap **×40** under speed multiplier so trains visibly speed up, then set it back to **×10**.
   - Tap **Reset all trains to origin**. Every train restarts from its first station, with staggered departures.
5. **Verification** tab: the live counts per train and station from the previous scenes (Dadar confirmed red, Borivali mixed, Bandra delay 5–10).
6. **Reports** tab: the actual reports with user, station and time.
7. **Users** tab: all accounts with their points.

> *Say:* "Only admin accounts see this. A normal user calling these APIs gets 403 Forbidden."

Optional proof in Terminal 4:
```bash
curl -s -X POST localhost:4000/api/admin/simulation/stop
# → {"error":"Please log in to continue"}  (401 without a token; a normal user's token gets 403)
```

### Scene 14 – Data persists after logout (30 s)

1. Log out and log back in as **presenter@demo.dev** / **demo123**.
2. Home still shows the **Office** route, and Profile still shows your points.

> *Say:* "Everything is stored in MongoDB against the user, not on the phone."

---

## 5. Optional: show the backend (for technical questions)

```bash
# Run these from server/ (the same folder as Terminal 4)

# Automated tests: 6 verification cases + API, auth, socket and route tests
npm test

# The unique index that blocks duplicate votes
docker exec localload-mongo mongosh localload --quiet --eval 'db.crowdreports.getIndexes().forEach(i => print(JSON.stringify(i.key), i.unique ? "UNIQUE" : ""))'

# Live simulated positions straight from the API
curl -s localhost:4000/api/tracking/active | head -c 600

# The reports you just made
docker exec localload-mongo mongosh localload --quiet --eval 'db.crowdreports.find({isSample:false},{level:1,reportedAt:1,_id:0}).toArray()'
```

Code to open if asked:

| Question | File |
|---|---|
| "Show the verification algorithm" | `server/src/services/verification.ts` |
| "Show the train movement" | `server/src/simulation/engine.ts` (`step()`) and `server/src/utils/geo.ts` (`interpolate`) |
| "How does the phone get updates?" | `mobile/src/hooks/useTrainTracking.ts` and `server/src/sockets/index.ts` |
| "Where is duplicate prevention?" | `server/src/controllers/report.controller.ts` and `server/src/models/CrowdReport.ts` (unique index) |
| "Show the tests" | `server/src/tests/verification.test.ts` |

---

## 6. Short version (7 minutes)

1. Sign up (Scene 1, steps 5–6 only).
2. Save the Dadar → Borivali route (Scene 3).
3. Track 90101 and explain the moving marker (Scene 5).
4. Five-user verification: Step A, phone vote, Step C, notification (Scene 6).
5. Duplicate vote rejected (Scene 7).
6. Insights: best time and hourly chart (Scene 11).
7. Switch to dark mode (Scene 12).

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| App says *"Cannot reach the LocalLoad server at http://…:4000"* | The phone and laptop aren't on the same network, or the firewall is blocking it. Test `http://<IP>:4000/health` in Safari, then try `sudo ufw allow 4000/tcp`, a phone hotspot, or set `EXPO_PUBLIC_API_URL` in `mobile/.env` and restart Expo. |
| Expo Go can't load the app (QR code fails) | Run `npx expo start --tunnel` (the API still needs the same network or hotspot). |
| `demo:votes` says `[409]` for every rider | You rehearsed less than 10 minutes ago. Run the reset command from the checklist. |
| `demo:votes` says `Login failed` | Run `npm run seed`, and make sure `SEED_DEMO_PASSWORD` is set in `server/.env`. |
| "No simulated trains are running" | Admin → Simulation → **Start**, or check that `SIMULATION_AUTOSTART=true` and restart the server. |
| Trains seem to move too slowly to notice | Admin → speed **×20** or **×40**. |
| No notification banner | First tap Profile → **Send test notification**. If even that doesn't appear: iPhone Settings → Expo Go → Notifications → Allow. Nearest-station alerts need location allowed and a verified green/yellow train arriving (usually within a few minutes; in rush hour most trains are red, so fewer alerts). |
| No route-alert banner | iOS notifications are off for Expo Go (Settings → Expo Go → Notifications), the toggles in Profile are off, or the route doesn't match the train. Alerts appear while the app is open; they are local notifications. Check the **bell** screen, which always lists them. |
| `bash: cd: server: No such file or directory` or `npm error Missing script: "test"` | You're in the wrong folder (probably `mobile/`). Go to the project root with `cd ..` (or `cd ~/fun/Local-Load`), then `cd server`. Check with `pwd`; it should end in `Local-Load/server`. |
| `ENOSPC: System limit for number of file watchers reached` | That message comes from `npm run dev` (it watches files for changes). Use **`npm run serve`** for the demo; it doesn't watch files. To raise the Linux limit permanently: `echo fs.inotify.max_user_watches=524288 \| sudo tee -a /etc/sysctl.conf && sudo sysctl -p` |
| `Port 4000 is already in use` (`EADDRINUSE`) | A server is already running. Stop it with Ctrl+C in its terminal, or run `kill $(lsof -t -i :4000)`, then start again. |
| Server says *"No trains found"* | Run `npm run seed`. |
| MongoDB connection error | `docker start localload-mongo`, and check `MONGODB_URI` in `server/.env`. |
| Marker doesn't move on the map | Check that the top card's dot is **green** (live connection). If it's grey, the socket can't reach the server; same fix as the first row. |

---

## 8. Command cheat sheet

```bash
# start (each in its own terminal, from the project root)
docker start localload-mongo
cd server && npm run serve
cd mobile && npx expo start

# reset live reports between rehearsals
docker exec localload-mongo mongosh localload --quiet --eval 'db.crowdreports.deleteMany({isSample:false}); db.delayreports.deleteMany({isSample:false}); db.notifications.deleteMany({})'

# demo votes (run inside server/)
npm run demo:votes -- 90101 Dadar red,yellow,red                         # 3/5 unverified
FIRST_RIDER=4 npm run demo:votes -- 90101 Dadar red                      # 5th vote → CONFIRMED red
FIRST_RIDER=4 npm run demo:votes -- 90101 Dadar green                    # 409 duplicate
npm run demo:votes -- 90101 Borivali green,green,yellow,yellow,red,red   # MIXED
npm run demo:votes -- 90101 Bandra 5-10,5-10,5-10,on-time,10-plus delay  # delay CONFIRMED 5–10

# usage: npm run demo:votes -- <trainNumber> <stationName> <v1,v2,...> [crowd|delay]
# crowd values: green | yellow | red
# delay values: on-time | 1-5 | 5-10 | 10-plus | not-arrived | cancelled
```
