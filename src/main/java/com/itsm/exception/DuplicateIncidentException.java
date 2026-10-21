package com.itsm.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an employee reports the same problem again while their first report is still open
 * (usually a double click on "Submit"). Similar reports from different people are not rejected;
 * those are only flagged by DuplicateDetector.
 */
public class DuplicateIncidentException extends ItsmException {

    private final String existingReference;

    public DuplicateIncidentException(String existingReference) {
        super("You already reported this problem and " + existingReference + " is still open");
        this.existingReference = existingReference;
    }

    public String getExistingReference() {
        return existingReference;
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.CONFLICT;
    }
}
