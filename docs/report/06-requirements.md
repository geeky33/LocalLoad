# Requirements

## Hardware requirements

### Development and server machine

| Component | Requirement |
|-------------------------|---------------------------------------------------------------------------|
| Processor | Any 64-bit processor capable of running Node.js 20 or later and Docker |
| Memory | **[TODO: RAM of the machine used for development, e.g. 8 GB or more]** |
| Storage | Space for the `node_modules` folders of the server and mobile projects, the MongoDB data and the mermaid-cli tooling. Note that the MongoDB server refuses to build indexes when less than 500 MB of disk space is free (observed during development). |
| Network | A Wi-Fi network shared with the mobile device, or a mobile hotspot |
| Machine used | **[TODO: make/model, CPU and operating system of the development machine]** |

### Client device

| Component | Requirement |
|-------------------------|---------------------------------------------------------------------------|
| Device | Apple iPhone able to run the Expo Go application for Expo SDK 58 **[TODO: minimum iOS version supported by Expo Go for SDK 58, and the iPhone model used for testing]** |
| Sensors | Location services (optional; used by the nearest-station feature) |
| Network | Connection to the same network as the backend server |

## Software requirements

| Software | Use |
|----------------------------------------|------------------------------------------------------------|
| Operating system | Linux, macOS or Windows for development (the project was developed on Linux) |
| Node.js (20 or later) and npm | Running and building the backend, the mobile development server and the report tooling |
| MongoDB 7 (Docker image `mongo:7`, a local installation, or a hosted service) | Database |
| Docker (optional) | Running MongoDB in a container |
| Expo Go (iOS app) | Running the mobile application on an iPhone |
| Google Chrome or Chromium | Rendering report diagrams with mermaid-cli |
| Pandoc 3 and Python 3 | Building this report as a Word document |
| A modern code editor | Development (Visual Studio Code was used) |

The exact library versions are listed in Chapter 10, which is generated automatically from the project's dependency files.
