# NASH OS HF09 — Windows Run Steps

1. Extract the ZIP to a normal local folder.
2. Open Windows PowerShell or Command Prompt inside the `HF06` folder.
3. Run `npm install`.
4. If `.env` is missing, run `copy .env.vscode.example .env`.
5. Confirm MySQL is running and the existing NASH database credentials in `.env` are correct.
6. Run `npm start`.
7. Open `http://localhost:3000`.

## QA
- `npm run qa:hf09-saas-shell`
- `npm run qa:hf08-executive`
- `npm run qa:hf07-login`
- `npm run qa:final-gold-hotfix-06`

No schema migration, reset, seed, or JSON-to-MySQL command is required or allowed.
