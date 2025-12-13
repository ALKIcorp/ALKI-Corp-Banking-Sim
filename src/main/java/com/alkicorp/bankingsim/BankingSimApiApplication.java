package com.alkicorp.bankingsim;

import java.nio.file.Files;
import java.nio.file.Paths;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

@SpringBootApplication
public class BankingSimApiApplication {

    private static final String LOG_PATH = "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log";

    // #region agent log
    private static void logDebug(String sessionId, String runId, String hypothesisId, String location, String message, Object data) {
        try {
            String json = String.format(
                "{\"sessionId\":\"%s\",\"runId\":\"%s\",\"hypothesisId\":\"%s\",\"location\":\"%s\",\"message\":\"%s\",\"data\":%s,\"timestamp\":%d}%n",
                sessionId, runId, hypothesisId, location, message,
                data instanceof String ? "\"" + data.toString().replace("\"", "\\\"") + "\"" : data,
                System.currentTimeMillis()
            );
            Files.write(Paths.get(LOG_PATH), json.getBytes(), java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND);
        } catch (Exception e) {
            // Silent fail for debug logging
        }
    }
    // #endregion agent log

    public static void main(String[] args) {
        // #region agent log
        logDebug("debug-session", "run1", "A", "BankingSimApiApplication.main", "Application starting", "{\"args\":\"" + (args.length > 0 ? String.join(",", args) : "none") + "\"}");
        // #endregion agent log
        
        SpringApplication.run(BankingSimApiApplication.class, args);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        // #region agent log
        logDebug("debug-session", "run1", "A", "BankingSimApiApplication.onApplicationReady", "Application ready - server should be running", "{\"port\":8080,\"status\":\"ready\"}");
        // #endregion agent log
    }
}
