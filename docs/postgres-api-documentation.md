# Banking Simulation API - PostgreSQL Database & API Documentation

## Table of Contents
1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)

---

## Database Schema

### Database Information
- **Database Name**: `1778145`
- **Schema**: `public`
- **Database Type**: PostgreSQL
- **Connection**: `jdbc:postgresql://localhost:5432/1778145?currentSchema=public`

### Tables Overview
The database consists of 4 main tables:
- `bank_state` - Stores the state of the bank for each simulation slot
- `client` - Stores client/customer information
- `client_transaction` - Stores all client transactions (deposits/withdrawals)
- `investment_event` - Stores investment-related events (investments, divestments, dividends, growth)

---

### Table: `bank_state`

Stores the overall state of the bank for each simulation slot. Each slot represents a separate simulation instance.

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `id` | BIGINT | PRIMARY KEY, AUTO INCREMENT | Unique identifier for the bank state record |
| `slot_id` | INT | NOT NULL, UNIQUE | The simulation slot number (1, 2, or 3). Each slot has one bank state record |
| `liquid_cash` | DECIMAL(19,2) | NOT NULL | The amount of liquid cash available in the bank (not invested) |
| `invested_sp500` | DECIMAL(19,2) | NOT NULL | The total amount currently invested in S&P 500 |
| `sp500_price` | DECIMAL(19,2) | NOT NULL | The current price of S&P 500 shares |
| `game_day` | DOUBLE PRECISION | NOT NULL | The current day in the simulation (can be fractional) |
| `next_dividend_day` | INT | NOT NULL | The game day when the next dividend will be paid |
| `next_growth_day` | INT | NOT NULL | The game day when the next growth event will occur |
| `last_update_timestamp` | TIMESTAMP | NOT NULL | Timestamp of the last update to this bank state |

**Purpose**: Tracks the bank's financial state, investment portfolio, and simulation progress for each slot.

---

### Table: `client`

Stores information about bank clients/customers. Each client belongs to a specific bank state (slot).

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `id` | BIGINT | PRIMARY KEY, AUTO INCREMENT | Unique identifier for the client |
| `bank_state_id` | BIGINT | NOT NULL, FOREIGN KEY → `bank_state.id` | Reference to the bank state this client belongs to |
| `slot_id` | INT | NOT NULL | The simulation slot number (denormalized for query performance) |
| `name` | VARCHAR(80) | NOT NULL | Client's full name (max 80 characters) |
| `checking_balance` | DECIMAL(19,2) | NOT NULL | Current balance in the client's checking account |
| `daily_withdrawn` | DECIMAL(19,2) | NOT NULL | Total amount withdrawn by the client today (resets daily) |
| `card_number` | VARCHAR(32) | NOT NULL | Client's debit/credit card number |
| `card_expiry` | VARCHAR(8) | NOT NULL | Card expiration date (format: MM/YYYY) |
| `card_cvv` | VARCHAR(4) | NOT NULL | Card security code (CVV) |
| `created_at` | TIMESTAMP | NOT NULL | Timestamp when the client account was created |

**Indexes**:
- `idx_client_slot` on `slot_id` - Improves queries filtering by slot

**Foreign Keys**:
- `fk_client_bank_state` - Links client to `bank_state` table

**Purpose**: Manages client accounts, balances, and payment card information.

---

### Table: `client_transaction`

Stores all financial transactions performed by clients (deposits and withdrawals).

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `id` | BIGINT | PRIMARY KEY, AUTO INCREMENT | Unique identifier for the transaction |
| `client_id` | BIGINT | NOT NULL, FOREIGN KEY → `client.id` | Reference to the client who performed the transaction |
| `type` | VARCHAR(20) | NOT NULL | Transaction type: `DEPOSIT` or `WITHDRAWAL` |
| `amount` | DECIMAL(19,2) | NOT NULL | The transaction amount (always positive) |
| `game_day` | INT | NOT NULL | The game day when the transaction occurred |
| `created_at` | TIMESTAMP | NOT NULL | Timestamp when the transaction was recorded |

**Indexes**:
- `idx_tx_client` on `client_id` - Improves queries filtering transactions by client

**Foreign Keys**:
- `fk_tx_client` - Links transaction to `client` table

**Purpose**: Maintains a complete audit trail of all client deposits and withdrawals.

---

### Table: `investment_event`

