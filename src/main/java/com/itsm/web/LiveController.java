package com.itsm.web;

import com.itsm.live.LiveUpdateHub;
import com.itsm.model.Role;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** Real-time updates: the browser keeps this request open and receives events as they happen. */
@RestController
@RequestMapping("/api/live")
@Tag(name = "8. Live updates")
public class LiveController {

    private final LiveUpdateHub hub;

    public LiveController(LiveUpdateHub hub) {
        this.hub = hub;
    }

    @GetMapping(produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Server-Sent Events stream of incident changes (used by the web app)")
    public SseEmitter stream(Authentication authentication) {
        // The role comes from the token itself, so this long-lived request never touches the database.
        Role role = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> Role.valueOf(a.substring(5)))
                .findFirst()
                .orElse(Role.EMPLOYEE);
        return hub.subscribe(authentication.getName(), role);
    }
}
