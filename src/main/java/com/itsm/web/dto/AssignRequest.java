package com.itsm.web.dto;

import jakarta.validation.constraints.NotNull;

public record AssignRequest(@NotNull Long technicianId) {
}
