# Problem Statement

Commuters on the Mumbai Suburban Railway take boarding decisions with very little information about the train they are about to board. The following problems were identified.

1. **Uncertainty about train position.** A printed or static timetable states when a train is scheduled to depart, but not where the train is at a given moment.
2. **No reliable crowd information.** The crowd level of an approaching train is unknown until it arrives at the platform. Peak-hour trains are frequently overcrowded, and a commuter who knew that a less crowded train was close behind could choose to wait for it.
3. **Unverified crowd-sourced information.** Information shared informally (for example in messaging groups) is not verified. A single incorrect or malicious report can mislead many people, and the same person can repeat a claim several times.
4. **Information not tailored to the individual.** A commuter is mainly interested in the trains that serve their own daily route and in the station closest to them, not in the entire network.

**[TODO: add evidence for the problem, e.g. results of an informal survey of commuters, news references or personal observations, if available.]**

Formally, the problem addressed by this project is:

> *To design and implement a mobile application that presents the position of suburban trains on a map, collects crowd and delay reports from commuters, accepts a reported status only when it is verified by a sufficient number of distinct users, and delivers information relevant to the individual user's routes and location, while clearly distinguishing simulated data from real data.*
