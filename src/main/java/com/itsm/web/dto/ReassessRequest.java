package com.itsm.web.dto;

import com.itsm.model.Impact;
import com.itsm.model.Urgency;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ReassessRequest(@NotNull Impact impact, @NotNull Urgency urgency,
                              @Min(1) @Max(1_000_000) int affectedUsers) {
}
