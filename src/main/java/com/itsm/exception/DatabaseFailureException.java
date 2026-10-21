package com.itsm.exception;

import org.springframework.http.HttpStatus;

/**
 * The database could not be read or written (connection lost, disk full...).
 * GlobalExceptionHandler converts Spring's low-level DataAccessException into this one,
 * so callers get the same kind of error whatever database is used.
 */
public class DatabaseFailureException extends ItsmException {

    public DatabaseFailureException(String message, Throwable cause) {
        super(message);
        initCause(cause);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.SERVICE_UNAVAILABLE;
    }
}
