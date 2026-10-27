package com.itsm.model;

import com.itsm.event.IncidentEventType;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * One line of the audit trail ("10:07 - INC0024 assigned to T205").
 * Immutable: there are no setters, because history must never be edited.
 */
@Entity
@Table(name = "audit_record", indexes = @Index(columnList = "incidentId"))
public class AuditRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Instant timestamp;

    /** Username of whoever did it, or "SYSTEM" for automatic actions. */
    @Column(nullable = false, length = 50)
    private String actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private IncidentEventType action;

    private Long incidentId;

    @Column(length = 20)
    private String incidentReference;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private IncidentStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private IncidentStatus newStatus;

    private static final int DESCRIPTION_LENGTH = 1000;

    @Column(length = DESCRIPTION_LENGTH)
    private String description;

    protected AuditRecord() {
    }

    public AuditRecord(Instant timestamp, String actor, IncidentEventType action, Long incidentId,
                       String incidentReference, IncidentStatus previousStatus, IncidentStatus newStatus,
                       String description) {
        this.timestamp = timestamp;
        this.actor = actor;
        this.action = action;
        this.incidentId = incidentId;
        this.incidentReference = incidentReference;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.description = shorten(description, DESCRIPTION_LENGTH);
    }

    /** Long texts (a 4000-character note, say) are cut so the record always fits; the full text stays on the incident. */
    static String shorten(String text, int max) {
        return text == null || text.length() <= max ? text : text.substring(0, max - 1) + "\u2026";
    }

    public Long getId() { return id; }
    public Instant getTimestamp() { return timestamp; }
    public String getActor() { return actor; }
    public IncidentEventType getAction() { return action; }
    public Long getIncidentId() { return incidentId; }
    public String getIncidentReference() { return incidentReference; }
    public IncidentStatus getPreviousStatus() { return previousStatus; }
    public IncidentStatus getNewStatus() { return newStatus; }
    public String getDescription() { return description; }
}
