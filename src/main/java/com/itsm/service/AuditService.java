package com.itsm.service;

import com.itsm.model.AuditRecord;
import com.itsm.model.User;
import com.itsm.repository.AuditRecordRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Read access to the audit trail. Records are written by AuditTrailListener, never edited. */
@Service
@Transactional(readOnly = true)
public class AuditService {

    private final AuditRecordRepository auditRecords;
    private final IncidentService incidentService;

    public AuditService(AuditRecordRepository auditRecords, IncidentService incidentService) {
        this.auditRecords = auditRecords;
        this.incidentService = incidentService;
    }

    public List<AuditRecord> forIncident(Long incidentId, User user) {
        incidentService.getVisible(incidentId, user);   // checks the user may see this incident
        return auditRecords.findByIncidentIdOrderByTimestampAscIdAsc(incidentId);
    }

    public List<AuditRecord> recent(int limit) {
        return auditRecords.findAllByOrderByTimestampDescIdDesc(PageRequest.of(0, Math.min(Math.max(limit, 1), 500)));
    }
}
