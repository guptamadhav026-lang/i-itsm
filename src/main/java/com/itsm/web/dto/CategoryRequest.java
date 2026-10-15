package com.itsm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** keywords: comma-separated words used for automatic categorisation, e.g. "vpn, wifi, router". */
public record CategoryRequest(@NotBlank @Size(max = 50) String name,
                              @Size(max = 500) String description,
                              @Size(max = 2000) String keywords,
                              Boolean active) {
}
