# HF12 Windows Run Steps

Open PowerShell inside the `HF06` folder.

```powershell
npm.cmd install
```

If `.env` does not exist:

```powershell
copy .env.vscode.example .env
```

Start NASH OS:

```powershell
npm.cmd start
```

Open:

```text
http://localhost:3000
```

Run HF12 QA:

```powershell
npm.cmd run qa:hf12-manager-workspace
```
