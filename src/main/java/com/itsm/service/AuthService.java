package com.itsm.service;

import com.itsm.exception.AuthenticationFailedException;
import com.itsm.model.User;
import com.itsm.repository.UserRepository;
import com.itsm.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/** Checks a username/password and hands out a login token. */
@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public LoginResult login(String username, String password) {
        // Same message for "no such user" and "wrong password", so attackers cannot discover usernames.
        User user = users.findByUsername(username.trim().toLowerCase(Locale.ROOT))
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new AuthenticationFailedException("Invalid username or password"));
        if (!user.isActive()) {
            throw new AuthenticationFailedException("This account has been deactivated");
        }
        return new LoginResult(user, jwtService.issue(user));
    }

    public record LoginResult(User user, JwtService.IssuedToken token) {
    }
}
