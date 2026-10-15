package com.itsm.repository;

import com.itsm.model.AuditRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditRecordRepository extends JpaRepository<AuditRecord, Long> {

    List<AuditRecord> findByIncidentIdOrderByTimestampAscIdAsc(Long incidentId);

    List<AuditRecord> findAllByOrderByTimestampDescIdDesc(Pageable pageable);
}
