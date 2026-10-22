package com.itsm.model;

import com.itsm.exception.InvalidInputException;
import jakarta.persistence.*;

import java.time.Duration;

/**
 * Response and resolution targets for one priority level. Configurable by administrators.
 * A policy without a service is the default for that priority; a policy with a service overrides the default
 * for incidents on that service only (e.g. the HR portal can wait longer than the payment gateway).
 */
@Entity
@Table(name = "sla_policy", uniqueConstraints = @UniqueConstraint(columnNames = {"priority", "service_id"}))
public class SlaPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Priority priority;

    /** Null for the default policy of this priority. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private ItService service;

    /** Minutes allowed before a technician must acknowledge the incident. */
    private int responseMinutes;

    /** Minutes allowed before the incident must be resolved. */
    private int resolutionMinutes;

    /** Send an "SLA approaching" warning when this % of the resolution time has passed. */
    private int warningThresholdPercent = 75;

    protected SlaPolicy() {
    }

    public SlaPolicy(Priority priority, int responseMinutes, int resolutionMinutes, int warningThresholdPercent) {
        this(priority, null, responseMinutes, resolutionMinutes, warningThresholdPercent);
    }

    public SlaPolicy(Priority priority, ItService service, int responseMinutes, int resolutionMinutes,
                     int warningThresholdPercent) {
        this.priority = priority;
        this.service = service;
        update(responseMinutes, resolutionMinutes, warningThresholdPercent);
    }

    public final void update(int responseMinutes, int resolutionMinutes, int warningThresholdPercent) {
        if (responseMinutes <= 0 || resolutionMinutes <= 0) {
            throw new InvalidInputException("SLA targets must be positive");
        }
        if (responseMinutes > resolutionMinutes) {
            throw new InvalidInputException("Response target cannot be longer than resolution target");
        }
        if (warningThresholdPercent < 1 || warningThresholdPercent > 99) {
            throw new InvalidInputException("Warning threshold must be between 1 and 99 percent");
        }
        this.responseMinutes = responseMinutes;
        this.resolutionMinutes = resolutionMinutes;
        this.warningThresholdPercent = warningThresholdPercent;
    }

    public Duration responseTime() { return Duration.ofMinutes(responseMinutes); }
    public Duration resolutionTime() { return Duration.ofMinutes(resolutionMinutes); }

    public boolean isDefault() { return service == null; }

    public Long getId() { return id; }
    public Priority getPriority() { return priority; }
    public ItService getService() { return service; }
    public int getResponseMinutes() { return responseMinutes; }
    public int getResolutionMinutes() { return resolutionMinutes; }
    public int getWarningThresholdPercent() { return warningThresholdPercent; }
}
