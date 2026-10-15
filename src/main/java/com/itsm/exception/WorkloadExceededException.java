package com.itsm.exception;

import org.springframework.http.HttpStatus;

/** Thrown when a technician already has their maximum number of active incidents. */
public class WorkloadExceededException extends ItsmException {

    public WorkloadExceededException(String message) {
        super(message);
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.CONFLICT;
    }
}
