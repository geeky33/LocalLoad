# How to Run LocalLoad (step by step)

Follow these steps in order. For the full presentation script, see [demo.md](demo.md).

---

## First time on a new computer (skip if already done)

```bash
cd ~/fun/Local-Load/server
npm install
cp .env.example .env            # then set JWT_SECRET to any long random text
docker run -d --name localload-mongo -p 27017:27017 mongo:7
npm run seed                    # fills the database with stations, trains and demo users

cd ~/fun/Local-Load/mobile
npm install
```

On this laptop all of the above is **already done ✅**. Start from Step 1 below.

> After updating the code, run `npm run seed` in `server/` once more. It's safe to repeat, and it creates any new demo accounts (such as the simulated commuters).

---

## Step 1 — Raise the file-watcher limit (once after each laptop restart)

```bash
sudo sysctl fs.inotify.max_user_watches=524288
```

Type your password when asked. Without this, Expo crashes with `ENOSPC: System limit for number of file watchers reached`.

To make it permanent so you never need this step again:
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

## Step 2 — Start the database

```bash
docker start localload-mongo
```

It prints `localload-mongo`.

## Step 3 — Start the backend (Terminal 1)

```bash
cd ~/fun/Local-Load/server
npm run serve
```

Wait for:
```
[server] LocalLoad API on http://0.0.0.0:4000  (13 simulated trains, running=true, simulated commuters=true)
```

**Keep this terminal open.** Closing it stops the server.

> If it says `Port 4000 is already in use`, an old server is still running. Run `kill $(lsof -t -i :4000)` and do Step 3 again.

## Step 4 — Check the server in the laptop browser

Open **http://localhost:4000/**. You should see **"● Server is running"**.

## Step 5 — Start the app (Terminal 2)

Open a **new** terminal tab:

```bash
cd ~/fun/Local-Load/mobile
npx expo start
```

A **QR code** appears. Keep this terminal open too.

## Step 6 — Open the app on the iPhone

1. Connect the iPhone to the **same Wi-Fi** as the laptop.
2. Find the laptop's IP address (in a third terminal):
   ```bash
   hostname -I | awk '{print $1}'
   ```
   For example `192.168.1.9`.
3. In iPhone **Safari**, open `http://<that-IP>:4000/`. If you see "Server is running", the phone can reach the laptop.
4. Install **Expo Go** from the App Store (first time only).
5. Open the iPhone **Camera**, point it at the QR code and tap the banner. LocalLoad opens.
6. Tap **Create account** and sign up, then tap **Allow** for notifications and for location (used for the *Nearest station* card).

**Done — the app is running. 🎉**

---

## Optional — five-user crowd verification (Terminal 3)

```bash
cd ~/fun/Local-Load/server
npm run demo:votes -- 90101 Dadar red,yellow,red,red,red
```

On the phone: **Track → search 90101 → Track Train**. The crowd card shows **High crowd · Verified by commuters**.

## Optional — admin screen

On the phone: Profile → **Log out** → log in as:

- Email: `admin@localload.dev`
- Password: the `SEED_DEMO_PASSWORD` value in `server/.env` (default `localload123`)

Then go to Profile → **Admin · simulation controls** (start, stop, reset and speed of the trains).

## Optional — run the automated tests

```bash
cd ~/fun/Local-Load/server
npm test            # expect: tests 17, pass 17, fail 0
```

---

## Stopping everything

| What | How |
|---|---|
| Backend (Terminal 1) | **Ctrl+C** |
| App server (Terminal 2) | **Ctrl+C** |
| Database | `docker stop localload-mongo` |

---

## If something goes wrong

| You see | Do this |
|---|---|
| `ENOSPC ... file watchers` | Do Step 1 |
| `Port 4000 is already in use` | `kill $(lsof -t -i :4000)`, then Step 3 again |
| `bash: cd: server: No such file or directory` | You're in the wrong folder. Use the full paths shown (`cd ~/fun/Local-Load/server`). |
| `npm error Missing script` | Same as above: you're in the wrong folder |
| Browser shows `{"error":"Route not found"}` | The server is running but on old code. Restart it (Ctrl+C, then `npm run serve`), or open `http://localhost:4000/health` instead. |
| App says *Cannot reach the LocalLoad server* | Check Step 6.3. If Safari can't open the page, run `sudo ufw allow 4000/tcp` and `sudo ufw allow 8081/tcp`, or connect both laptop and phone to your phone's hotspot. |
| QR code doesn't open the app | Stop Expo (Ctrl+C) and run `npx expo start --tunnel` |
| `demo:votes` shows `[409]` for every rider | These riders already voted in the last 10 minutes. Use a different station (e.g. `Andheri`) or wait 10 minutes. |
| `demo:votes` says `Login failed` | Run `npm run seed` in `server/` |
| Database connection error when starting the server | `docker start localload-mongo` |
| No notifications at all | Profile → **Send test notification**. If nothing appears: iPhone Settings → Expo Go → Notifications → Allow. Nearest-station alerts also need **location** allowed; they arrive when a verified green/yellow train reaches your nearest station (every few minutes). |
| Home says "No simulated trains are running" | Log in as admin → Admin → **Start** |
