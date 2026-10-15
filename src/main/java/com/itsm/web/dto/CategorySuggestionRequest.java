package com.itsm.web.dto;

import jakarta.validation.constraints.NotBlank;

/** Text to analyse, e.g. the title + description an employee is typing. */
public record CategorySuggestionRequest(@NotBlank String text) {
}
