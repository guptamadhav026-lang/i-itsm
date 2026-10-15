package com.itsm.service;

import com.itsm.model.Administrator;
import com.itsm.model.Employee;
import com.itsm.model.Technician;
import com.itsm.model.User;
import com.itsm.web.dto.CreateUserRequest;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * FACTORY PATTERN: builds the right User subclass for a role.
 * The rest of the code asks for "a user with role X" and never calls the constructors directly,
 * so adding a new role later means changing only this class.
 */
@Component
public class UserFactory {

    public User create(CreateUserRequest request, String passwordHash) {
        return switch (request.role()) {
            case EMPLOYEE -> new Employee(request.username(), passwordHash, request.fullName(), request.email(),
                    request.department());
            case TECHNICIAN -> new Technician(request.username(), passwordHash, request.fullName(), request.email(),
                    request.skills() == null ? Set.of() : request.skills(),
                    request.experienceYears() == null ? 0 : request.experienceYears(),
                    request.maxActiveIncidents() == null ? 5 : request.maxActiveIncidents(),
                    Boolean.TRUE.equals(request.teamLead()));
            case ADMIN -> new Administrator(request.username(), passwordHash, request.fullName(), request.email(),
                    Boolean.TRUE.equals(request.itManager()));
        };
    }
}