Stores all investment-related events for the bank's S&P 500 portfolio.

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| `id` | BIGINT | PRIMARY KEY, AUTO INCREMENT | Unique identifier for the investment event |
| `slot_id` | INT | NOT NULL | The simulation slot number this event belongs to |
| `type` | VARCHAR(20) | NOT NULL | Event type: `INVEST`, `DIVEST`, `DIVIDEND`, or `GROWTH` |
| `asset` | VARCHAR(50) | NOT NULL | The asset name (e.g., "SP500") |
| `amount` | DECIMAL(19,2) | NOT NULL | The amount involved in the event (investment amount, dividend amount, etc.) |
| `game_day` | INT | NOT NULL | The game day when the event occurred |
| `created_at` | TIMESTAMP | NOT NULL | Timestamp when the event was recorded |

**Indexes**:
- `idx_investment_slot` on `slot_id` - Improves queries filtering investment events by slot

**Purpose**: Maintains a complete history of all investment activities, dividends, and market growth events.

---

### Relationships Summary

```
bank_state (1) ──< (many) client
  └─ slot_id (unique per slot)

client (1) ──< (many) client_transaction

investment_event
  └─ slot_id (references slot, but no foreign key constraint)
```

**Note**: The `investment_event` table uses `slot_id` to reference slots but doesn't have a formal foreign key constraint. The `client` table has both a foreign key to `bank_state` and a denormalized `slot_id` column for query optimization.

---

## API Endpoints

Base URL: `http://localhost:8080/api`

All endpoints return JSON responses. The API uses RESTful conventions with path parameters for slot and client identifiers.

---

### Slot Management Endpoints

#### 1. List All Slots
**GET** `/api/slots`

Retrieves a summary of all available simulation slots (1, 2, 3).

**Response**: `200 OK`
```json
[
  {
    "slotId": 1,
    "clientCount": 5,
    "gameDay": 10.5,
    "hasData": true,
    "liquidCash": 100000.00
  },
  {
    "slotId": 2,
    "clientCount": 0,
    "gameDay": 0.0,
    "hasData": false,
    "liquidCash": 0.00
  },
  {
    "slotId": 3,
    "clientCount": 2,
    "gameDay": 5.0,
    "hasData": true,
    "liquidCash": 50000.00
  }
]
```

**Response Fields**:
- `slotId` (int): The slot number
- `clientCount` (int): Number of clients in this slot
- `gameDay` (double): Current simulation day
- `hasData` (boolean): Whether this slot has been initialized
- `liquidCash` (decimal): Current liquid cash in the bank

---

#### 2. Start/Reset Slot
**POST** `/api/slots/{slotId}/start`

Initializes or resets a simulation slot to its starting state.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)

**Response**: `200 OK`
```json
{
  "slotId": 1,
  "gameDay": 0.0,
  "liquidCash": 1000000.00,
  "investedSp500": 0.00,
  "totalAssets": 1000000.00,
  "sp500Price": 100.00,
  "nextDividendDay": 30,
  "nextGrowthDay": 1
}
```

**Response Fields**:
- `slotId` (int): The slot number
- `gameDay` (double): Current simulation day (starts at 0.0)
- `liquidCash` (decimal): Initial liquid cash (typically 1,000,000.00)
- `investedSp500` (decimal): Amount invested in S&P 500 (starts at 0.00)
- `totalAssets` (decimal): Total bank assets (liquid + invested)
- `sp500Price` (decimal): Current S&P 500 share price
- `nextDividendDay` (int): Game day for next dividend payment
- `nextGrowthDay` (int): Game day for next growth event

---

#### 3. Get Bank State
**GET** `/api/slots/{slotId}/bank`

Retrieves the current state of the bank for a specific slot.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)

**Response**: `200 OK`
```json
{
  "slotId": 1,
  "gameDay": 15.5,
  "liquidCash": 950000.00,
  "investedSp500": 50000.00,
  "totalAssets": 1000000.00,
  "sp500Price": 105.00,
  "nextDividendDay": 30,
  "nextGrowthDay": 20
}
```

**Response Fields**: Same as Start/Reset Slot endpoint

---

### Client Management Endpoints

#### 4. List Clients
**GET** `/api/slots/{slotId}/clients`

