# HF15 Windows Run Steps

```powershell
npm.cmd install
copy .env.vscode.example .env
npm.cmd start
```

Open `http://localhost:3000`, sign in as Executive, then choose **Reports Center**.

QA:
```powershell
npm.cmd run qa:hf15-reports
npm.cmd run qa:hf14-executive-ai
npm.cmd run qa:final-gold-hotfix-06
```
