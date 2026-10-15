package com.itsm.web.dto;

import jakarta.validation.constraints.NotBlank;

public record StrategyRequest(@NotBlank String name) {
}
