
# Start from here to run environment correctly. 
Simple guide is for runtime instructions. Further down in the `README` there is a `Full Guide` with all the extra details about the project like (postman endpoints, commands, details).


# Simple Guide

## pgAdmin setup. restore from banking-sim-api/backup_database/1778145 <--This file

**Create the database and set credentials**
   - Open **pgAdmin** and connect to your server.
   - Create an empty database (default name: `1778145`).
   - Default credentials (from `src/main/resources/application.properties`):
     - **Username:** `alkicorp`
     - **Password:** `password`
     - Update these via `spring.datasource.username` / `spring.datasource.password` if needed.
   - Liquibase will create/update the schema automatically on app startup.
   - If you are restoring a provided backup, use the `.backup` file in **pgAdmin → Restore**.



## Start postgres (windows user)
Command prompt:
```
net start postgresql-x64-14
```


## Runtime script to start backend + frontend + browser open. (This is how to automatically run program)
Powershell:
```
.\Scripts\Windows\dev.ps1
```


## Sign up for an account. 

### **Pre-existing admin accounts:**

### Admin user (log in this one to add/edit property market.)
user:
```
add
```
password:
```
password
```


### Or you can register your own and add new clients. 

Each save file is unique to the user logged in. View the `Actions index` in `Full Guide` for list of user interactions we can perform in this program.  




## Postman import code - For a simple GET request connection with endpoints.

### Step 1: Find JWT token. 
Get a token (login)

Create a Postman request (one-time per session):
Method: POST
URL: 
```
{{baseUrl}}/auth/login
```
Body → raw → JSON:
```
{  
   "usernameOrEmail": "add",  
   "password": "password"
}
```
## Replace username and password with the one you want.

Send it. You’ll get back JSON like:
```
{  
   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",  
   "tokenType": "Bearer",  "adminStatus": true
}
```

## Copy "token" value for JWT

This token will be needed for the `Authorization: Bearer {{token}}` **Header** in the list of endpoints below in the document inside of `API Requests`.




## ///////////// END OF SIMPLE GUIDE /////////////








# //////////////////////////////////////////////



# //////////// START OF FULL GUIDE //////////////



# Banking Sim API – Setup & Run Guide

This guide covers how to run the Banking Sim API locally on **Windows** and **Mac**, connect with **pgAdmin**, and call the API with **Postman**.


## 1. Prerequisites

- **Java 17** 
- **PostgreSQL 14** 
- **Maven 3.9+** 
- **Node.js 18+ (npm included)**





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

2. **Create the database and set credentials**
   - Open **pgAdmin** and connect to your server.
   - Create an empty database (default name: `1778145`).
   - Default credentials (from `src/main/resources/application.properties`):
     - **Username:** `alkicorp`
     - **Password:** `password`
     - Update these via `spring.datasource.username` / `spring.datasource.password` if needed.
   - Liquibase will create/update the schema automatically on app startup.
   - If you are restoring a provided backup, use the `.backup` file in **pgAdmin → Restore**.






## 3. Run the full app (API + Frontend)

This starts both the backend (`mvn spring-boot:run`) and frontend (`npm run dev`) and opens the Vite URL in your default browser. The script also runs `npm install` the first time if needed.
Press `Ctrl+C` to stop the frontend; the script will also stop the backend process.

### Windows (PowerShell)
.\Scripts\Windows\dev.ps1


### Mac (Bash/Terminal)
chmod +x Scripts/MacOS/dev.sh
./Scripts/MacOS/dev.sh


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





## 4. Build & Run (Maven)

From the repo root:

```bash
mvn test
```

```bash
mvn spring-boot:run
```






## 5. Actions index

Things a user can do in the app (right now):
```
Create an account.
Log in and get access to your own save data (each user is separate).
View the list of simulation slots (1–3).
Start/reset a slot to begin a run.
View the bank’s current state for a slot.
View all clients in a slot.
Create a new client in a slot.
View one client’s details (balances and card info).
View a client’s transaction history.
View a client’s owned properties.
Deposit money into a client’s account.
Withdraw money from a client’s account.
Fund a client’s mortgage down payment.
View available property/products in a slot.
View details for a specific property/product.
Submit a loan request for a client.
View the list of loans in a slot.
Submit a mortgage request for a client (choose a property, down payment, and term).
View the list of mortgages in a slot.
View the S&P 500 investment state.
Invest money into the S&P 500.
Divest money from the S&P 500.
View client distribution chart data.
View activity chart data.
```
Admin-only actions (if your teacher logs in as admin):
```
Approve or reject loans.
Approve or reject mortgages.
Update the mortgage interest rate for a slot.
Create new properties/products.
Update existing properties/products (including status).
Delete properties/products.
View “all products” (not just available ones).
```










## API Requests



### Authentication
**POST**  
`http://localhost:5173/auth/register`

**Headers**
- `Content-Type: application/json`

**Body**
```json
{
  "username": "{{username}}",
  "email": "{{email}}",
  "password": "{{password}}",
  "adminStatus": false
}
```

**Description**
Create a new user account. Returns an `AuthResponse` (including a JWT token you can reuse as `{{token}}`).

**POST**  
`http://localhost:5173/auth/login`

**Headers**
- `Content-Type: application/json`

**Body**
```json
{
  "usernameOrEmail": "{{usernameOrEmail}}",
  "password": "{{password}}"
}
```

**Description**
Login and receive an `AuthResponse` containing a JWT (save it as `{{token}}` for protected endpoints).

