package com.itsm.web;

import com.itsm.security.CurrentUser;
import com.itsm.service.AuthService;
import com.itsm.service.UserService;
import com.itsm.web.dto.ChangePasswordRequest;
import com.itsm.web.dto.LoginRequest;
import com.itsm.web.dto.LoginResponse;
import com.itsm.web.dto.RegisterRequest;
import com.itsm.web.dto.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "1. Authentication")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;
    private final CurrentUser currentUser;
    private final boolean demoAccounts;

    public AuthController(AuthService authService, UserService userService, CurrentUser currentUser,
                          @Value("${itsm.seed.enabled:true}") boolean demoAccounts) {
        this.authService = authService;
        this.userService = userService;
        this.currentUser = currentUser;
        this.demoAccounts = demoAccounts;
    }

    /** Whether the demo accounts are loaded, so the login page only offers them when they exist. */
    public record LoginOptions(boolean demoAccounts) {
    }

    @PostMapping("/login")
    @Operation(summary = "Log in and receive a JWT token")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        AuthService.LoginResult result = authService.login(request.username(), request.password());
        return new LoginResponse(result.token().value(), "Bearer", result.token().expiresAt(),
                UserDto.from(result.user()));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Self-registration (always creates an EMPLOYEE account)")
    public UserDto register(@Valid @RequestBody RegisterRequest request) {
        return UserDto.from(userService.register(request));
    }

    @GetMapping("/me")
    @Operation(summary = "The currently logged-in user")
    public UserDto me(Authentication authentication) {
        return UserDto.from(currentUser.from(authentication));
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Change your own password (the current one is required)")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request, Authentication authentication) {
        userService.changeOwnPassword(currentUser.from(authentication), request.currentPassword(),
                request.newPassword());
    }

    @GetMapping("/options")
    @Operation(summary = "What the login page should offer (no login needed)")
    public LoginOptions options() {
        return new LoginOptions(demoAccounts);
    }
}
