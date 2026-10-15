package com.itsm.strategy.assignment;

/** A technician recommendation with its score (0-100) and the reasons behind it. */
public record ScoredTechnician(Long technicianId, String username, String fullName, double score, String reasons) {
}
