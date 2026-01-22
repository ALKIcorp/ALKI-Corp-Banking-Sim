package com.alkicorp.bankingsim.config;

import java.io.FileWriter;
import java.io.IOException;
import liquibase.change.Change;
import liquibase.changelog.ChangeSet;
import liquibase.changelog.DatabaseChangeLog;
import liquibase.changelog.visitor.ChangeExecListener;
import liquibase.database.Database;
import liquibase.exception.PreconditionErrorException;
import liquibase.exception.PreconditionFailedException;
import liquibase.precondition.core.PreconditionContainer;
import org.springframework.stereotype.Component;

@Component
public class LiquibaseDebugListener implements ChangeExecListener {

    private static final String LOG_PATH = "/Users/alkicorp/Documents/ALKIcorp/B5_CLASSES/TRANSWEB_420-951/project/alkicorp_banking_sim/banking-sim-api/.cursor/debug.log";

    // #region agent log
    private void logDebug(String hypothesisId, String location, String message, String data) {
        try (FileWriter fw = new FileWriter(LOG_PATH, true)) {
            fw.write("{\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"" + hypothesisId + "\",\"location\":\"" + location + "\",\"message\":\"" + message + "\",\"data\":" + data + ",\"timestamp\":" + System.currentTimeMillis() + "}\n");
        } catch (IOException e) {
            // Silent fail
        }
    }
    // #endregion agent log

    @Override
    public void willRun(ChangeSet changeSet, DatabaseChangeLog databaseChangeLog, Database database, ChangeSet.RunStatus runStatus) {
        // #region agent log
        logDebug("H2,H3", "LiquibaseDebugListener.willRun", "Liquibase will run changeset", "{\"id\":\"" + changeSet.getId() + "\",\"author\":\"" + changeSet.getAuthor() + "\",\"file\":\"" + changeSet.getFilePath() + "\",\"runStatus\":\"" + (runStatus != null ? runStatus.toString() : "null") + "\"}");
        // #endregion agent log
    }

    @Override
    public void ran(ChangeSet changeSet, DatabaseChangeLog databaseChangeLog, Database database, ChangeSet.ExecType execType) {
        // #region agent log
        logDebug("H2", "LiquibaseDebugListener.ran", "Liquibase changeset executed successfully", "{\"id\":\"" + changeSet.getId() + "\",\"author\":\"" + changeSet.getAuthor() + "\",\"execType\":\"" + (execType != null ? execType.toString() : "null") + "\"}");
        // #endregion agent log
    }

    @Override
    public void willRun(Change change, ChangeSet changeSet, DatabaseChangeLog databaseChangeLog, Database database) {
        // #region agent log
        logDebug("H2,H3", "LiquibaseDebugListener.willRun", "Liquibase will run change", "{\"changeSetId\":\"" + changeSet.getId() + "\",\"change\":\"" + (change != null ? change.getClass().getSimpleName() : "null") + "\"}");
        // #endregion agent log
    }

    @Override
    public void ran(Change change, ChangeSet changeSet, DatabaseChangeLog databaseChangeLog, Database database) {
        // #region agent log
        logDebug("H2", "LiquibaseDebugListener.ran", "Liquibase change executed", "{\"changeSetId\":\"" + changeSet.getId() + "\",\"change\":\"" + (change != null ? change.getClass().getSimpleName() : "null") + "\"}");
        // #endregion agent log
    }

    @Override
    public void willRollback(ChangeSet changeSet, DatabaseChangeLog databaseChangeLog, Database database) {
        // #region agent log
        logDebug("H2", "LiquibaseDebugListener.willRollback", "Liquibase will rollback changeset", "{\"id\":\"" + changeSet.getId() + "\",\"author\":\"" + changeSet.getAuthor() + "\"}");
        // #endregion agent log
    }

    @Override
    public void rolledBack(ChangeSet changeSet, DatabaseChangeLog databaseChangeLog, Database database) {
        // #region agent log
        logDebug("H2", "LiquibaseDebugListener.rolledBack", "Liquibase changeset rolled back", "{\"id\":\"" + changeSet.getId() + "\",\"author\":\"" + changeSet.getAuthor() + "\"}");
        // #endregion agent log
    }

    @Override
    public void preconditionFailed(PreconditionFailedException error, PreconditionContainer.FailOption onFail) {
        // #region agent log
        logDebug("H2", "LiquibaseDebugListener.preconditionFailed", "Liquibase precondition failed", "{\"error\":\"" + (error != null ? error.getMessage().replace("\"", "\\\"") : "null") + "\",\"onFail\":\"" + (onFail != null ? onFail.toString() : "null") + "\"}");
        // #endregion agent log
    }

    @Override
    public void preconditionErrored(PreconditionErrorException error, PreconditionContainer.ErrorOption onError) {
        // #region agent log
        String errorMsg = error != null ? error.getMessage() : "null";
        String causeMsg = error != null && error.getCause() != null ? error.getCause().getMessage() : "null";
        logDebug("H1,H2,H3", "LiquibaseDebugListener.preconditionErrored", "Liquibase precondition error", "{\"error\":\"" + errorMsg.replace("\"", "\\\"").replace("\n", " ") + "\",\"cause\":\"" + causeMsg.replace("\"", "\\\"").replace("\n", " ") + "\",\"onError\":\"" + (onError != null ? onError.toString() : "null") + "\"}");
        // #endregion agent log
    }

    @Override
    public void runFailed(ChangeSet changeSet, DatabaseChangeLog databaseChangeLog, Database database, Exception exception) {
        // #region agent log
        logDebug("H2", "LiquibaseDebugListener.runFailed", "Liquibase changeset execution failed", "{\"id\":\"" + changeSet.getId() + "\",\"author\":\"" + changeSet.getAuthor() + "\",\"error\":\"" + (exception != null ? exception.getMessage().replace("\"", "\\\"") : "null") + "\"}");
        // #endregion agent log
    }

    @Override
    public void rollbackFailed(ChangeSet changeSet, DatabaseChangeLog databaseChangeLog, Database database, Exception exception) {
        // #region agent log
        logDebug("H2", "LiquibaseDebugListener.rollbackFailed", "Liquibase changeset rollback failed", "{\"id\":\"" + changeSet.getId() + "\",\"author\":\"" + changeSet.getAuthor() + "\",\"error\":\"" + (exception != null ? exception.getMessage().replace("\"", "\\\"") : "null") + "\"}");
        // #endregion agent log
    }
}


