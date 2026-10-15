package com.itsm.exception;

import org.springframework.http.HttpStatus;

/**
 * Base class of all business exceptions in I-ITSM.
 * Each subclass knows which HTTP status it maps to, so {@link GlobalExceptionHandler}
 * can turn any of them into a clean JSON error without a long if/else chain (polymorphism).
 */
public abstract class ItsmException extends RuntimeException {

    protected ItsmException(String message) {
        super(message);
    }

    public abstract HttpStatus getStatus();
}
