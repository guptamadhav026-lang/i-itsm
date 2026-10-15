package com.itsm.security;

import com.itsm.exception.AuthenticationFailedException;
import com.itsm.model.User;
import com.itsm.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

/** Finds the logged-in User entity from the token's subject (the username). */
@Component
public class CurrentUser {

    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public User from(Authentication authentication) {
        if (authentication == null) {
            throw new AuthenticationFailedException("Not logged in");
        }
        User user = users.findByUsername(authentication.getName())
                .orElseThrow(() -> new AuthenticationFailedException("Unknown user " + authentication.getName()));
        if (!user.isActive()) {
            throw new AuthenticationFailedException("Account is deactivated");
        }
        return user;
    }
}
