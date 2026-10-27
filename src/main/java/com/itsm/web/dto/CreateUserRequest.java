package com.itsm.web.dto;

import com.itsm.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Set;

/** Used by administrators to create any kind of user. Technician-only fields are ignored for other roles. */
public record CreateUserRequest(
        @NotNull Role role,
        @NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "[a-zA-Z0-9._-]+") String username,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email @Size(max = 120) String email,
        @Size(max = 100) String department,
        Set<@NotBlank @Size(max = 50) String> skills,
        @Min(0) @Max(50) Integer experienceYears,
        @Min(1) @Max(50) Integer maxActiveIncidents,
        Boolean teamLead,
        Boolean itManager) {
}
