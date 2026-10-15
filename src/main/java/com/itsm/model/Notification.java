package com.itsm.model;

import jakarta.persistence.*;

import java.time.Instant;

/** A message delivered to a user through one of the notification channels. */
@Entity
@Table(name = "notification")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationChannelType channel;

    private Long incidentId;

    @Column(nullable = false, length = 200)
    private String subject;

    @Column(nullable = false, length = 2000)
    private String message;

    private Instant createdAt;

    private boolean readFlag;

    protected Notification() {
    }

    public Notification(User recipient, NotificationChannelType channel, Long incidentId,
                        String subject, String message, Instant createdAt) {
        this.recipient = recipient;
        this.channel = channel;
        this.incidentId = incidentId;
        this.subject = subject;
        this.message = message;
        this.createdAt = createdAt;
    }

    public void markRead() { this.readFlag = true; }

    public Long getId() { return id; }
    public User getRecipient() { return recipient; }
    public NotificationChannelType getChannel() { return channel; }
    public Long getIncidentId() { return incidentId; }
    public String getSubject() { return subject; }
    public String getMessage() { return message; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isRead() { return readFlag; }
}
