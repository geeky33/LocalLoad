# Functional Requirements

Each requirement below is implemented in the current code base.

## Authentication and accounts

- **FR-01** The system shall allow a user to register with full name, email and password, with matching password confirmation in the app.
- **FR-02** The system shall reject invalid email addresses, passwords shorter than six characters and names shorter than two characters (HTTP 400).
- **FR-03** The system shall reject registration with an email address that already exists (HTTP 409).
- **FR-04** The system shall authenticate users with email and password and return a signed JWT; invalid credentials shall return HTTP 401.
- **FR-05** The system shall restore the session on application start when a valid token is stored, and shall delete the token on logout.
- **FR-06** Private endpoints shall require a valid JWT; administrative endpoints shall additionally require the `admin` role (HTTP 403 otherwise).

## Timetable and tracking

- **FR-07** The system shall store stations with name, code, line, latitude, longitude and sequence, and trains with number, name, line, type, direction, ordered halts, departure time and duration.
- **FR-08** The system shall allow searching trains by name or number and filtering by line, type, direction, source station and destination station, returning only trains that travel from the source to the destination in that order.
- **FR-09** The system shall compute the scheduled time at each halt proportionally to the distance travelled along the route.
- **FR-10** The backend shall move each simulated train along its route at a configurable interval and speed multiplier, by linear interpolation between consecutive stations.
- **FR-11** The system shall provide, for each simulated train, the previous station, next station, current station (when halted), distance to the next station, estimated time of arrival, speed, overall progress and last-update time.
- **FR-12** The system shall broadcast position updates only to clients subscribed to the corresponding train room, and the app shall unsubscribe and remove its listeners when the tracking screen closes.
- **FR-13** All train positions and schedules shall be labelled as simulated in the user interface.

## Crowd and delay reporting

- **FR-14** The system shall accept crowd reports (green, yellow, red) and delay reports (on time, 1–5 min, 5–10 min, more than 10 min, not arrived, cancelled) for a train instance and a station on that train's route.
- **FR-15** The system shall reject a second report from the same user for the same train instance and station within the reporting window (default 10 minutes), both in application logic and through a unique database index (HTTP 409).
- **FR-16** The system shall consider only reports within the reporting window and only the latest report per user.
- **FR-17** The system shall classify a status as *unverified* with fewer than five distinct reporters, *confirmed* when one value has a strict majority among five or more reporters, and *mixed* otherwise.
- **FR-18** The system shall show the vote distribution, the number of reports, the last update time and the names of the reporters (real users abbreviated as first name and initial; demonstration accounts marked "demo").
- **FR-19** The system shall award one contribution point per accepted report.

## Routes, location and notifications

- **FR-20** The system shall allow an authenticated user to create, list, update and delete saved routes, and shall list the next matching trains for each route.
- **FR-21** The system shall compute the nearest stations to coordinates supplied by the app, merging stations that serve several lines, and shall flag locations more than 40 km from any station.
- **FR-22** The system shall create a notification and notify the user when a report changes the confirmed status of a train serving one of the user's saved routes.
- **FR-23** The system shall notify users watching a station when a train arrives there with a confirmed green or yellow crowd status, at most once per user and station per cooldown period (default 60 seconds).
- **FR-24** The system shall allow the user to enable or disable alerts in general and per type (crowd, delay, nearest station).

## Insights and administration

- **FR-25** The system shall compute hourly, morning versus evening, weekday, station-wise and train-wise crowd statistics from stored reports, using the Asia/Kolkata time zone.
- **FR-26** The system shall allow an administrator to start, stop and reset the simulation and change its speed multiplier, and to view users, recent reports and live verification counts.
- **FR-27** The seed script shall create stations, trains, train instances, demonstration accounts and sample historical reports idempotently.
