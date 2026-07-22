# HF26 Windows local run

1. Extract the ZIP.
2. Open PowerShell in the `HF06` folder.
3. Run `npm install`.
4. Confirm the existing `.env` values point to the approved MySQL instance.
5. Run `npm run qa:hf26`.
6. Run `npm start`.
7. Open `http://localhost:3000/`.

Do not run database initialization, JSON migration, seed, reset, or schema migration commands.
