# NASH OS HF25 — Closed-Loop Operational Workflows

1. Open the extracted `HF06` folder.
2. Run `npm install` if dependencies are not already installed.
3. Keep the existing `.env` MySQL settings unchanged.
4. Run `npm run qa:hf25`.
5. Run `npm start`.

HF25 adds a common five-stage workflow rail to operational workspaces: source signal, accountable work, evidence/control, human decision, and closure receipt. It does not change the database schema, seed data, or MySQL source-of-truth lock.
