package com.itsm.exception;

import org.springframework.http.HttpStatus;

/** Thrown when creating something that must be unique (username, service name, category...) and it already exists. */
public class DuplicateResourceException extends ItsmException {

    public DuplicateResourceException(String message) {
        super(message);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.CONFLICT;
    }
}
