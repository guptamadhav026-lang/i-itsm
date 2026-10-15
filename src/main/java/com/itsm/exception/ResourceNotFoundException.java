package com.itsm.exception;

import org.springframework.http.HttpStatus;

/** Thrown when an incident, user, service, category etc. does not exist. */
public class ResourceNotFoundException extends ItsmException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.NOT_FOUND;
    }
}
