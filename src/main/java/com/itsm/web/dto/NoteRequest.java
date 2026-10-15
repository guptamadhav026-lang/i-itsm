package com.itsm.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Text for a note, an information request, a reply, or a reopen reason. */
public record NoteRequest(@NotBlank @Size(max = 4000) String text) {
}
