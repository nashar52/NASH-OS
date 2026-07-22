# NASH OS HF10 — Windows Run Steps

Open PowerShell inside the `HF06` folder.

```powershell
npm.cmd install
copy .env.vscode.example .env
npm.cmd start
```

Open:

```text
http://localhost:3000
```

QA:

```powershell
npm.cmd run qa:hf10-saas-workspace
npm.cmd run qa:hf09-saas-shell
npm.cmd run qa:hf08-executive
npm.cmd run qa:hf07-login
npm.cmd run qa:final-gold-hotfix-06
```

No MySQL schema migration is included. No database records are modified by installation.
