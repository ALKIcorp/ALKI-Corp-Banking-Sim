# Project Command Endpoint – Banking Sim API (Transactional Web Apps)

> Class note for Vanier College TW apps course. Individual project built in IntelliJ with Spring Boot. Source of truth remains `docs/README.md`.

## What this project does
- REST API that powers the Alkicorp banking simulator UI at `http://localhost:8080/banking/alkicorp_banking_sim.html`.
- Models per-slot timelines (slots 1–3), clients, checking balances, transactions, and a simple S&P 500 invest/divest loop.
- Stack: Java 17, Spring Boot 4, H2 file DB (`./data/banking-sim`), Liquibase, Spring Data JPA, Lombok.

## How to run (dev)
- CLI: `./gradlew bootRun -x test --no-daemon` (API on `http://localhost:8080`).
- IntelliJ: run `BankingSimApiApplication` (ensure Java 17 SDK). Stop app before deleting `./data/banking-sim*` to reset DB.
- Tests: `./gradlew test`.

## API map (key endpoints)
- Slots: `GET /api/slots`, `POST /api/slots/{slotId}/start`, `GET /api/slots/{slotId}/bank`.
- Clients: `GET /api/slots/{slotId}/clients`, `POST /api/slots/{slotId}/clients` (`{"name":"Alice"}`), `GET /api/slots/{slotId}/clients/{clientId}`, `GET /api/slots/{slotId}/clients/{clientId}/transactions`.
- Money moves: `POST /api/slots/{slotId}/clients/{clientId}/deposit|withdraw` with `{"amount":100}`.
- Investments: `GET /api/slots/{slotId}/investments/sp500`, `POST /api/slots/{slotId}/investments/sp500/invest|divest` with `{"amount":500}`.
- Charts: `GET /api/slots/{slotId}/charts/clients` (distribution), `GET /api/slots/{slotId}/charts/activity`.
- Error handling: `RestExceptionHandler` returns 400 for validation and propagates `ResponseStatusException` codes.

## Data + migrations
- Tables: `bank_state` (per-slot balances + SP500 price, next dividend/growth days), `client` (belongs to bank_state), `client_transaction`, `investment_event`.
- Liquibase entry: `src/main/resources/db/changelog/db.changelog-master.yaml` includes `db.changelog-1.0.yaml` (creates tables, seeds slots 1–3, fixes auto-increment on `bank_state.id` and `client.id`). Runs automatically on startup.
- DB location: H2 file `./data/banking-sim.mv.db`; only one process can hold the lock. Delete `./data/banking-sim*` (with app stopped) to reseed.

## Code structure (high level)
- Entry: `BankingSimApiApplication`.
- Controllers: `SlotController`, `ClientController`, `BankExtrasController`, `RestExceptionHandler`.
- Services: `SimulationService` (advances time/slot state), `BankService`, `ClientService` (daily withdraw cap + debit card info), `InvestmentService`, `ChartService`; constants in `SimulationConstants`.
- Persistence: JPA entities `BankState`, `Client`, `Transaction`, `InvestmentEvent` + repositories per entity.

## Troubleshooting / notes
- Browser console extension noise (`content_script.js`) is unrelated to backend.
- 404 after client creation usually means 500 from DB auto-increment mismatch—already patched via Liquibase change set 7.
- H2 "Database may be already in use" → stop other app instances or remove DB files after stopping.

## Next steps / ideas
- Expand slots beyond 1–3 (adjust controller + seed data).
- Add auth if moving beyond classroom use.
- Tune gameplay via `SimulationConstants` and enrich charts.
