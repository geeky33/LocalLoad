# Proposed Solution

LocalLoad is a client–server system made up of a cross-platform mobile application and a central backend.

## Overview

- **Mobile application (React Native, Expo).** It provides five main sections, reachable through a bottom tab bar: *Home*, *Track*, *Report*, *Insights* and *Profile*. It supports light, dark and system-default themes.
- **Backend (Node.js, Express, TypeScript).** It exposes a REST API, authenticates users with JSON Web Tokens, stores data in MongoDB, and maintains a Socket.IO server for real-time updates.
- **Simulation engine (server side).** It moves 13 demonstration trains along routes defined by approximate station coordinates on the Western, Central and Harbour lines. It is the single source of truth for train positions. The mobile application only displays positions; it never calculates them.
- **Verification service (server side).** It turns individual crowd and delay reports into a status (*none*, *unverified*, *mixed* or *confirmed*) using a five-distinct-user threshold and a strict-majority rule.

## Key elements of the solution

1. **Simulated live tracking.** On each tick (three seconds by default) every simulated train advances along the straight segment between two consecutive stations. Its latitude and longitude are obtained by linear interpolation. The new position is broadcast only to clients that have joined that train's Socket.IO room.
2. **Five-user crowd and delay verification.** A user may cast one vote per train instance and station within a ten-minute window. Duplicates are rejected both by the application logic and by a unique database index. A status is confirmed only with at least five distinct voters and a strict majority.
3. **Saved routes and alerts.** Users save daily routes. When a report changes the confirmed status of a train serving a saved route, the backend stores a notification and pushes it to the user, and the app displays it as a local notification.
4. **Nearest station and arrival alerts.** With the user's permission, the app determines the nearest station from the phone's location. It sends only the station *name* to the server, which alerts the user when a train with a confirmed green or yellow crowd status arrives at that station.
5. **Live crowd feed with simulated commuters.** A set of clearly labelled demonstration accounts reports crowd levels for running trains, following a time-of-day pattern based on the current time in Mumbai. This keeps the live feed populated during demonstrations. These reports pass through the same verification logic as reports from real users.
6. **Insights.** MongoDB aggregation pipelines compute hourly, weekday, station-wise and train-wise crowd statistics over stored reports. The statistics can be restricted to one weekday across all weeks, chosen from a drop-down list that defaults to the current weekday, or to a single calendar date chosen from a month calendar on which days with stored data are marked. Most of these reports are seeded sample data and are labelled as such.

## Application screens

The figures below are placeholders for screenshots of the running application.

**[TODO: insert screenshot – Welcome screen]**

**[TODO: insert screenshot – Home screen (greeting, nearest station card, running trains, recent crowd updates)]**

**[TODO: insert screenshot – Track screen with the simulated timetable and filters]**

**[TODO: insert screenshot – Live tracking map with the moving train marker]**

**[TODO: insert screenshot – Report screen (crowd level selection and verification result)]**

**[TODO: insert screenshot – Insights screen]**

**[TODO: insert screenshot – Profile screen in dark mode]**

**[TODO: insert screenshot – Admin simulation controls]**
