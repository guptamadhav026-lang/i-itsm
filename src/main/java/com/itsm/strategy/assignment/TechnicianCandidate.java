package com.itsm.strategy.assignment;

import com.itsm.model.Technician;

/**
 * A technician who could take an incident, together with the numbers the strategies need.
 *
 * @param activeIncidents     incidents currently ASSIGNED/ACKNOWLEDGED/IN_PROGRESS for this technician
 * @param resolvedForService  how many incidents on the same IT service this technician has fixed before
 */
public record TechnicianCandidate(Technician technician, long activeIncidents, long resolvedForService) {

    /** 0.0 = completely free, 1.0 = at the workload limit. */
    public double loadRatio() {
        int max = Math.max(1, technician.getMaxActiveIncidents());
        return Math.min(1.0, (double) activeIncidents / max);
    }
}