Retrieves all clients for a specific slot.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "checkingBalance": 5000.00,
    "dailyWithdrawn": 200.00,
    "cardNumber": "1234567890123456",
    "cardExpiry": "12/2025",
    "cardCvv": "123"
  },
  {
    "id": 2,
    "name": "Jane Smith",
    "checkingBalance": 10000.00,
    "dailyWithdrawn": 0.00,
    "cardNumber": "9876543210987654",
    "cardExpiry": "06/2026",
    "cardCvv": "456"
  }
]
```

**Response Fields**:
- `id` (long): Client unique identifier
- `name` (string): Client's full name
- `checkingBalance` (decimal): Current account balance
- `dailyWithdrawn` (decimal): Amount withdrawn today
- `cardNumber` (string): Debit/credit card number
- `cardExpiry` (string): Card expiration date (MM/YYYY)
- `cardCvv` (string): Card security code

---

#### 5. Create Client
**POST** `/api/slots/{slotId}/clients`

Creates a new client account in the specified slot.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)

**Request Body**:
```json
{
  "name": "Alice Johnson"
}
```

**Request Fields**:
- `name` (string, required): Client's full name (max 80 characters, not blank)

**Response**: `200 OK`
```json
{
  "id": 3,
  "name": "Alice Johnson",
  "checkingBalance": 0.00,
  "dailyWithdrawn": 0.00,
  "cardNumber": "1111222233334444",
  "cardExpiry": "03/2027",
  "cardCvv": "789"
}
```

**Response Fields**: Same as List Clients endpoint

---

#### 6. Get Client
**GET** `/api/slots/{slotId}/clients/{clientId}`

Retrieves details for a specific client.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)
- `clientId` (long): The client's unique identifier

**Response**: `200 OK`
```json
{
  "id": 1,
  "name": "John Doe",
  "checkingBalance": 5000.00,
  "dailyWithdrawn": 200.00,
  "cardNumber": "1234567890123456",
  "cardExpiry": "12/2025",
  "cardCvv": "123"
}
```

**Response Fields**: Same as List Clients endpoint

---

#### 7. Get Client Transactions
**GET** `/api/slots/{slotId}/clients/{clientId}/transactions`

Retrieves all transactions for a specific client.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)
- `clientId` (long): The client's unique identifier

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "type": "DEPOSIT",
    "amount": 1000.00,
    "gameDay": 5,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "type": "WITHDRAWAL",
    "amount": 200.00,
    "gameDay": 10,
    "createdAt": "2024-01-15T14:20:00Z"
  }
]
```

**Response Fields**:
- `id` (long): Transaction unique identifier
- `type` (string): Transaction type (`DEPOSIT` or `WITHDRAWAL`)
- `amount` (decimal): Transaction amount
- `gameDay` (int): Game day when transaction occurred
- `createdAt` (timestamp): ISO 8601 timestamp of transaction

---

#### 8. Deposit Money
**POST** `/api/slots/{slotId}/clients/{clientId}/deposit`

Adds money to a client's checking account.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)
- `clientId` (long): The client's unique identifier

**Request Body**:
```json
{
  "amount": 500.00
}
```

**Request Fields**:
- `amount` (decimal, required): Amount to deposit (must be > 0.01, max 12 digits before decimal, 2 after)

**Response**: `200 OK`
```json
{
  "id": 3,
  "type": "DEPOSIT",
  "amount": 500.00,
  "gameDay": 15,
  "createdAt": "2024-01-15T16:45:00Z"
}
```

**Response Fields**: Same as Get Client Transactions endpoint

---

#### 9. Withdraw Money
**POST** `/api/slots/{slotId}/clients/{clientId}/withdraw`

Removes money from a client's checking account.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)
- `clientId` (long): The client's unique identifier

**Request Body**:
```json
{
  "amount": 100.00
}
```

**Request Fields**:
- `amount` (decimal, required): Amount to withdraw (must be > 0.01, max 12 digits before decimal, 2 after)

**Response**: `200 OK`
```json
{
  "id": 4,
  "type": "WITHDRAWAL",
  "amount": 100.00,
  "gameDay": 15,
  "createdAt": "2024-01-15T17:00:00Z"
}
```

**Response Fields**: Same as Get Client Transactions endpoint

**Note**: Withdrawals may fail if the client has insufficient balance or exceeds daily withdrawal limits.

---

### Investment Endpoints

#### 10. Get Investment State
**GET** `/api/slots/{slotId}/investments/sp500`

Retrieves the current S&P 500 investment state for a slot.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)

**Response**: `200 OK`
```json
{
  "liquidCash": 950000.00,
  "investedSp500": 50000.00,
  "sp500Price": 105.00,
  "nextDividendDay": 30,
  "nextGrowthDay": 20,
  "gameDay": 15.5
}
```

