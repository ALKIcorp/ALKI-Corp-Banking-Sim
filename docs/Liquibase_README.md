# Database Console Access

How to access and query the H2 database from the terminal.

## Quick Start

1. **Stop the application** (if running):
   ```bash
   lsof -tiTCP:8080 -sTCP:LISTEN | xargs kill
   ```

2. **Navigate to project directory**:
   ```bash
   cd /Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api
   ```

3. **Find H2 JAR and connect**:
   ```bash
   H2_JAR=$(find ~/.gradle/caches -name "h2-*.jar" 2>/dev/null | head -1)
   java -cp "$H2_JAR" org.h2.tools.Shell -url jdbc:h2:file:./data/banking-sim -user sa
   ```

4. **Run SQL queries** (once connected):
   ```sql
   SHOW TABLES;
   SELECT * FROM BANK_STATE;
   SELECT * FROM CLIENT;
   SELECT * FROM CLIENT_TRANSACTION;
   SELECT * FROM INVESTMENT_EVENT;
   SELECT * FROM DATABASECHANGELOG;
   ```

5. **Exit**: Type `quit` or `exit`

## Common Queries

```sql
-- List all tables
SHOW TABLES;

-- Check Liquibase changesets
SELECT ID, AUTHOR, FILENAME FROM DATABASECHANGELOG ORDER BY DATEEXECUTED;

-- Row counts
SELECT 'BANK_STATE' as TABLE_NAME, COUNT(*) FROM BANK_STATE
UNION ALL SELECT 'CLIENT', COUNT(*) FROM CLIENT
UNION ALL SELECT 'CLIENT_TRANSACTION', COUNT(*) FROM CLIENT_TRANSACTION;

-- Slot 1 data
SELECT * FROM BANK_STATE WHERE slot_id = 1;
SELECT * FROM CLIENT WHERE slot_id = 1;
```

## Web Console (While App is Running)

1. Start app: `./gradlew bootRun -x test --no-daemon`
2. Open: `http://localhost:8080/h2-console`
3. Connect with:
   - **JDBC URL**: `jdbc:h2:file:./data/banking-sim`
   - **Username**: `sa`
   - **Password**: (empty)
