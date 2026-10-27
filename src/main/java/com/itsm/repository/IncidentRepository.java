package com.itsm.repository;

import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;
import com.itsm.model.Technician;
import com.itsm.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

/** JpaSpecificationExecutor adds the flexible multi-filter search used by SearchService. */
public interface IncidentRepository extends JpaRepository<Incident, Long>, JpaSpecificationExecutor<Incident> {

    List<Incident> findByReporterOrderByCreatedAtDesc(User reporter);

    List<Incident> findByAssignedTechnicianOrderByCreatedAtDesc(Technician technician);

    List<Incident> findByStatusIn(Collection<IncidentStatus> statuses);

    List<Incident> findByStatusInAndCreatedAtAfter(Collection<IncidentStatus> statuses, Instant after);

    long countByAssignedTechnicianAndStatusIn(Technician technician, Collection<IncidentStatus> statuses);

    @Query("select count(i) from Incident i where i.assignedTechnician = :tech and i.service.id = :serviceId "
            + "and i.resolution is not null")
    long countResolvedByTechnicianForService(@Param("tech") Technician technician, @Param("serviceId") Long serviceId);

    /** Used with VERIFIED and CLOSED: fixes the reporter confirmed, the knowledge base for "suggested resolution". */
    List<Incident> findByStatusInAndIdNot(Collection<IncidentStatus> statuses, Long excludeId);
}
