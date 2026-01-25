package com.alkicorp.bankingsim;

import com.alkicorp.bankingsim.auth.model.User;
import com.alkicorp.bankingsim.auth.repository.UserRepository;
import com.alkicorp.bankingsim.model.enums.TransactionType;
import com.alkicorp.bankingsim.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.io.FileWriter;
import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@SpringBootTest
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class ComponentHealthCheckTest {

    @Autowired
    private SimulationService simulationService;

    @Autowired
    private BankService bankService;

    @Autowired
    private ClientService clientService;

    @Autowired
    private InvestmentService investmentService;

    @Autowired
    private ChartService chartService;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    private static final TestReporter reporter = new TestReporter();
    private static final int TEST_SLOT_ID = 999; // Use a test slot that won't interfere
    private static final String TEST_USERNAME = "test-user";
    private static final String TEST_EMAIL = "test-user@example.com";

    private User testUser;

    @BeforeAll
    static void setup() {
        reporter.printHeader("BANKING SIM API - COMPONENT HEALTH CHECK");
        reporter.printSeparator();
    }

    @BeforeEach
    void setAuthContext() {
        testUser = userRepository.findByUsernameIgnoreCase(TEST_USERNAME)
            .orElseGet(() -> {
                User user = new User();
                user.setUsername(TEST_USERNAME);
                user.setEmail(TEST_EMAIL);
                user.setPasswordHash("test-password-hash");
                return userRepository.save(user);
            });
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            testUser.getUsername(),
            null,
            List.of()
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void clearAuthContext() {
        SecurityContextHolder.clearContext();
    }
    @AfterAll
    static void teardown() {
        reporter.printSeparator();
        reporter.printSummary();
    }

    @Test
    @Order(1)
    @DisplayName("✓ Liquibase & Database")
    void testLiquibaseAndDatabase() {
        // #region agent log
        System.out.println("\n[TEST START] Testing Liquibase & Database (using test slot " + TEST_SLOT_ID + ")");
        try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H2\",\"location\":\"ComponentHealthCheckTest.testLiquibaseAndDatabase:52\",\"message\":\"Test entry\",\"data\":{\"testName\":\"testLiquibaseAndDatabase\",\"slotId\":\"" + TEST_SLOT_ID + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {}
        // #endregion
        reporter.startTest("Liquibase & Database");
        try {
            // Check database connection
            System.out.println("  → Checking database connection...");
            try (Connection conn = dataSource.getConnection()) {
                String dbUrl = conn.getMetaData().getURL();
                String dbProduct = conn.getMetaData().getDatabaseProductName();
                System.out.println("  ✓ Database connected: " + dbProduct + " at " + dbUrl);
                reporter.pass("Database connection successful (" + dbProduct + ")");
            } catch (java.sql.SQLException sqlEx) {
                throw new RuntimeException("Failed to get database connection: " + sqlEx.getMessage(), sqlEx);
            }

            // Check if Liquibase changelog table exists
            System.out.println("  → Checking if Liquibase changelog table exists...");
            List<Map<String, Object>> tables = jdbcTemplate.queryForList(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'databasechangelog'"
            );
            if (tables.isEmpty()) {
                System.out.println("  ✗ Liquibase changelog table NOT found - Liquibase may not have run");
                reporter.fail("Liquibase changelog table not found");
            } else {
                System.out.println("  ✓ Liquibase changelog table exists");
                reporter.pass("Liquibase changelog table exists");
            }

            // Query applied changesets
            System.out.println("  → Checking what Liquibase changesets have been applied...");
            List<Map<String, Object>> changesets = jdbcTemplate.queryForList(
                "SELECT id, author, filename, exectype, md5sum FROM public.databasechangelog ORDER BY dateexecuted"
            );
            if (changesets.isEmpty()) {
                System.out.println("  ✗ No changesets found in changelog table");
                reporter.fail("No Liquibase changesets applied");
            } else {
                System.out.println("  ✓ Found " + changesets.size() + " applied changeset(s):");
                for (Map<String, Object> cs : changesets) {
                    String id = (String) cs.get("ID");
                    String author = (String) cs.get("AUTHOR");
                    String filename = (String) cs.get("FILENAME");
                    String execType = (String) cs.get("EXECTYPE");
                    System.out.println("    - " + id + " by " + author + " (" + filename + ") - " + execType);
                }
                reporter.pass("Liquibase changesets applied (" + changesets.size() + " total)");
            }

            // Check if required tables exist
            System.out.println("  → Verifying required database tables exist...");
            String[] requiredTables = {"bank_state", "client", "client_transaction", "investment_event"};
            int foundTables = 0;
            for (String tableName : requiredTables) {
                List<Map<String, Object>> tableCheck = jdbcTemplate.queryForList(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?",
                    tableName
                );
                if (!tableCheck.isEmpty()) {
                    System.out.println("    ✓ Table '" + tableName + "' exists");
                    foundTables++;
                } else {
                    System.out.println("    ✗ Table '" + tableName + "' NOT found");
                }
            }
            if (foundTables == requiredTables.length) {
                System.out.println("  ✓ All " + requiredTables.length + " required tables exist");
                reporter.pass("All required tables exist (" + foundTables + "/" + requiredTables.length + ")");
            } else {
                System.out.println("  ✗ Only " + foundTables + "/" + requiredTables.length + " required tables found");
                reporter.fail("Missing tables: " + foundTables + "/" + requiredTables.length + " found");
            }

            // Test database operations by resetting a slot
            System.out.println("  → Testing database operations (resetting test slot)...");
            simulationService.resetSlot(testUser, TEST_SLOT_ID);
            System.out.println("  ✓ Database operations working correctly");
            reporter.pass("Database operations successful");

        } catch (Exception e) {
            // #region agent log
            System.out.println("  ✗ ERROR: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
                fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H1,H2,H3\",\"location\":\"ComponentHealthCheckTest.testLiquibaseAndDatabase:60\",\"message\":\"Exception caught\",\"data\":{\"exception\":\"" + e.getClass().getSimpleName() + "\",\"message\":\"" + e.getMessage().replace("\"", "'") + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
            } catch (IOException ex) {}
            // #endregion
            reporter.fail("Database/Liquibase error: " + e.getMessage());
            throw e;
        }
    }

    @Test
    @Order(2)
    @DisplayName("✓ SimulationService")
    void testSimulationService() {
        // #region agent log
        System.out.println("\n[TEST START] Testing SimulationService (using test slot " + TEST_SLOT_ID + ")");
        try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H2\",\"location\":\"ComponentHealthCheckTest.testSimulationService:68\",\"message\":\"Test entry\",\"data\":{\"testName\":\"testSimulationService\",\"slotId\":\"" + TEST_SLOT_ID + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {}
        // #endregion
        reporter.startTest("SimulationService");
        try {
            // Test resetSlot
            var state = simulationService.resetSlot(testUser, TEST_SLOT_ID);
            Assertions.assertNotNull(state);
            Assertions.assertEquals(TEST_SLOT_ID, state.getSlotId());
            reporter.pass("resetSlot() - creates/resets bank state correctly");

            // Test getAndAdvanceState
            var advancedState = simulationService.getAndAdvanceState(testUser, TEST_SLOT_ID);
            Assertions.assertTrue(advancedState.isPresent());
            Assertions.assertNotNull(advancedState.get().getGameDay());
            reporter.pass("getAndAdvanceState() - advances time correctly");

            // Test listAndAdvanceSlots
            var states = simulationService.listAndAdvanceSlots(testUser, List.of(TEST_SLOT_ID));
            Assertions.assertFalse(states.isEmpty());
            reporter.pass("listAndAdvanceSlots() - processes multiple slots");
        } catch (Exception e) {
            reporter.fail("SimulationService error: " + e.getMessage());
            throw e;
        }
    }

    @Test
    @Order(3)
    @DisplayName("✓ BankService")
    void testBankService() {
        // #region agent log
        System.out.println("\n[TEST START] Testing BankService (using test slot " + TEST_SLOT_ID + ")");
        try (FileWriter fw = new FileWriter("/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log", true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H2\",\"location\":\"ComponentHealthCheckTest.testBankService:96\",\"message\":\"Test entry\",\"data\":{\"testName\":\"testBankService\",\"slotId\":\"" + TEST_SLOT_ID + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {}
        // #endregion
        reporter.startTest("BankService");
        try {
            simulationService.resetSlot(testUser, TEST_SLOT_ID);

            // Test getBankState
            var bankState = bankService.getBankState(TEST_SLOT_ID);
            Assertions.assertNotNull(bankState);
            Assertions.assertEquals(TEST_SLOT_ID, bankState.getSlotId());
            reporter.pass("getBankState() - retrieves state correctly");

            // Test resetAndGetState
            var resetState = bankService.resetAndGetState(TEST_SLOT_ID);
            Assertions.assertNotNull(resetState);
            Assertions.assertEquals(0.0, resetState.getGameDay());
            reporter.pass("resetAndGetState() - resets and returns state");

            // Test getSlotSummaries
            var summaries = bankService.getSlotSummaries(List.of(TEST_SLOT_ID));
            Assertions.assertFalse(summaries.isEmpty());
            Assertions.assertEquals(TEST_SLOT_ID, summaries.get(0).getSlotId());
            reporter.pass("getSlotSummaries() - returns slot summaries");
        } catch (Exception e) {
            reporter.fail("BankService error: " + e.getMessage());
            throw e;
        }
    }

    @Test
    @Order(4)
    @DisplayName("✓ ClientService")
    void testClientService() {
        reporter.startTest("ClientService");
        try {
            simulationService.resetSlot(testUser, TEST_SLOT_ID);

            // Test createClient
            var client = clientService.createClient(TEST_SLOT_ID, "Test Client");
            Assertions.assertNotNull(client);
            Assertions.assertNotNull(client.getId());
            Assertions.assertEquals("Test Client", client.getName());
            Assertions.assertNotNull(client.getCardNumber());
            reporter.pass("createClient() - creates client with debit card");

            // Test getClient
            var retrieved = clientService.getClient(TEST_SLOT_ID, client.getId());
            Assertions.assertEquals(client.getId(), retrieved.getId());
            reporter.pass("getClient() - retrieves client by ID");

            // Test getClients
            var clients = clientService.getClients(TEST_SLOT_ID);
            Assertions.assertFalse(clients.isEmpty());
            reporter.pass("getClients() - retrieves all clients for slot");

            // Test deposit
            var deposit = clientService.deposit(TEST_SLOT_ID, client.getId(), new BigDecimal("100.00"));
            Assertions.assertNotNull(deposit);
            Assertions.assertEquals(TransactionType.DEPOSIT, deposit.getType());
            var updatedClient = clientService.getClient(TEST_SLOT_ID, client.getId());
            Assertions.assertTrue(updatedClient.getCheckingBalance().compareTo(new BigDecimal("100.00")) == 0);
            reporter.pass("deposit() - processes deposits correctly");

            // Test withdraw
            var withdrawal = clientService.withdraw(TEST_SLOT_ID, client.getId(), new BigDecimal("50.00"));
            Assertions.assertNotNull(withdrawal);
            Assertions.assertEquals(TransactionType.WITHDRAWAL, withdrawal.getType());
            updatedClient = clientService.getClient(TEST_SLOT_ID, client.getId());
            Assertions.assertTrue(updatedClient.getCheckingBalance().compareTo(new BigDecimal("50.00")) == 0);
            reporter.pass("withdraw() - processes withdrawals correctly");

            // Test getTransactions
            var transactions = clientService.getTransactions(client.getId(), TEST_SLOT_ID);
            Assertions.assertTrue(transactions.size() >= 2);
            reporter.pass("getTransactions() - retrieves transaction history");

            // Test validation - blank name
            try {
                clientService.createClient(TEST_SLOT_ID, "   ");
                reporter.fail("createClient() - should reject blank name");
            } catch (Exception e) {
                reporter.pass("createClient() - validates blank name");
            }

            // Test validation - insufficient funds
            try {
                clientService.withdraw(TEST_SLOT_ID, client.getId(), new BigDecimal("1000.00"));
                reporter.fail("withdraw() - should reject insufficient funds");
            } catch (Exception e) {
                reporter.pass("withdraw() - validates insufficient funds");
            }
        } catch (Exception e) {
            reporter.fail("ClientService error: " + e.getMessage());
            throw e;
        }
    }

    @Test
    @Order(5)
    @DisplayName("✓ InvestmentService")
    void testInvestmentService() {
        reporter.startTest("InvestmentService");
        try {
            simulationService.resetSlot(testUser, TEST_SLOT_ID);

            // Test getInvestmentState
            var state = investmentService.getInvestmentState(TEST_SLOT_ID);
            Assertions.assertNotNull(state);
            reporter.pass("getInvestmentState() - retrieves state");

            // Test investInSp500
            var investedState = investmentService.investInSp500(TEST_SLOT_ID, new BigDecimal("10000.00"));
            Assertions.assertNotNull(investedState);
            Assertions.assertTrue(investedState.getInvestedSp500().compareTo(new BigDecimal("10000.00")) == 0);
            reporter.pass("investInSp500() - processes investments");

            // Test divestFromSp500
            var divestedState = investmentService.divestFromSp500(TEST_SLOT_ID, new BigDecimal("5000.00"));
            Assertions.assertTrue(divestedState.getInvestedSp500().compareTo(new BigDecimal("5000.00")) == 0);
            reporter.pass("divestFromSp500() - processes divestments");

            // Test validation - insufficient cash
            try {
                investmentService.investInSp500(TEST_SLOT_ID, new BigDecimal("200000.00"));
                reporter.fail("investInSp500() - should reject insufficient cash");
            } catch (Exception e) {
                reporter.pass("investInSp500() - validates insufficient cash");
            }

            // Test validation - divest more than invested
            try {
                investmentService.divestFromSp500(TEST_SLOT_ID, new BigDecimal("20000.00"));
                reporter.fail("divestFromSp500() - should reject over-divestment");
            } catch (Exception e) {
                reporter.pass("divestFromSp500() - validates over-divestment");
            }
        } catch (Exception e) {
            reporter.fail("InvestmentService error: " + e.getMessage());
            throw e;
        }
    }

    @Test
    @Order(6)
    @DisplayName("✓ ChartService")
    void testChartService() {
        reporter.startTest("ChartService");
        try {
            simulationService.resetSlot(testUser, TEST_SLOT_ID);

            // Create some test data
            var client1 = clientService.createClient(TEST_SLOT_ID, "Alice");
            var client2 = clientService.createClient(TEST_SLOT_ID, "Bob");
            clientService.deposit(TEST_SLOT_ID, client1.getId(), new BigDecimal("500.00"));
            clientService.deposit(TEST_SLOT_ID, client2.getId(), new BigDecimal("300.00"));
            clientService.withdraw(TEST_SLOT_ID, client1.getId(), new BigDecimal("100.00"));

            // Test getClientDistribution
            var distribution = chartService.getClientDistribution(TEST_SLOT_ID);
            Assertions.assertNotNull(distribution);
            Assertions.assertNotNull(distribution.getClients());
            Assertions.assertTrue(distribution.getClients().size() >= 2);
            reporter.pass("getClientDistribution() - aggregates client balances");

            // Test getActivityChart
            var activityChart = chartService.getActivityChart(TEST_SLOT_ID);
            Assertions.assertNotNull(activityChart);
            Assertions.assertNotNull(activityChart.getDays());
            Assertions.assertNotNull(activityChart.getCumulativeDeposits());
            Assertions.assertNotNull(activityChart.getCumulativeWithdrawals());
            reporter.pass("getActivityChart() - generates activity data");
        } catch (Exception e) {
            reporter.fail("ChartService error: " + e.getMessage());
            throw e;
        }
    }

    @Test
    @Order(7)
    @DisplayName("✓ Integration Test")
    void testIntegration() {
        reporter.startTest("Integration Test");
        try {
            simulationService.resetSlot(testUser, TEST_SLOT_ID);

            // Full workflow: create client, deposit, invest, withdraw
            var client = clientService.createClient(TEST_SLOT_ID, "Integration Test Client");
            clientService.deposit(TEST_SLOT_ID, client.getId(), new BigDecimal("1000.00"));
            investmentService.investInSp500(TEST_SLOT_ID, new BigDecimal("5000.00"));
            clientService.withdraw(TEST_SLOT_ID, client.getId(), new BigDecimal("100.00"));

            var finalState = bankService.getBankState(TEST_SLOT_ID);
            Assertions.assertNotNull(finalState);
            Assertions.assertTrue(finalState.getLiquidCash().compareTo(BigDecimal.ZERO) > 0);
            Assertions.assertTrue(finalState.getInvestedSp500().compareTo(BigDecimal.ZERO) > 0);

            reporter.pass("Full workflow - client operations + investments work together");
        } catch (Exception e) {
            reporter.fail("Integration test error: " + e.getMessage());
            throw e;
        }
    }

    // Test Reporter utility class
    static class TestReporter {
        private final List<TestResult> results = new ArrayList<>();
        private String currentTest = "";

        void printHeader(String title) {
            System.out.println("\n" + "=".repeat(80));
            System.out.println("  " + title);
            System.out.println("=".repeat(80) + "\n");
        }

        void printSeparator() {
            System.out.println("-".repeat(80));
        }

        void startTest(String testName) {
            currentTest = testName;
            System.out.println("\n[TEST] " + testName);
            System.out.println("-".repeat(80));
        }

        void pass(String message) {
            System.out.println("  ✓ " + message);
            results.add(new TestResult(currentTest, true, message));
        }

        void fail(String message) {
            System.out.println("  ✗ " + message);
            results.add(new TestResult(currentTest, false, message));
        }

        void printSummary() {
            long passed = results.stream().filter(r -> r.passed).count();
            long failed = results.stream().filter(r -> !r.passed).count();
            long total = results.size();

            System.out.println("\n" + "=".repeat(80));
            System.out.println("  TEST SUMMARY");
            System.out.println("=".repeat(80));
            System.out.printf("  Total Tests: %d\n", total);
            System.out.printf("  ✓ Passed:    %d\n", passed);
            System.out.printf("  ✗ Failed:    %d\n", failed);
            System.out.printf("  Success Rate: %.1f%%\n", (passed * 100.0 / total));
            System.out.println("=".repeat(80) + "\n");

            if (failed > 0) {
                System.out.println("FAILED TESTS:");
                results.stream()
                    .filter(r -> !r.passed)
                    .forEach(r -> System.out.println("  ✗ " + r.testName + ": " + r.message));
                System.out.println();
            }
        }

        record TestResult(String testName, boolean passed, String message) {}
    }
}

