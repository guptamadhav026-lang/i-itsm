package com.itsm.service;

import com.itsm.event.IncidentEventType;
import com.itsm.model.AuditRecord;
import com.itsm.model.User;
import com.itsm.repository.AuditRecordRepository;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

/**
 * Writes administration changes (users, catalogue, SLA policies, strategies) into the same audit trail as the
 * incident events, so the admin audit log shows who changed the configuration and when.
 */
@Component
public class AdminAuditTrail {

    private final AuditRecordRepository auditRecords;
    private final Clock clock;

    public AdminAuditTrail(AuditRecordRepository auditRecords, Clock clock) {
        this.auditRecords = auditRecords;
        this.clock = clock;
    }

    public void record(User actor, IncidentEventType action, String description) {
        auditRecords.save(new AuditRecord(Instant.now(clock), actor.getUsername(), action, null, null, null, null,
                description));
    }
}