Include the JWT in requests to protected endpoints:  
`Authorization: Bearer {{token}}`



### Slots
**GET**  
`http://localhost:5173/api/slots`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
List slot summaries (available slots in the simulation).

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/start`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Reset and start the given slot, returning the new bank state for that slot.

**GET**  
`http://localhost:5173/api/slots/{{slotId}}/bank`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Fetch the current bank state for the given slot.

**PUT**  
`http://localhost:5173/api/slots/{{slotId}}/mortgage-rate`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "mortgageRate": "{{mortgageRate}}"
}
```

**Description**
Update the mortgage interest rate for the slot (ADMIN only). Returns the updated bank state.




### Clients
**GET**  
`http://localhost:5173/api/slots/{{slotId}}/clients`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
List all clients in the given slot.

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/clients`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "name": "{{name}}"
}
```

**Description**
Create a new client in the given slot.

**GET**  
`http://localhost:5173/api/slots/{{slotId}}/clients/{{clientId}}`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Get details for a single client in the given slot.

**GET**  
`http://localhost:5173/api/slots/{{slotId}}/clients/{{clientId}}/transactions`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
List all transactions for the client in the given slot.

**GET**  
`http://localhost:5173/api/slots/{{slotId}}/clients/{{clientId}}/properties`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
List all products/properties currently owned by the client in the given slot.

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/clients/{{clientId}}/deposit`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "amount": "{{amount}}"
}
```

**Description**
Deposit funds into the client’s checking account (creates a transaction).

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/clients/{{clientId}}/withdraw`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "amount": "{{amount}}"
}
```

**Description**
Withdraw funds from the client’s checking account (creates a transaction).

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/clients/{{clientId}}/mortgage-funding`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "amount": "{{amount}}"
}
```

**Description**
Fund a mortgage down payment for the client (creates a transaction).




### Products
**GET**  
`http://localhost:5173/api/slots/{{slotId}}/products`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
List available products (properties) for purchase in the given slot.

**GET**  
`http://localhost:5173/api/slots/{{slotId}}/products/all`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
List all products in the slot (ADMIN only), including non-available statuses.

**GET**  
`http://localhost:5173/api/slots/{{slotId}}/products/{{productId}}`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Fetch details for a single product in the given slot.

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/products`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "name": "{{name}}",
  "price": "{{price}}",
  "description": "{{description}}",
  "rooms": "{{rooms}}",
  "sqft2": "{{sqft2}}",
  "imageUrl": "{{imageUrl}}"
}
```

**Description**
Create a new product in the slot (ADMIN only).

**PUT**  
`http://localhost:5173/api/slots/{{slotId}}/products/{{productId}}`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "name": "{{name}}",
  "price": "{{price}}",
  "description": "{{description}}",
  "rooms": "{{rooms}}",
  "sqft2": "{{sqft2}}",
  "imageUrl": "{{imageUrl}}",
  "status": "{{status}}"
}
```

**Description**
Update an existing product (ADMIN only). `status` is a string matching the product status enum.

**DELETE**  
`http://localhost:5173/api/slots/{{slotId}}/products/{{productId}}`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Delete a product from the slot (ADMIN only).




### Loans
**POST**  
`http://localhost:5173/api/slots/{{slotId}}/clients/{{clientId}}/loans`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "amount": "{{amount}}",
  "termYears": "{{termYears}}"
}
```

**Description**
Create a loan request for a client in the given slot.

**GET**  
`http://localhost:5173/api/slots/{{slotId}}/loans`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
List all loans in the given slot.

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/loans/{{loanId}}/approve`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Approve a loan in the given slot (ADMIN only).

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/loans/{{loanId}}/reject`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Reject a loan in the given slot (ADMIN only).




### Mortgages
**POST**  
`http://localhost:5173/api/slots/{{slotId}}/clients/{{clientId}}/mortgages`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "productId": "{{productId}}",
  "downPayment": "{{downPayment}}",
  "termYears": "{{termYears}}"
}
```

**Description**
Create a mortgage request for a client in the given slot, tied to a specific product/property.

**GET**  
`http://localhost:5173/api/slots/{{slotId}}/mortgages`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
List all mortgages in the given slot.

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/mortgages/{{mortgageId}}/approve`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Approve a mortgage in the given slot (ADMIN only).

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/mortgages/{{mortgageId}}/reject`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Reject a mortgage in the given slot (ADMIN only).




### Investments & Charts
**GET**  
`http://localhost:5173/api/slots/{{slotId}}/investments/sp500`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Get the current SP500 investment state for the slot (cash, invested amount, price, and schedule).

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/investments/sp500/invest`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "amount": "{{amount}}"
}
```

**Description**
Invest cash into the SP500 for the given slot.

**POST**  
`http://localhost:5173/api/slots/{{slotId}}/investments/sp500/divest`

**Headers**
- `Authorization: Bearer {{token}}`
- `Content-Type: application/json`

**Body**
```json
{
  "amount": "{{amount}}"
}
```

**Description**
Divest (sell) SP500 holdings back into cash for the given slot.

**GET**  
`http://localhost:5173/api/slots/{{slotId}}/charts/clients`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Get client distribution chart data for the slot.

**GET**  
`http://localhost:5173/api/slots/{{slotId}}/charts/activity`

**Headers**
- `Authorization: Bearer {{token}}`

**Body**
- none

**Description**
Get activity chart data for the slot.