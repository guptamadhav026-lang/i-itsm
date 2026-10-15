package com.itsm.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Self-registration: always creates an Employee account. */
public record RegisterRequest(
        @NotBlank @Size(min = 3, max = 50) @Pattern(regexp = "[a-zA-Z0-9._-]+",
                message = "may only contain letters, digits, dot, underscore and dash") String username,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email String email,
        @Size(max = 100) String department) {
}
