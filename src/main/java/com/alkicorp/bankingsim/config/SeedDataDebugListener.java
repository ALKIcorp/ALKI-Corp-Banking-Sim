package com.alkicorp.bankingsim.config;

import com.alkicorp.bankingsim.repository.BankStateRepository;
import com.alkicorp.bankingsim.repository.ClientRepository;
import java.io.FileWriter;
import java.io.IOException;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SeedDataDebugListener {

    private static final String LOG_PATH = "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log";

    private final DataSource dataSource;
    private final ClientRepository clientRepository;
    private final BankStateRepository bankStateRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        // #region agent log
        try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H1,H2,H3,H4,H5\",\"location\":\"SeedDataDebugListener.onApplicationReady\",\"message\":\"Application ready - checking database state\",\"data\":{\"port\":8080,\"status\":\"ready\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {}
        
        // Check Liquibase changelog for changeset 10 - Fixed SQL syntax for H2
        try {
            JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
            var changeset = jdbcTemplate.queryForList(
                "SELECT ID, AUTHOR, EXECTYPE, MD5SUM, ERRORMESSAGE, DATEEXECUTED FROM DATABASECHANGELOG WHERE ID = '10-seed-slot-1-data' ORDER BY DATEEXECUTED DESC FETCH FIRST 1 ROW ONLY"
            );
            if (changeset.isEmpty()) {
                try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
                    fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H1\",\"location\":\"SeedDataDebugListener.onApplicationReady\",\"message\":\"Changeset 10-seed-slot-1-data NOT found in changelog\",\"data\":{\"found\":false},\"timestamp\":" + System.currentTimeMillis() + "}\n");
                } catch (IOException e) {}
            } else {
                var cs = changeset.get(0);
                try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
                    fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H1\",\"location\":\"SeedDataDebugListener.onApplicationReady\",\"message\":\"Changeset 10-seed-slot-1-data found in changelog\",\"data\":{\"execType\":\"" + cs.get("EXECTYPE") + "\",\"error\":\"" + (cs.get("ERRORMESSAGE") != null ? cs.get("ERRORMESSAGE").toString().replace("\"", "\\\"") : "none") + "\",\"dateExecuted\":\"" + cs.get("DATEEXECUTED") + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
                } catch (IOException e) {}
            }
        } catch (Exception e) {
            try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
                fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H1\",\"location\":\"SeedDataDebugListener.onApplicationReady\",\"message\":\"Error checking changelog\",\"data\":{\"error\":\"" + e.getMessage().replace("\"", "\\\"") + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
            } catch (IOException ex) {}
        }
        
        // Check client count for slot 1
        try {
            int clientCount = clientRepository.findBySlotId(1).size();
            try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
                fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H2\",\"location\":\"SeedDataDebugListener.onApplicationReady\",\"message\":\"Client count for slot 1\",\"data\":{\"slotId\":1,\"clientCount\":" + clientCount + "},\"timestamp\":" + System.currentTimeMillis() + "}\n");
            } catch (IOException e) {}
        } catch (Exception e) {
            try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
                fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H2\",\"location\":\"SeedDataDebugListener.onApplicationReady\",\"message\":\"Error checking client count\",\"data\":{\"error\":\"" + e.getMessage().replace("\"", "\\\"") + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
            } catch (IOException ex) {}
        }
        
        // Check bank_state for slot 1
        try {
            var bankStateOpt = bankStateRepository.findBySlotId(1);
            if (bankStateOpt.isPresent()) {
                var bs = bankStateOpt.get();
                try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
                    fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H5\",\"location\":\"SeedDataDebugListener.onApplicationReady\",\"message\":\"Bank state for slot 1 exists\",\"data\":{\"slotId\":1,\"liquidCash\":\"" + bs.getLiquidCash() + "\",\"investedSp500\":\"" + bs.getInvestedSp500() + "\",\"gameDay\":" + bs.getGameDay() + "},\"timestamp\":" + System.currentTimeMillis() + "}\n");
                } catch (IOException e) {}
            } else {
                try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
                    fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H5\",\"location\":\"SeedDataDebugListener.onApplicationReady\",\"message\":\"Bank state for slot 1 NOT found\",\"data\":{\"slotId\":1,\"exists\":false},\"timestamp\":" + System.currentTimeMillis() + "}\n");
                } catch (IOException e) {}
            }
        } catch (Exception e) {
            try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
                fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"H5\",\"location\":\"SeedDataDebugListener.onApplicationReady\",\"message\":\"Error checking bank state\",\"data\":{\"error\":\"" + e.getMessage().replace("\"", "\\\"") + "\"},\"timestamp\":" + System.currentTimeMillis() + "}\n");
            } catch (IOException ex) {}
        }
        // #endregion agent log
    }
}
