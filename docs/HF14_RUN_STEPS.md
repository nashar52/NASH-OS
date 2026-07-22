# HF14 Windows Run Steps

```powershell
npm.cmd install
copy .env.vscode.example .env
npm.cmd start
```

Open `http://localhost:3000`.

QA:

```powershell
npm.cmd run qa:hf14-executive-ai
npm.cmd run qa:hf13-hr-workspace
npm.cmd run qa:final-gold-hotfix-06
```
