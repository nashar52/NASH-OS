const { execSync } = require('child_process');
try {
  if (process.platform === 'win32') {
    execSync('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"', { stdio: 'inherit' });
  } else {
    execSync('lsof -ti:3000 | xargs -r kill -9', { stdio: 'inherit' });
  }
  console.log('Port 3000 cleared.');
} catch (error) {
  console.log('No process was cleared from port 3000.');
}
