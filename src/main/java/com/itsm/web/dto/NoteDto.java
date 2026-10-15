package com.itsm.web.dto;

import com.itsm.model.IncidentNote;
import com.itsm.model.NoteType;

import java.time.Instant;

public record NoteDto(Long id, NoteType type, String text, UserRefDto author, Instant createdAt) {

    public static NoteDto from(IncidentNote n) {
        return new NoteDto(n.getId(), n.getType(), n.getText(), UserRefDto.from(n.getAuthor()), n.getCreatedAt());
    }
}
