# HF11 Run Steps — Windows PowerShell

From the `HF06` folder:

```powershell
npm.cmd install
copy .env.vscode.example .env
npm.cmd start
```

Open: `http://localhost:3000`

QA:

```powershell
npm.cmd run qa:hf11-employee360
npm.cmd run qa:hf10-saas-workspace
npm.cmd run qa:hf09-saas-shell
npm.cmd run qa:hf08-executive
npm.cmd run qa:hf07-login
npm.cmd run qa:final-gold-hotfix-06
```
