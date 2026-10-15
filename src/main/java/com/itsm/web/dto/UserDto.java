package com.itsm.web.dto;

import com.itsm.model.Administrator;
import com.itsm.model.Employee;
import com.itsm.model.Role;
import com.itsm.model.Technician;
import com.itsm.model.User;

import java.util.List;

/** What the API shows about a user (never the password hash). Role-specific fields are null for other roles. */
public record UserDto(Long id, String username, String fullName, String email, Role role, boolean active,
                      String department,
                      List<String> skills, Integer experienceYears, Integer maxActiveIncidents,
                      Boolean available, Boolean teamLead,
                      Boolean itManager) {

    public static UserDto from(User user) {
        String department = null;
        List<String> skills = null;
        Integer experience = null;
        Integer maxActive = null;
        Boolean available = null;
        Boolean teamLead = null;
        Boolean itManager = null;
        // Pattern matching for instanceof: read the extra fields of each subclass.
        if (user instanceof Employee e) {
            department = e.getDepartment();
        } else if (user instanceof Technician t) {
            skills = t.getSkills().stream().sorted().toList();
            experience = t.getExperienceYears();
            maxActive = t.getMaxActiveIncidents();
            available = t.isAvailable();
            teamLead = t.isTeamLead();
        } else if (user instanceof Administrator a) {
            itManager = a.isItManager();
        }
        return new UserDto(user.getId(), user.getUsername(), user.getFullName(), user.getEmail(), user.getRole(),
                user.isActive(), department, skills, experience, maxActive, available, teamLead, itManager);
    }
}
