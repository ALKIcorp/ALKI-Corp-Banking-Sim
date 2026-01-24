# Scripts

This folder includes scripts for running the full app and for read-only API calls.

---

## Run the full app

Starts the backend (`mvn spring-boot:run`) and frontend (`npm run dev`) and opens the Vite URL. Runs `npm install` the first time if needed.
Press `Ctrl+C` to stop the frontend; the script will also stop the backend process.

### MacOS (Bash)
1. From the repo root, make the script executable:
   `chmod +x Scripts/MacOS/dev.sh`
2. Run it:
   `./Scripts/MacOS/dev.sh`

### Windows (PowerShell)
1. From the repo root, run:
   `.\Scripts\Windows\dev.ps1`

---

## Read-Only API Calls

These scripts make GET requests only. They read data from the API.

### MacOS (Bash)

1. From the repo root, make the script executable:
   `chmod +x Scripts/MacOS/api-readonly.sh`
2. Run it:
   `./Scripts/MacOS/api-readonly.sh`

---

### Windows (PowerShell)

1. From the repo root, run:
   `powershell -ExecutionPolicy Bypass -File .\Scripts\Windows\api-readonly.ps1`


