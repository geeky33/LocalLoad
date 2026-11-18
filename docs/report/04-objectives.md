# Objectives

The objectives of the project are:

1. To develop a cross-platform mobile application, runnable on an iPhone through Expo, that presents suburban train information in a clear and consistent interface with light and dark themes.
2. To implement a backend that maintains simulated train positions as the single source of truth and distributes them in real time through Socket.IO rooms.
3. To provide a searchable demonstration timetable with filters for railway line, train type (fast or slow), direction and source and destination stations.
4. To collect crowd and delay reports from commuters, and to accept a status as confirmed only when at least five distinct users agree within a reporting window, with a strict majority.
5. To prevent duplicate voting at the database level, not only in the user interface.
6. To allow users to save daily routes, and to notify them only about meaningful, confirmed changes on those routes.
7. To show the station nearest to the user, and to alert the user when a less crowded train reaches it, without storing the user's location.
8. To present historical crowd insights computed from stored reports, without predictive or machine-learning techniques.
9. To secure the system with hashed passwords, token-based authentication and role-based access to administrative controls.
10. To label simulated and sample data clearly throughout the application, so that it is never presented as real railway data.
