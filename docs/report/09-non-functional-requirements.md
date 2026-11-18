# Non-Functional Requirements

| Category | Requirement and how it is addressed in the code |
|--------------------|--------------------------------------------------------------------------------|
| **Security** | Passwords are hashed with bcrypt (cost factor 10) and are excluded from query results by default. Sessions use signed JWTs with a configurable expiry (default seven days). The application refuses to start in production without a `JWT_SECRET`. On the device, the token is stored with `expo-secure-store` (iOS Keychain). Administrative routes are protected by role checks. |
| **Data integrity** | Duplicate votes are prevented by a unique compound index `{user, trainInstance, station, windowBucket}` in addition to the application check. Unique indexes exist on user email, station code and train number. Request bodies and query parameters are validated with express-validator. |
| **Privacy** | The user's coordinates are used only to compute the nearest station and are not stored. For arrival alerts, only the station name is sent to the server. Other users' names appear in the live feed as first name and initial. |
| **Transparency** | Simulated positions, the simulated timetable, sample historical data and simulated commuter accounts are labelled in the interface. |
| **Real-time behaviour** | Position updates are pushed over WebSockets at the simulation interval (default three seconds). Clients receive updates only for rooms they have joined. The Home feed refreshes on a server ping, debounced to 1.2 seconds. |
| **Usability** | A consistent component library, bottom-tab navigation, loading, empty and error states on every data screen, colour-coded crowd levels, and light, dark and system themes. |
| **Reliability** | Every route handler passes errors to a central error handler that returns JSON with appropriate status codes. The mobile app shows a retry option when the server is unreachable. The server reports a clear message if its port is already in use. |
| **Maintainability** | TypeScript on both client and server; layered backend (routes, controllers, services, models); reusable UI components and hooks; important algorithms are commented in the source. |
| **Testability** | 19 automated tests (Node.js test runner, supertest, an in-memory MongoDB and a Socket.IO client) cover the verification cases, authentication, routes, reporting, the live feed and alerts. The verification algorithm is a pure function and can be tested without a database. |
| **Portability** | The mobile app is built with Expo and runs on iOS through Expo Go; the code base also targets Android. The backend runs anywhere Node.js and MongoDB are available. |
| **Configurability** | Simulation interval and speed, reporting window, verification threshold, alert cooldown and simulated commuters are set through environment variables (Chapter 14). |
| **Scalability (limitation)** | The simulation state is held in the memory of a single server process, so the backend must run as a single instance. Horizontal scaling is listed under Future Scope. |
