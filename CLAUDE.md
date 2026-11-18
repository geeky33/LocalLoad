# LocalLoad

Mumbai suburban railway companion app: `mobile/` (React Native + Expo SDK 58, TypeScript) and `server/` (Node.js + Express 5 + MongoDB/Mongoose + Socket.IO, TypeScript). Train positions, timetables and commuter accounts used for the live feed are **simulated** and must always be labelled as such.

- Run: see `RUN.md`. Demo script: `demo.md`. Viva notes: `viva.md`.
- Backend tests: `cd server && npm test`. Type checks: `npx tsc --noEmit` in `server/` and `mobile/`.

## Documentation

The project report lives in `docs/report/` (Markdown → Word via `scripts/build_report.sh`; details in `docs/report/README.md`).

**Whenever features, dependencies, the database schema, the architecture or the deployment change, update the matching file in `docs/report/` and run `scripts/build_report.sh`.**

| Change | Report file(s) |
|---|---|
| New or changed feature / screen | `03-proposed-solution.md`, `05-scope.md`, `07-use-case.md`, `08-functional-requirements.md` |
| New dependency | Add its purpose to `PURPOSE` in `scripts/report/generate.mjs` (Chapter 10 is generated) |
| Mongoose model / index change | `12-database-design.md` design notes (ER diagram and tables are generated) |
| New route, socket event or module | `11-system-architecture.md` (API table is generated), `diagrams/architecture.mmd` |
| Changed core algorithm | `13-core-logic.md` prose; listings update automatically via `SNIPPET` markers |
| New env var / script / deployment step | `.env.example` (with a comment line above the variable), `14-deployment-details.md` |

Rules for report content: formal academic tone, third person; describe only what exists in the code; label planned work as **Future Scope**; never invent metrics or results; use `**[TODO: …]**` for information the code cannot provide. Do not edit text between `<!-- AUTO:… -->` or `<!-- SNIPPET: … -->` markers by hand. The generated `docs/report/output/report.docx` and `docs/report/diagrams/png/*.png` are committed to git.
