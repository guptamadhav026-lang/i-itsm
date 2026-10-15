package com.itsm.intelligence;

/** A fix that worked for a similar incident in the past. */
public record SuggestedResolution(Long incidentId, String reference, String title, String resolution, double score) {
}
