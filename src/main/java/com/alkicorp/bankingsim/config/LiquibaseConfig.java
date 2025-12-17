package com.alkicorp.bankingsim.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class LiquibaseConfig {
    // LiquibaseDebugListener is registered as a @Component
    // Spring Boot's auto-configured SpringLiquibase will pick it up automatically
    // if it implements the listener interfaces
    // The JDBC URL now includes ?currentSchema=public to resolve catalog ambiguity
}
