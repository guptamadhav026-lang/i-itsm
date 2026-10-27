package com.itsm.service;

import com.itsm.exception.InvalidInputException;
import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;
import com.itsm.model.Role;
import com.itsm.model.User;
import com.itsm.repository.IncidentRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Multi-criteria incident search. Each filled-in criterion adds one condition (a JPA "Specification")
 * and they are combined with AND, so any combination of filters works.
 * Employees are automatically limited to their own incidents.
 */
@Service
@Transactional(readOnly = true)
public class SearchService {

    private final IncidentRepository incidents;
    private final SlaService slaService;
    private final Clock clock;

    public SearchService(IncidentRepository incidents, SlaService slaService, Clock clock) {
        this.incidents = incidents;
        this.slaService = slaService;
        this.clock = clock;
    }

    public List<Incident> search(IncidentSearchCriteria c, User user) {
        List<Specification<Incident>> conditions = new ArrayList<>();
        ZoneId zone = zoneOf(c.timeZone());

        if (c.reference() != null && !c.reference().isBlank()) {
            Long id = parseReference(c.reference());
            conditions.add((root, query, cb) -> cb.equal(root.get("id"), id));
        }
        if (c.status() != null) {
            conditions.add((root, query, cb) -> cb.equal(root.get("status"), c.status()));
        }
        if (Boolean.TRUE.equals(c.openOnly())) {
            conditions.add((root, query, cb) -> root.get("status").in(IncidentStatus.UNRESOLVED));
        }
        if (c.priority() != null) {
            conditions.add((root, query, cb) -> cb.equal(root.get("priority"), c.priority()));
        }
        if (c.categoryId() != null) {
            conditions.add((root, query, cb) -> cb.equal(root.get("category").get("id"), c.categoryId()));
        }
        if (c.serviceId() != null) {
            conditions.add((root, query, cb) -> cb.equal(root.get("service").get("id"), c.serviceId()));
        }
        if (c.technicianId() != null) {
            conditions.add((root, query, cb) -> cb.equal(root.get("assignedTechnician").get("id"), c.technicianId()));
        }
        Long reporterId = user.getRole() == Role.EMPLOYEE ? user.getId() : c.reporterId();
        if (reporterId != null) {
            conditions.add((root, query, cb) -> cb.equal(root.get("reporter").get("id"), reporterId));
        }
        if (c.createdFrom() != null) {
            Instant from = c.createdFrom().atStartOfDay(zone).toInstant();
            conditions.add((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from));
        }
        if (c.createdTo() != null) {
            Instant to = c.createdTo().plusDays(1).atStartOfDay(zone).toInstant();
            conditions.add((root, query, cb) -> cb.lessThan(root.get("createdAt"), to));
        }
        if (c.keyword() != null && !c.keyword().isBlank()) {
            // % and _ typed by the user are searched for literally, not used as wildcards
            String escaped = c.keyword().trim().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
            String pattern = "%" + escaped + "%";
            conditions.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("title")), pattern, '\\'),
                    cb.like(cb.lower(root.get("description")), pattern, '\\')));
        }

        List<Incident> result = incidents.findAll(Specification.allOf(conditions),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        // SLA state is calculated (not stored), so this filter is applied after loading.
        if (c.slaState() != null) {
            Instant now = Instant.now(clock);
            result = result.stream().filter(i -> slaService.stateOf(i, now) == c.slaState()).toList();
        }
        return result;
    }

    /** The browser's time zone if it sent a valid one, otherwise the server's. */
    private ZoneId zoneOf(String timeZone) {
        if (timeZone != null && !timeZone.isBlank()) {
            try {
                return ZoneId.of(timeZone.trim());
            } catch (DateTimeException e) {
                // unknown zone name: fall back to the server's
            }
        }
        return clock.getZone();
    }

    private static Long parseReference(String reference) {
        String digits = reference.trim().toUpperCase(Locale.ROOT).replaceFirst("^INC", "");
        try {
            return Long.parseLong(digits);
        } catch (NumberFormatException ex) {
            throw new InvalidInputException("'" + reference + "' is not a valid incident reference (e.g. INC0007)");
        }
    }
}
