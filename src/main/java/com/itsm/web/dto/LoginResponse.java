package com.itsm.web.dto;

import java.time.Instant;

/** Returned after a successful login: send {@code token} as "Authorization: Bearer <token>". */
public record LoginResponse(String token, String tokenType, Instant expiresAt, UserDto user) {
}
