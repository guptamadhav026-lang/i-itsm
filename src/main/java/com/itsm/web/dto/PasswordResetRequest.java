package com.itsm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** An administrator sets a new password for someone who forgot theirs. */
public record PasswordResetRequest(@NotBlank @Size(min = 8, max = 72) String newPassword) {
}
