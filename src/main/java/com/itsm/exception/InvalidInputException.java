package com.itsm.exception;

import org.springframework.http.HttpStatus;

/** Thrown for business-level input errors that simple field validation cannot catch. */
public class InvalidInputException extends ItsmException {

    public InvalidInputException(String message) {
        super(message);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.BAD_REQUEST;
    }
}
