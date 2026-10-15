package com.itsm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReopenRequest(@NotBlank @Size(max = 2000) String reason) {
}
