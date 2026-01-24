# Banking Sim API – Setup & Run Guide

This guide covers how to run the Banking Sim API locally on **Windows** and **Mac**, connect with **pgAdmin**, and call the API with **Postman**.

---

## 1. Prerequisites

- **Java 17** 
- **PostgreSQL 14** 
- **Maven 3.9+** 
- **Node.js 18+ (npm included)**

---

## 2. Run the environment

### Start PostgreSQL

**Windows**
- In **Command Prompt (Run as administrator):**  
  `net start postgresql-x64-14`  
  (Replace `14` with your PostgreSQL version if different.)

**Mac**
- In **Terminal:**  
  `brew services start postgresql`

---

2. **Restore the database** (from the provided `.sql` backup)
   - Open **pgAdmin** and connect to your server.
   - Create an empty database (e.g., `1778145`).
   - Right‑click the database → **Query Tool**.
   - Open the `.sql` file and click **Run** to import schema + data.

---

## 3. Run the full app (API + Frontend)

This starts both the backend (`mvn spring-boot:run`) and frontend (`npm run dev`) and opens the Vite URL in your default browser. The script also runs `npm install` the first time if needed.
Press `Ctrl+C` to stop the frontend; the script will also stop the backend process.

### Windows (PowerShell)
```
.\Scripts\Windows\dev.ps1
```

### Mac (Bash/Terminal)
```
chmod +x Scripts/MacOS/dev.sh
./Scripts/MacOS/dev.sh
```

### Manual method (if script fails)

**Terminal 1 (backend)**
```
mvn spring-boot:run
```

**Terminal 2 (frontend)**
```
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

---

## 4. Run API Read-Only Scripts

Scripts are provided for making GET (read-only) API calls.

### Windows (PowerShell)

1. From the repo root, run:
   ```
   powershell -ExecutionPolicy Bypass -File .\Scripts\Windows\api-readonly.ps1
   or
   .\Scripts\Windows\api-readonly.ps1
   ```

### Mac (Bash/Terminal)

1. From the repo root, make the script executable:
   ```
   chmod +x Scripts/MacOS/api-readonly.sh
   ```
2. Run it:
   ```
   ./Scripts/MacOS/api-readonly.sh
   ```

For more details, see [Scripts/README_Scripts.md](Scripts/README_Scripts.md).

---

## 5. Build & Run (Maven)

From the repo root:

```bash
mvn test
```

```bash
mvn spring-boot:run
```

---

## API Requests

### Authentication
- POST /auth/register — create a user (body: RegisterRequest { username, email, password })
- POST /auth/login — login and receive JWT (body: LoginRequest { usernameOrEmail, password })

Include the JWT in requests to protected endpoints:
```
Authorization: Bearer <token>
```

### Slots
- GET /api/slots — list slot summaries
- POST /api/slots/{slotId}/start — reset and start a slot
- GET /api/slots/{slotId}/bank — get bank state for a slot

### Clients
- GET /api/slots/{slotId}/clients — list clients in a slot
- POST /api/slots/{slotId}/clients — create client (body: CreateClientRequest { name })
- GET /api/slots/{slotId}/clients/{clientId} — get client details
- GET /api/slots/{slotId}/clients/{clientId}/transactions — list client transactions
- POST /api/slots/{slotId}/clients/{clientId}/deposit — deposit funds (body: MoneyRequest { amount })
- POST /api/slots/{slotId}/clients/{clientId}/withdraw — withdraw funds (body: MoneyRequest { amount })

### Investments & Charts
- GET /api/slots/{slotId}/investments/sp500 — get SP500 investment state
- POST /api/slots/{slotId}/investments/sp500/invest — invest in SP500 (body: MoneyRequest { amount })
- POST /api/slots/{slotId}/investments/sp500/divest — divest from SP500 (body: MoneyRequest { amount })
- GET /api/slots/{slotId}/charts/clients — client distribution chart data
- GET /api/slots/{slotId}/charts/activity — activity chart data
     