# Banking Sim API – Developer Guide

Quick start

Prerequisites: Java 17 (verify with java -version)

Run the application:
   ./gradlew bootRun -x test --no-daemon

Or if on Windows:
   gradlew.bat bootRun -x test --no-daemon

Access the application:
API base URL: http://localhost:8080/api

Web interface: http://localhost:8080/banking/alkicorp_banking_sim.html

H2 Console (database): http://localhost:8080/h2-console

Additional commands
Run tests: ./gradlew test

Component Health Check: Run the comprehensive component health check test suite to verify all services are working:
   ./gradlew test --tests ComponentHealthCheckTest --no-daemon

This test suite validates Liquibase/Database, SimulationService, BankService, ClientService, InvestmentService, ChartService, and integration workflows. It displays formatted console output with pass/fail indicators and a summary report.

**Liquibase Verification**: The test provides detailed Liquibase status reporting:
- Verifies database connection and displays connection details (database type, URL)
- Confirms Liquibase changelog table (`DATABASECHANGELOG`) exists
- Lists all applied changesets with details (ID, author, filename, execution type)
- Verifies all required database tables exist (`BANK_STATE`, `CLIENT`, `CLIENT_TRANSACTION`, `INVESTMENT_EVENT`)
- Tests database operations to ensure everything is working correctly

The test also includes debug logging (prefixed with `[DEBUG]`) that shows the execution flow, including when `resetSlot()` is called, whether existing BankState records are found, and the state of entities before and after save operations.

Stop the server: Use Ctrl+C in the terminal, or find the process and kill it:
  lsof -iTCP:8080 -sTCP:LISTEN  # Find the process  kill <pid>                     # Kill it



### Run with: http://localhost:8080/banking/alkicorp_banking_sim.html
## Overview
- Purpose: REST API that drives the Alkicorp banking simulator. It models bank “slots” (independent simulation timelines), clients and their checking accounts, transactions, and simple S&P 500 investment actions.
- Runtime stack: Java 17, Spring Boot 4.0, H2 file database (`./data/banking-sim`), Liquibase for schema management, JPA/Hibernate for persistence.
- Default port: `8080`. Base path for the API is `/api`.

## High-level architecture
- Entry point: `BankingSimApiApplication` boots Spring, auto-configures web + JPA + Liquibase.
- Web layer (controllers):
  - `SlotController` — list slots, start/reset a slot, fetch current bank state.
  - `ClientController` — CRUD-ish for clients and their transactions (deposit/withdraw).
  - `BankExtrasController` — investment actions (S&P 500 invest/divest) and chart data.
  - `RestExceptionHandler` — converts validation and status exceptions to HTTP responses.
- Service layer:
  - `SimulationService` — manages time advancement and current `BankState` per slot.
  - `BankService` — orchestrates bank state reads/resets and slot summaries.
  - `ClientService` — creates clients, records transactions, enforces limits, generates debit card data.
  - `InvestmentService` — adjusts investment balances and market price progression.
  - `ChartService` — aggregates counts/series for client distribution and activity charts.
  - `SimulationConstants` — tunable constants (withdrawal limits, simulation steps, etc.).
- Data layer:
  - JPA entities: `BankState`, `Client`, `Transaction`, `InvestmentEvent`.
  - Repositories: `BankStateRepository`, `ClientRepository`, `TransactionRepository`, `InvestmentEventRepository`.

## Data model (summary)
- `BankState` — per-slot state: cash, invested SP500 amount, price, next dividend/growth days, game day, timestamps.
- `Client` — belongs to a `BankState`/slot; holds balances and debit card info; `id` auto-increment.
- `Transaction` — belongs to a client; type (deposit/withdrawal), amount, game day, timestamp.
- `InvestmentEvent` — records SP500 actions; amount, asset, type, game day, timestamp.

## Liquibase and migrations
- ChangeLog entry point: `src/main/resources/db/changelog/db.changelog-master.yaml` includes `db.changelog-1.0.yaml`.
- Change sets (ordered):
  1. Create `bank_state`.
  2. Create `client` (auto-increment `id`).
  3. Create `client_transaction`.
  4. Create `investment_event`.
  5. Seed initial `bank_state` rows for slots 1–3.
  6. Patch `bank_state.id` auto-increment (preconditioned).
  7. Patch `client.id` auto-increment (preconditioned) — fixes the `NULL not allowed for column "ID"` insertion error.
  8. Patch `client_transaction.id` auto-increment (preconditioned).
  9. Patch `investment_event.id` auto-increment (preconditioned).
- How it runs: Because `spring-boot-starter-liquibase` is on the classpath, Spring Boot auto-configures `SpringLiquibase` at startup. On application boot, Liquibase locks the DB, applies pending change sets, and logs to `PUBLIC.DATABASECHANGELOG`. No explicit code calls are required; configuration is implicit via the starter.
- DB location: H2 file at `./data/banking-sim.mv.db`. Only one process can hold the file lock at a time.
- Resetting DB (dev): stop the app, delete `./data/banking-sim*`, restart to re-run migrations and reseed.
- **Verifying Liquibase status**: Run `./gradlew test --tests ComponentHealthCheckTest.testLiquibaseAndDatabase --no-daemon` to see detailed Liquibase verification including connection status, applied changesets, and table existence checks.

