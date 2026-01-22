package com.alkicorp.bankingsim.config;

import java.io.FileWriter;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationContextInitializedEvent;
import org.springframework.boot.context.event.ApplicationFailedEvent;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.context.event.ApplicationStartedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Order(1)
public class StartupDebugListener {

    private static final String LOG_PATH = "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log";

    private final DataSource dataSource;

    // #region agent log
    private void logDebug(String hypothesisId, String location, String message, String data) {
        try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"" + hypothesisId + "\",\"location\":\"" + location + "\",\"message\":\"" + message + "\",\"data\":" + data + ",\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {
            // Silent fail
        }
    }
    // #endregion agent log

    @EventListener(ApplicationContextInitializedEvent.class)
    public void onContextInitialized(ApplicationContextInitializedEvent event) {
        // #region agent log
        logDebug("H4", "StartupDebugListener.onContextInitialized", "Application context initialized", "{}");
        // #endregion agent log
    }

    @EventListener(ApplicationStartedEvent.class)
    public void onApplicationStarted(ApplicationStartedEvent event) {
        // #region agent log
        logDebug("H4", "StartupDebugListener.onApplicationStarted", "Application started", "{}");
        // #endregion agent log
        
        // Test database connection
        // #region agent log
        try {
            logDebug("H1", "StartupDebugListener.onApplicationStarted", "Testing database connection", "{}");
            try (Connection conn = dataSource.getConnection()) {
                DatabaseMetaData metaData = conn.getMetaData();
                String dbUrl = metaData.getURL();
                String dbProduct = metaData.getDatabaseProductName();
                String dbVersion = metaData.getDatabaseProductVersion();
                logDebug("H1", "StartupDebugListener.onApplicationStarted", "Database connection successful", "{\"url\":\"" + dbUrl + "\",\"product\":\"" + dbProduct + "\",\"version\":\"" + dbVersion + "\"}");
            } catch (Exception e) {
                logDebug("H1", "StartupDebugListener.onApplicationStarted", "Database connection failed", "{\"error\":\"" + e.getClass().getName() + "\",\"message\":\"" + e.getMessage().replace("\"", "\\\"") + "\"}");
            }
        } catch (Exception e) {
            logDebug("H1", "StartupDebugListener.onApplicationStarted", "Error getting datasource", "{\"error\":\"" + e.getClass().getName() + "\",\"message\":\"" + e.getMessage().replace("\"", "\\\"") + "\"}");
        }
        // #endregion agent log
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady(ApplicationReadyEvent event) {
        // #region agent log
        logDebug("H4", "StartupDebugListener.onApplicationReady", "Application ready", "{}");
        // #endregion agent log
    }

    @EventListener(ApplicationFailedEvent.class)
    public void onApplicationFailed(ApplicationFailedEvent event) {
        // #region agent log
        Throwable exception = event.getException();
        String exceptionClass = exception != null ? exception.getClass().getName() : "null";
        String exceptionMessage = exception != null ? exception.getMessage() : "null";
        String causeClass = exception != null && exception.getCause() != null ? exception.getCause().getClass().getName() : "null";
        String causeMessage = exception != null && exception.getCause() != null ? exception.getCause().getMessage() : "null";
        logDebug("H4,H5", "StartupDebugListener.onApplicationFailed", "Application failed to start", "{\"exception\":\"" + exceptionClass + "\",\"message\":\"" + exceptionMessage.replace("\"", "\\\"") + "\",\"cause\":\"" + causeClass + "\",\"causeMessage\":\"" + causeMessage.replace("\"", "\\\"") + "\"}");
        // #endregion agent log
    }
}


