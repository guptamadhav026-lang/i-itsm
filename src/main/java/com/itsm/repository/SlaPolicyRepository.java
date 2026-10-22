package com.itsm.repository;

import com.itsm.model.ItService;
import com.itsm.model.Priority;
import com.itsm.model.SlaPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SlaPolicyRepository extends JpaRepository<SlaPolicy, Long> {

    /** The default policy for a priority (the one that is not tied to a service). */
    Optional<SlaPolicy> findByPriorityAndServiceIsNull(Priority priority);

    Optional<SlaPolicy> findByPriorityAndService(Priority priority, ItService service);
}