## Dependencies (why they exist)
- `spring-boot-starter-web`: REST controllers and embedded Tomcat.
- `spring-boot-starter-data-jpa`: JPA/Hibernate repositories and transaction management.
- `spring-boot-starter-liquibase`: migration runner at startup.
- `spring-boot-starter-validation`: Jakarta Bean Validation for request DTOs.
- `spring-boot-starter`: core Spring Boot autoconfiguration, logging.
- `spring-boot-starter-jdbc`: brought transitively for datasource support.
- `H2` (`com.h2database:h2`): lightweight embedded/file database for local dev.
- `Lombok`: reduces boilerplate (getters/setters/builders); annotation processor configured.
- `spring-boot-devtools` (devOnly): hot reload in IDE/local runs.
- Test deps: `spring-boot-starter-test`, JUnit Platform launcher.

## Runtime instructions for developers
1. Prereqs: Java 17 available on PATH. No need to install Gradle; wrapper is included.
2. Start API locally:
   - `./gradlew bootRun -x test --no-daemon`
   - API served on `http://localhost:8080`.
3. Stop the server: `kill <pid>` (find with `lsof -iTCP:8080 -sTCP:LISTEN`).
4. Run tests: `./gradlew test`.
5. Sample calls (slot 1):
   - List slots: `GET /api/slots`
   - Start/reset slot: `POST /api/slots/1/start`
   - Get bank state: `GET /api/slots/1/bank`
   - Create client: `POST /api/slots/1/clients` with `{"name":"Alice"}`
   - Deposit: `POST /api/slots/1/clients/{clientId}/deposit` with `{"amount":100}`
   - Withdraw: `POST /api/slots/1/clients/{clientId}/withdraw` with `{"amount":50}`
   - Investment state: `GET /api/slots/1/investments/sp500`
   - Invest: `POST /api/slots/1/investments/sp500/invest` with `{"amount":500}`
   - Charts: `GET /api/slots/1/charts/clients` and `/api/slots/1/charts/activity`
6. DB inspection (when app stopped): `java -cp ~/.gradle/caches/modules-2/files-2.1/com.h2database/h2/2.4.240/.../h2-2.4.240.jar org.h2.tools.Shell -url jdbc:h2:file:./data/banking-sim -user SA`.

## What’s finalized vs. placeholder
- Finalized behaviors:
  - Core CRUD and transaction flows for clients.
  - SP500 invest/divest mechanics and chart aggregation endpoints.
  - Liquibase-managed schema, including recent auto-increment fixes for `bank_state.id` and `client.id`.
  - Seed data for bank_state slots 1–3 (intended starting balances).
- Placeholder / assumptions:
  - Slots are hardcoded to IDs 1–3 in `SlotController`; expanding slots will need code + data changes.
  - Simulation constants are fixed in `SimulationConstants`; adjust as needed for gameplay tuning.
  - No authentication/authorization layer; suitable for classroom/demo use, not production.
  - H2 file DB is for local/dev only; production would need a real RDBMS + updated JDBC URL.

## Known issues and troubleshooting
- Browser console `content_script.js ... control` errors: from a browser extension, not this API. Safe to ignore when testing the backend.
- 404 after client creation attempt: typically the UI surfacing a failed fetch; the root cause was a 500 from missing auto-increment on `client.id`, now fixed by change set `7-fix-client-id-auto-increment`.
- H2 “Database may be already in use” error: occurs if multiple app instances or external tools hold the DB lock. Stop other processes or remove the DB file after stopping the app.
- If migrations get out of sync after manual DB edits, reset the DB (delete `./data/banking-sim*`) and restart to replay Liquibase change sets.

## How the program runs (request flow)
1. HTTP request hits a controller under `/api/...`.
2. Controller delegates to a service; services often call `SimulationService` to advance or read slot state.
3. Services use repositories (Spring Data JPA) to persist/fetch entities. Transactions are managed via `@Transactional`.
4. Entities map to tables created by Liquibase; Hibernate uses `IDENTITY` to obtain auto-generated IDs.
5. Responses are serialized to JSON via Spring MVC/Jackson.

## Observability and error handling
- Logging: Spring Boot default logging (Logback) to console. Liquibase logs migration progress at startup.
- Validation errors: `400 Bad Request` with message (from `ValidationException` or `@Valid` binding).
- Not found: `404` via `ResponseStatusException`.
- Unhandled errors bubble as `500` with a short message; stack traces appear in server logs for diagnostics.

## Things to watch for when extending
- Always add schema changes via Liquibase change sets; keep `db.changelog-master.yaml` as the only include root.
- When adding new endpoints, use DTOs with `@Valid` for inputs and extend `RestExceptionHandler` if custom handling is needed.
- If moving off H2, update the JDBC URL/driver in `application.properties` (currently defaults are inside Spring Boot) and review Liquibase/Hibernate dialects.
