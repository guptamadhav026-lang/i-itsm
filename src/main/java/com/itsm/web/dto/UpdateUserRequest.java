package com.itsm.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Changes to a user's details by an administrator. Any field left out (null) keeps its current value.
 * department is used for employees, itManager for administrators. The role itself cannot change.
 */
public record UpdateUserRequest(
        @Size(min = 1, max = 100) String fullName,
        @Email @Size(max = 120) String email,
        @Size(max = 100) String department,
        Boolean itManager) {
}
