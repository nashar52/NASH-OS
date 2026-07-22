# HF20 Windows Run Steps

```powershell
npm.cmd install
copy .env.vscode.example .env
npm.cmd start
```

Open http://localhost:3000 and use local demo access with Executive role.

QA:
```powershell
npm.cmd run qa:hf20-all
npm.cmd run qa:final-gold-hotfix-06
```
