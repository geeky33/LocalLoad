# Introduction

The Mumbai Suburban Railway is the primary mode of daily transport for a large share of the population of the Mumbai Metropolitan Region. Its Western, Central and Harbour lines connect the island city with the northern and eastern suburbs and with Navi Mumbai. **[TODO: add a cited figure for daily ridership and a reference to the source.]**

Two questions recur for a commuter before almost every journey: *where is the train at this moment*, and *how crowded is it*. The first question is partly addressed by existing timetable applications; the second is usually answered informally, by word of mouth or by observation on the platform.

This report describes **LocalLoad**, a mobile application developed as a final-year B.Tech project. LocalLoad combines three ideas in a single application:

1. **Train tracking on a map.** The positions of trains are shown on an interactive map, with the previous and next station, an estimated time of arrival and the current speed. In this project the positions are produced by a simulation engine on the server, driven by approximate station coordinates. They are explicitly labelled as simulated in the application and are not derived from any real railway data source.
2. **Community crowd reporting with verification.** Commuters report the crowd level of a train (green, yellow or red) and its delay. A status is only treated as confirmed when at least five distinct users report within a ten-minute window and one value holds a strict majority.
3. **Personalised information.** Users can save their daily routes, see the station nearest to their current location, and receive notifications when a confirmed change affects them.

The application consists of a React Native (Expo) mobile client and a Node.js/Express backend that stores data in MongoDB and pushes real-time updates over Socket.IO.

**[TODO: describe the personal or academic motivation for choosing this project.]**

## Organisation of the report

Chapter 2 states the problem and Chapter 3 the proposed solution. Chapters 4 to 9 cover the objectives, scope, requirements, use cases, and functional and non-functional requirements. Chapter 10 lists the technology stack, which is generated from the project's dependency files. Chapters 11 and 12 describe the system architecture and the database design. Chapter 13 explains the core algorithms with code taken directly from the source files, and Chapter 14 documents setup and deployment.
