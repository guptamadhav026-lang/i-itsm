package com.itsm.strategy.priority;

import com.itsm.model.Priority;

/** Result of a priority calculation: the level, the raw score and a human-readable reason. */
public record PriorityAssessment(Priority priority, double score, String explanation) {
}
