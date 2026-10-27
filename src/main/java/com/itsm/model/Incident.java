package com.itsm.model;

import com.itsm.exception.InvalidInputException;
import com.itsm.model.state.IncidentState;
import com.itsm.model.state.IncidentStateFactory;
import jakarta.persistence.*;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;

/**
 * The heart of the system: one reported IT problem.
 *
 * Encapsulation: there are no public setters for status or timestamps. The only way to move
 * an incident through its lifecycle is through methods like {@link #acknowledge(Instant)},
 * and every one of them asks the current {@link IncidentState} whether the move is legal.
 *
 * Associations: an incident refers to its reporter, its service, its category and its technician
 * (they exist on their own). Composition: it owns its notes (they are deleted with it).
 */
@Entity
@Table(name = "incident")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 4000)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User reporter;

    @ManyToOne(fetch = FetchType.LAZY)
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private ItService service;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Impact impact;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Urgency urgency;

    private int affectedUsers;

    @Enumerated(EnumType.STRING)
    @Column(length = 5)
    private Priority priority;

    private double priorityScore;

    @Column(length = 500)
    private String priorityExplanation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IncidentStatus status = IncidentStatus.NEW;

    @ManyToOne(fetch = FetchType.LAZY)
    private Technician assignedTechnician;

    private Instant createdAt;
    private Instant assignedAt;
    private Instant acknowledgedAt;
    private Instant resolvedAt;
    private Instant verifiedAt;
    private Instant closedAt;

    /** When the current SLA targets started counting: the report, or the last change of priority or service. */
    private Instant slaStartedAt;
    private Instant responseDeadline;
    private Instant resolutionDeadline;

    private boolean responseWarningSent;
    private boolean slaWarningSent;
    private boolean responseBreached;
    private boolean resolutionBreached;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private EscalationLevel escalationLevel = EscalationLevel.NONE;

    /** Set by duplicate detection when another open incident looks like the same problem. */
    @ManyToOne(fetch = FetchType.LAZY)
    private Incident potentialDuplicateOf;

    @Column(length = 4000)
    private String resolution;

    /** True while a technician is waiting for the reporter to answer an info request. */
    private boolean awaitingReporterInfo;

    private Integer feedbackRating;

    @Column(length = 1000)
    private String feedbackComment;

    @OneToMany(mappedBy = "incident", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<IncidentNote> notes = new ArrayList<>();

    /** Optimistic locking: stops two people (or a person and the SLA monitor) overwriting each other. */
    @Version
    private Long version;

    protected Incident() {
        // required by JPA
    }

    public Incident(String title, String description, User reporter, ItService service,
                    Impact impact, Urgency urgency, int affectedUsers, Instant createdAt) {
        if (title == null || title.isBlank()) {
            throw new InvalidInputException("Title is required");
        }
        if (affectedUsers < 1) {
            throw new InvalidInputException("At least one user must be affected");
        }
        this.title = title.trim();
        this.description = description;
        this.reporter = reporter;
        this.service = service;
        this.impact = impact;
        this.urgency = urgency;
        this.affectedUsers = affectedUsers;
        this.createdAt = createdAt;
    }

    // Lifecycle

    /** The State object for the current status (see the State pattern classes). */
    public IncidentState currentState() {
        return IncidentStateFactory.forStatus(status);
    }

    private void moveTo(IncidentStatus target) {
        currentState().validateTransition(target);
        this.status = target;
    }

    public void classify(Category category) {
        if (category == null) {
            throw new InvalidInputException("A category is required to classify an incident");
        }
        moveTo(IncidentStatus.CLASSIFIED);
        this.category = category;
    }

    public void assignTo(Technician technician, Instant now) {
        if (technician == null) {
            throw new InvalidInputException("A technician is required");
        }
        moveTo(IncidentStatus.ASSIGNED);
        this.assignedTechnician = technician;
        this.assignedAt = now;
    }

    public void acknowledge(Instant now) {
        moveTo(IncidentStatus.ACKNOWLEDGED);
        if (acknowledgedAt == null) {
            acknowledgedAt = now;   // the first response is what the SLA measures
        }
    }

    public void startInvestigation() {
        moveTo(IncidentStatus.IN_PROGRESS);
    }

    public void resolve(String resolutionText, Instant now) {
        if (resolutionText == null || resolutionText.isBlank()) {
            throw new InvalidInputException("Resolution details are required");
        }
        moveTo(IncidentStatus.RESOLVED);
        this.resolution = resolutionText.trim();
        this.resolvedAt = now;
        this.awaitingReporterInfo = false;
    }

    /**
     * The reporter says the fix did not work: back to IN_PROGRESS. The rejected fix and any rating of it are
     * removed (the audit trail keeps them), and the time the incident spent waiting for the reporter's check
     * is added to the resolution deadline: the SLA clock was paused while the ball was with the reporter.
     */
    public void reopen(Instant now) {
        moveTo(IncidentStatus.IN_PROGRESS);
        if (resolvedAt != null && resolutionDeadline != null && !resolutionBreached) {
            resolutionDeadline = resolutionDeadline.plus(Duration.between(resolvedAt, now));
        }
        this.resolvedAt = null;
        this.resolution = null;
        this.feedbackRating = null;
        this.feedbackComment = null;
    }

    public void verify(Instant now) {
        moveTo(IncidentStatus.VERIFIED);
        this.verifiedAt = now;
    }

    public void close(Instant now) {
        moveTo(IncidentStatus.CLOSED);
        this.closedAt = now;
    }

    // Other behaviour

    public IncidentNote addNote(User author, NoteType type, String text, Instant now) {
        if (!currentState().acceptsNotes()) {
            throw new InvalidInputException("Notes cannot be added to a " + status + " incident");
        }
        if (text == null || text.isBlank()) {
            throw new InvalidInputException("Note text is required");
        }
        IncidentNote note = new IncidentNote(this, author, type, text.trim(), now);
        notes.add(note);
        if (type == NoteType.INFO_REQUEST) {
            awaitingReporterInfo = true;
        } else if (type == NoteType.INFO_RESPONSE) {
            awaitingReporterInfo = false;
        }
        return note;
    }

    /** Re-assess impact/urgency (e.g. more users turned out to be affected). Only before resolution. */
    public void reassess(Impact newImpact, Urgency newUrgency, int newAffectedUsers) {
        requireUnresolved("re-assessed");
        if (newAffectedUsers < 1) {
            throw new InvalidInputException("At least one user must be affected");
        }
        this.impact = newImpact;
        this.urgency = newUrgency;
        this.affectedUsers = newAffectedUsers;
    }

    /** Corrects the title or description (a null value keeps the current one). Only before resolution. */
    public void updateDetails(String newTitle, String newDescription) {
        requireUnresolved("edited");
        if (newTitle != null) {
            if (newTitle.isBlank()) {
                throw new InvalidInputException("Title is required");
            }
            this.title = newTitle.trim();
        }
        if (newDescription != null) {
            if (newDescription.isBlank()) {
                throw new InvalidInputException("Description is required");
            }
            this.description = newDescription.trim();
        }
    }

    /** Re-classification: the automatic (or chosen) category was wrong. Only before resolution. */
    public void changeCategory(Category newCategory) {
        requireUnresolved("re-classified");
        if (newCategory == null) {
            throw new InvalidInputException("A category is required");
        }
        this.category = newCategory;
    }

    /** The problem is really with another business service. Only before resolution. */
    public void changeService(ItService newService) {
        requireUnresolved("moved to another service");
        if (newService == null) {
            throw new InvalidInputException("A service is required");
        }
        this.service = newService;
    }

    private void requireUnresolved(String action) {
        if (!isUnresolved()) {
            throw new InvalidInputException("A " + status + " incident can no longer be " + action);
        }
    }

    public void applyPriority(Priority newPriority, double score, String explanation) {
        this.priority = newPriority;
        this.priorityScore = score;
        this.priorityExplanation = explanation;
    }

    /** New SLA targets that start counting at {@code start}. Warnings may be sent again for the new targets. */
    public void applySlaDeadlines(Instant start, Instant responseDeadline, Instant resolutionDeadline) {
        this.slaStartedAt = start;
        this.responseDeadline = responseDeadline;
        this.resolutionDeadline = resolutionDeadline;
        this.responseWarningSent = false;
        this.slaWarningSent = false;
    }

    /** One rating per fix, given once the reporter has confirmed it works. */
    public void giveFeedback(int rating, String comment) {
        if (!EnumSet.of(IncidentStatus.VERIFIED, IncidentStatus.CLOSED).contains(status)) {
            throw new InvalidInputException("Feedback can be given once you have confirmed the fix");
        }
        if (feedbackRating != null) {
            throw new InvalidInputException("Feedback for " + getReference() + " was already given");
        }
        if (rating < 1 || rating > 5) {
            throw new InvalidInputException("Rating must be between 1 and 5");
        }
        this.feedbackRating = rating;
        this.feedbackComment = comment == null || comment.isBlank() ? null : comment.trim();
    }

    public void markPotentialDuplicateOf(Incident original) {
        this.potentialDuplicateOf = original;
    }

    public void escalate() { this.escalationLevel = escalationLevel.next(); }
    public void markResponseWarningSent() { this.responseWarningSent = true; }
    public void markSlaWarningSent() { this.slaWarningSent = true; }
    public void markResponseBreached() { this.responseBreached = true; }
    public void markResolutionBreached() { this.resolutionBreached = true; }

    // Queries

    /** Human-friendly reference like INC0007. */
    public String getReference() {
        return id == null ? "INC-NEW" : String.format("INC%04d", id);
    }

    public boolean isUnresolved() {
        return IncidentStatus.UNRESOLVED.contains(status);
    }

    public boolean isSlaBreached() {
        return responseBreached || resolutionBreached;
    }

    public boolean isReportedBy(User user) {
        return reporter != null && reporter.isSameUser(user);
    }

    // Getters

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public User getReporter() { return reporter; }
    public Category getCategory() { return category; }
    public ItService getService() { return service; }
    public Impact getImpact() { return impact; }
    public Urgency getUrgency() { return urgency; }
    public int getAffectedUsers() { return affectedUsers; }
    public Priority getPriority() { return priority; }
    public double getPriorityScore() { return priorityScore; }
    public String getPriorityExplanation() { return priorityExplanation; }
    public IncidentStatus getStatus() { return status; }
    public Technician getAssignedTechnician() { return assignedTechnician; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getAssignedAt() { return assignedAt; }
    public Instant getAcknowledgedAt() { return acknowledgedAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public Instant getVerifiedAt() { return verifiedAt; }
    public Instant getClosedAt() { return closedAt; }
    /** Falls back to the report time for incidents saved before this field existed. */
    public Instant getSlaStartedAt() { return slaStartedAt != null ? slaStartedAt : createdAt; }
    public Instant getResponseDeadline() { return responseDeadline; }
    public Instant getResolutionDeadline() { return resolutionDeadline; }
    public boolean isResponseWarningSent() { return responseWarningSent; }
    public boolean isSlaWarningSent() { return slaWarningSent; }
    public boolean isResponseBreached() { return responseBreached; }
    public boolean isResolutionBreached() { return resolutionBreached; }
    public EscalationLevel getEscalationLevel() { return escalationLevel; }
    public Incident getPotentialDuplicateOf() { return potentialDuplicateOf; }
    public String getResolution() { return resolution; }
    public boolean isAwaitingReporterInfo() { return awaitingReporterInfo; }
    public Integer getFeedbackRating() { return feedbackRating; }
    public String getFeedbackComment() { return feedbackComment; }

    /** Read-only view of the notes: they can only be added through {@link #addNote}. */
    public List<IncidentNote> getNotes() { return Collections.unmodifiableList(notes); }
}
