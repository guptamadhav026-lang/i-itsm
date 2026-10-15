package com.itsm.event;

import com.itsm.model.AuditRecord;
import com.itsm.repository.AuditRecordRepository;
import org.springframework.stereotype.Component;

/** Observer that writes every incident event into the audit trail. */
@Component
public class AuditTrailListener implements IncidentEventListener {

    private final AuditRecordRepository auditRecords;

    public AuditTrailListener(AuditRecordRepository auditRecords) {
        this.auditRecords = auditRecords;
    }

    @Override
    public void onIncidentEvent(IncidentEvent event) {
        auditRecords.save(new AuditRecord(
                event.timestamp(),
                event.actor(),
                event.type(),
                event.incidentId(),
                event.incident().getReference(),
                event.previousStatus(),
                event.newStatus(),
                event.description()));
    }
}
