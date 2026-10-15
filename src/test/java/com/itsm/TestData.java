package com.itsm;

import com.itsm.model.Category;
import com.itsm.model.Employee;
import com.itsm.model.Impact;
import com.itsm.model.Incident;
import com.itsm.model.ItService;
import com.itsm.model.Technician;
import com.itsm.model.Urgency;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Set;

/** Small helpers to build objects for unit tests (no database involved). */
public final class TestData {

    public static final Instant NOW = Instant.parse("2026-10-15T10:00:00Z");

    private TestData() {
    }

    /** Entities normally get their id from the database; unit tests set it directly. */
    public static <T> T withId(T entity, long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }

    public static Employee employee(long id) {
        return withId(new Employee("emp" + id, "hash", "Employee " + id, "emp" + id + "@test", "IT"), id);
    }

    public static Technician technician(long id, int experience, String... skills) {
        return withId(new Technician("tech" + id, "hash", "Tech " + id, "tech" + id + "@test",
                Set.of(skills), experience, 5, false), id);
    }

    public static ItService service(long id, String name, int criticality) {
        return withId(new ItService(name, name + " service", criticality), id);
    }

    public static Category category(long id, String name, String keywords) {
        return withId(new Category(name, name, keywords), id);
    }

    public static Incident incident(long id, String title, String description, ItService service,
                                    Impact impact, Urgency urgency, int users) {
        return withId(new Incident(title, description, employee(100 + id), service, impact, urgency, users, NOW), id);
    }

    public static Incident incident(long id, String title) {
        return incident(id, title, title, service(1, "Email", 3), Impact.MEDIUM, Urgency.MEDIUM, 1);
    }
}
