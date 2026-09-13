# Becoming I Web

Install this repository independently with Node.js 22.12 or later:

```powershell
cmd /c npm ci
cmd /c npm run dev
```

Source images, profile data, icons, and styles are included in this repository.
No workbench directory or sibling checkout is required to build the website.
Do not copy node_modules across operating systems.

Face capture and transformation require the separate Bridge service on
http://127.0.0.1:3100. Vite proxies /v2 there; open the URL printed by Vite.
Run the Bridge on the same computer for the local exhibition setup.
The BIE browser adapter is loaded from the separate extension repository.

Checks: npm test and npm run build. Initial npm installation requires internet.
Participant sessions and counters live in the Bridge's local runtime database;
they are not included in Git and are not reset by rebuilding this website.
