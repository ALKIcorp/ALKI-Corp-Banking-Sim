package com.alkicorp.bankingsim.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Forwards client-side routes to the SPA entry so React Router can handle them.
 * We only forward non-API requests that don't look like asset files.
 */
@Controller
public class SpaController {

    private static final String FORWARD_INDEX = "forward:/index.html";

    @GetMapping({
        "/",
        "/login",
        "/home",
        "/bank",
        "/clients/**",
        "/investment",
        "/applications",
        "/properties",
        "/admin/**"
    })
    public String forwardKnownRoutes() {
        return FORWARD_INDEX;
    }

    @GetMapping("/{path:^(?!api|auth|v3|swagger-ui|assets|static|css|js|favicon\\.ico|banksim_logo\\.png|banking).*$}")
    public String forwardUnknownSpaPaths(@PathVariable String path) {
        // Any other non-API, non-asset path without a dot should be treated as SPA route.
        if (!path.contains(".")) {
            return FORWARD_INDEX;
        }
        return "forward:/" + path;
    }
}
