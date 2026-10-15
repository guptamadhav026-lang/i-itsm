package com.itsm.web.dto;

import java.time.Instant;
import java.util.Map;

/** The JSON body of every error response, so a frontend can always show a clear message. */
public record ApiError(Instant timestamp, int status, String error, String message, String path,
                       Map<String, String> fieldErrors) {
}
