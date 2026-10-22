package com.itsm.exception;

import org.springframework.http.HttpStatus;

/** An outside system (the mail server or the Gemini API) could not be reached. */
public class NetworkFailureException extends ItsmException {

    public NetworkFailureException(String message) {
        super(message);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.BAD_GATEWAY;
    }
}
