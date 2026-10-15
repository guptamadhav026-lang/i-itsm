package com.itsm.exception;

import org.springframework.http.HttpStatus;

/** Thrown for a wrong username/password or a deactivated account. */
public class AuthenticationFailedException extends ItsmException {

    public AuthenticationFailedException(String message) {
        super(message);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.UNAUTHORIZED;
    }
}
