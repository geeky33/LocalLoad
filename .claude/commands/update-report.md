---
description: Sync the project report in docs/report/ with the current code and rebuild report.docx
---

Bring the LocalLoad project report up to date with the code base, then rebuild it.

1. **Re-read the code base.** Read README.md, both package.json files, `server/src` (models, routes, services, simulation, sockets, config), `mobile/src` (screens, navigation, hooks, services), the `.env.example` files and any deployment files. Note every feature, dependency, model, route, socket event and configuration option that exists now.

2. **Compare with the report.** Read every `docs/report/*.md` file and `docs/report/diagrams/*.mmd`. List the statements that are now outdated, missing or wrong, for example a feature described but removed, a new feature not described, a changed default value, a new collection, or a diagram that no longer matches.

3. **Update outdated sections.**
   - Keep every heading and the numbering of the files.
   - Keep the user's own wording. Change only the sentences that are factually outdated, and add new paragraphs where something new needs describing. Do not rewrite sections for style.
   - Never edit text between `<!-- AUTO:… -->` / `<!-- /AUTO:… -->` or `<!-- SNIPPET: … -->` / `<!-- /SNIPPET -->` markers; it is generated.
   - Update hand-written diagrams in `docs/report/diagrams/*.mmd` (not `er-diagram.mmd`, which is generated) when the architecture, use cases or flows changed.
   - If a dependency was added, add its purpose to `PURPOSE` in `scripts/report/generate.mjs`.
   - If a new important function should be shown in Chapter 13, add an empty `SNIPPET` marker pair for it with a short explanation.
   - Follow the content rules in CLAUDE.md: formal, third person, only what exists, planned work under "Future Scope", no invented metrics, and `**[TODO: …]**` for information the code cannot provide.

4. **Regenerate and rebuild.** Run `scripts/build_report.sh` and fix any error it reports.

5. **Report back** with:
   - a list of every file changed and, for each one, what changed and why (e.g. "08-functional-requirements.md: added FR-28 for …"),
   - what the generator changed (dependencies, collections, endpoints, snippets),
   - the `**[TODO: …]**` items that are still open,
   - confirmation that `docs/report/output/report.docx` was rebuilt.
