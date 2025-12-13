package com.alkicorp.bankingsim.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceDebugConfig implements WebMvcConfigurer {

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

    public StaticResourceDebugConfig() {
        // #region agent log
        logDebug("debug-session", "run1", "E", "StaticResourceDebugConfig.<init>", "Configuration class instantiated", "{\"class\":\"StaticResourceDebugConfig\"}");
        // #endregion agent log
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // #region agent log
        logDebug("debug-session", "run1", "B", "StaticResourceDebugConfig.addResourceHandlers", "Configuring static resource handlers", "{\"registry\":\"configured\"}");
        // #endregion agent log
        
        // Check if static file exists in classpath
        Resource htmlResource = new ClassPathResource("static/banking/alkicorp_banking_sim.html");
        // #region agent log
        logDebug("debug-session", "run1", "C", "StaticResourceDebugConfig.addResourceHandlers", "Checking if HTML file exists in classpath", 
            String.format("{\"exists\":%s,\"path\":\"static/banking/alkicorp_banking_sim.html\"}", htmlResource.exists()));
        // #endregion agent log
        
        // Explicitly configure /banking/** to serve from classpath:/static/banking/
        // This ensures /banking/alkicorp_banking_sim.html maps to classpath:/static/banking/alkicorp_banking_sim.html
        registry.addResourceHandler("/banking/**")
            .addResourceLocations("classpath:/static/banking/");
    }

    @Bean
    public FilterRegistrationBean<Filter> requestLoggingFilter() {
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new Filter() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response, FilterChain chain)
                    throws IOException, ServletException {
                if (request instanceof HttpServletRequest && response instanceof HttpServletResponse) {
                    HttpServletRequest httpRequest = (HttpServletRequest) request;
                    HttpServletResponse httpResponse = (HttpServletResponse) response;
                    String path = httpRequest.getRequestURI();
                    // #region agent log
                    logDebug("debug-session", "run1", "D", "StaticResourceDebugConfig.doFilter", "Incoming HTTP request", 
                        String.format("{\"method\":\"%s\",\"path\":\"%s\",\"query\":\"%s\"}", 
                            httpRequest.getMethod(), path, httpRequest.getQueryString() != null ? httpRequest.getQueryString() : ""));
                    // #endregion agent log
                    
                    chain.doFilter(request, response);
                    
                    // #region agent log
                    logDebug("debug-session", "run1", "D", "StaticResourceDebugConfig.doFilter", "HTTP response", 
                        String.format("{\"status\":%d,\"path\":\"%s\",\"contentType\":\"%s\"}", 
                            httpResponse.getStatus(), path, httpResponse.getContentType() != null ? httpResponse.getContentType() : "null"));
                    // #endregion agent log
                } else {
                    chain.doFilter(request, response);
                }
            }
        });
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}

