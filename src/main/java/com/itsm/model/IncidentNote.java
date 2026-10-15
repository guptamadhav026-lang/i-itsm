package com.itsm.model;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * A note attached to an incident (investigation notes, info requests, replies).
 * COMPOSITION: a note belongs to exactly one incident and is deleted with it.
 */
@Entity
@Table(name = "incident_note")
public class IncidentNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NoteType type;

    @Column(nullable = false, length = 4000)
    private String text;

    private Instant createdAt;

    protected IncidentNote() {
    }

    IncidentNote(Incident incident, User author, NoteType type, String text, Instant createdAt) {
        this.incident = incident;
        this.author = author;
        this.type = type;
        this.text = text;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public Incident getIncident() { return incident; }
    public User getAuthor() { return author; }
    public NoteType getType() { return type; }
    public String getText() { return text; }
    public Instant getCreatedAt() { return createdAt; }
}
