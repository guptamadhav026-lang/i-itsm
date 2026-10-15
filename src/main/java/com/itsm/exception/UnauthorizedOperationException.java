package com.itsm.exception;

import org.springframework.http.HttpStatus;

/** Thrown when a logged-in user tries something their role or ownership does not allow. */
public class UnauthorizedOperationException extends ItsmException {

    public UnauthorizedOperationException(String message) {
        super(message);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.FORBIDDEN;
    }
}
