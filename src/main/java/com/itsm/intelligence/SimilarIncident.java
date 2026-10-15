package com.itsm.intelligence;

import com.itsm.model.IncidentStatus;

/** An incident that looks related to another one, with a similarity score between 0 and 1. */
public record SimilarIncident(Long incidentId, String reference, String title, IncidentStatus status, double score) {
}
