package com.itsm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResolveRequest(@NotBlank @Size(max = 4000) String resolution) {
}