**Response Fields**:
- `liquidCash` (decimal): Available cash not invested
- `investedSp500` (decimal): Total amount invested in S&P 500
- `sp500Price` (decimal): Current S&P 500 share price
- `nextDividendDay` (int): Game day for next dividend payment
- `nextGrowthDay` (int): Game day for next growth event
- `gameDay` (double): Current simulation day

---

#### 11. Invest in S&P 500
**POST** `/api/slots/{slotId}/investments/sp500/invest`

Invests money from the bank's liquid cash into S&P 500.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)

**Request Body**:
```json
{
  "amount": 10000.00
}
```

**Request Fields**:
- `amount` (decimal, required): Amount to invest (must be > 0.01, max 12 digits before decimal, 2 after)

**Response**: `200 OK`
```json
{
  "liquidCash": 940000.00,
  "investedSp500": 60000.00,
  "sp500Price": 105.00,
  "nextDividendDay": 30,
  "nextGrowthDay": 20,
  "gameDay": 15.5
}
```

**Response Fields**: Same as Get Investment State endpoint

**Note**: Investment may fail if there is insufficient liquid cash.

---

#### 12. Divest from S&P 500
**POST** `/api/slots/{slotId}/investments/sp500/divest`

Sells S&P 500 investments and converts them back to liquid cash.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)

**Request Body**:
```json
{
  "amount": 5000.00
}
```

**Request Fields**:
- `amount` (decimal, required): Amount to divest (must be > 0.01, max 12 digits before decimal, 2 after)

**Response**: `200 OK`
```json
{
  "liquidCash": 945000.00,
  "investedSp500": 55000.00,
  "sp500Price": 105.00,
  "nextDividendDay": 30,
  "nextGrowthDay": 20,
  "gameDay": 15.5
}
```

**Response Fields**: Same as Get Investment State endpoint

**Note**: Divestment may fail if there is insufficient invested amount.

---

### Chart/Reporting Endpoints

#### 13. Get Client Distribution Chart
**GET** `/api/slots/{slotId}/charts/clients`

Retrieves client distribution data for charting purposes.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)

**Response**: `200 OK`
```json
{
  "labels": ["$0-$1K", "$1K-$5K", "$5K-$10K", "$10K+"],
  "data": [2, 5, 3, 1]
}
```

**Response Fields**:
- `labels` (array of strings): Balance range labels
- `data` (array of integers): Number of clients in each range

---

#### 14. Get Activity Chart
**GET** `/api/slots/{slotId}/charts/activity`

Retrieves transaction activity data for charting purposes.

**Path Parameters**:
- `slotId` (int): The slot number (1, 2, or 3)

**Response**: `200 OK`
```json
{
  "labels": ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"],
  "deposits": [1000, 500, 2000, 300, 1500],
  "withdrawals": [200, 100, 500, 50, 300]
}
```

**Response Fields**:
- `labels` (array of strings): Game day labels
- `deposits` (array of decimals): Deposit amounts per day
- `withdrawals` (array of decimals): Withdrawal amounts per day

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request**: Invalid request data (validation errors)
```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/slots/1/clients"
}
```

**404 Not Found**: Resource not found (slot, client, etc.)
```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Client not found",
  "path": "/api/slots/1/clients/999"
}
```

**500 Internal Server Error**: Server-side error
```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "status": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "path": "/api/slots/1/clients"
}
```

---

## Postman Collection Notes

### Environment Variables
Create a Postman environment with:
- `baseUrl`: `http://localhost:8080`
- `slotId`: `1` (or 2, 3)
- `clientId`: (set after creating a client)

### Common Headers
All requests should include:
```
Content-Type: application/json
```

### Testing Workflow
1. **Start a slot**: `POST /api/slots/1/start`
2. **Create clients**: `POST /api/slots/1/clients`
3. **Perform transactions**: `POST /api/slots/1/clients/{clientId}/deposit` or `/withdraw`
4. **Check bank state**: `GET /api/slots/1/bank`
5. **Invest funds**: `POST /api/slots/1/investments/sp500/invest`
6. **View charts**: `GET /api/slots/1/charts/clients` or `/charts/activity`

---

## Data Types Reference

- **BIGINT**: 64-bit integer (Java `Long`)
- **INT**: 32-bit integer (Java `Integer`)
- **DECIMAL(19,2)**: Fixed-point decimal with 19 total digits, 2 after decimal point (Java `BigDecimal`)
- **DOUBLE PRECISION**: 64-bit floating point (Java `Double`)
- **VARCHAR(n)**: Variable-length string with max length n
- **TIMESTAMP**: Date and time with timezone (Java `Instant`)

---

*Last Updated: Generated from codebase analysis*


