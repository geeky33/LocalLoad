# Scope

## In scope

The following are implemented in the current version of the project:

- User registration, login, logout and session persistence (JWT stored in the device's secure storage).
- A dataset of 69 station records on the Western, Central and Harbour lines (one record per station per line) with approximate coordinates, and 13 demonstration trains covering fast and slow services in both directions.
- Server-side simulation of train movement with configurable tick interval and speed multiplier, and administrative controls to start, stop, reset and change the speed of the simulation.
- Real-time position, crowd and delay updates over Socket.IO.
- Crowd reporting (green, yellow, red) and delay reporting (six categories) with five-distinct-user verification and duplicate-vote prevention.
- Saved daily routes (create, read, update, delete) with matching trains and their status.
- Notifications for confirmed changes on saved routes and for less crowded trains arriving at the user's nearest station.
- A live crowd feed showing who reported each status, populated in part by labelled simulated commuter accounts.
- Insights computed from stored crowd reports (hourly pattern, morning versus evening, weekday trend, most crowded stations and trains), filterable by weekday or by a specific date selected from a calendar.
- A minimal administrative view (users, reports, verification counts, simulation controls).
- Automated tests for the verification algorithm and the main API flows.

## Out of scope

The following are deliberately excluded:

- Real train positions. No GPS feed, official railway API or real-time railway data source is used.
- The official railway timetable. All schedules are invented demonstration data.
- Remote (background) push notifications. Notifications are shown as local notifications while the application is running.
- Multiple server instances. The simulation runs in the memory of a single backend process.
- Machine learning or predictive analytics.
- Payments, ticketing or any integration with railway booking systems.

## Future scope

- Integration with an official or licensed real-time railway data source, replacing the simulation engine while keeping the same update format.
- Track geometry that follows the real alignment instead of straight segments between stations.
- Remote push notifications using Expo push tokens and a development build.
- A reputation score for reporters, so that consistently accurate users carry more weight.
- Coach-level and platform-level crowd information, and accessibility information for stations.
- Hosting the backend and database on a cloud platform (for example a managed MongoDB service and a Node.js hosting service). The project currently contains no cloud deployment configuration.
- Offline caching of the timetable, and support for regional languages.
