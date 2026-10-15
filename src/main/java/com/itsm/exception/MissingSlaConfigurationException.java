package com.itsm.exception;

import org.springframework.http.HttpStatus;

/** Thrown when no SLA policy is configured for an incident's priority. */
public class MissingSlaConfigurationException extends ItsmException {

    public MissingSlaConfigurationException(String message) {
        super(message);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
