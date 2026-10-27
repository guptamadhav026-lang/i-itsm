package com.itsm.service;

import com.itsm.event.IncidentEvent;
import com.itsm.event.IncidentEventPublisher;
import com.itsm.event.IncidentEventType;
import com.itsm.exception.DuplicateIncidentException;
import com.itsm.exception.InvalidInputException;
import com.itsm.exception.ResourceNotFoundException;
import com.itsm.exception.TechnicianUnavailableException;
import com.itsm.exception.UnauthorizedOperationException;
import com.itsm.exception.WorkloadExceededException;
import com.itsm.intelligence.CategorySuggestion;
import com.itsm.intelligence.DuplicateDetector;
import com.itsm.intelligence.IncidentCategorizer;
import com.itsm.intelligence.ResolutionSuggester;
import com.itsm.intelligence.SimilarIncident;
import com.itsm.intelligence.SuggestedResolution;
import com.itsm.model.Category;
import com.itsm.model.Impact;
import com.itsm.model.Incident;
import com.itsm.model.IncidentNote;
import com.itsm.model.IncidentStatus;
import com.itsm.model.ItService;
import com.itsm.model.NoteType;
import com.itsm.model.Priority;
import com.itsm.model.Role;
import com.itsm.model.Technician;
import com.itsm.model.Urgency;
import com.itsm.model.User;
import com.itsm.repository.CategoryRepository;
import com.itsm.repository.IncidentRepository;
import com.itsm.repository.ItServiceRepository;
import com.itsm.repository.TechnicianRepository;
import com.itsm.strategy.assignment.AssignmentStrategy;
import com.itsm.strategy.assignment.AssignmentStrategyRegistry;
import com.itsm.strategy.assignment.ScoredTechnician;
import com.itsm.strategy.assignment.SmartAssignmentStrategy;
import com.itsm.strategy.assignment.TechnicianCandidate;
import com.itsm.strategy.priority.PriorityAssessment;
import com.itsm.strategy.priority.PriorityStrategyRegistry;
import com.itsm.web.dto.CreateIncidentRequest;
import com.itsm.web.dto.UpdateIncidentRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * The incident workflow:
 * Report -> Classify -> Prioritize -> Assign -> Investigate -> Resolve -> Verify -> Close.
 *
 * This class coordinates the other pieces (it holds them by composition): strategies decide priority
 * and assignment, the SLA service sets deadlines, the intelligence classes detect duplicates and
 * suggest categories, and every step is announced through the event publisher (Observer) so the
 * audit trail and notifications happen automatically.
 */
@Service
@Transactional
public class IncidentService {

    private final IncidentRepository incidents;
    private final ItServiceRepository services;
    private final CategoryRepository categories;
    private final TechnicianRepository technicians;
    private final PriorityStrategyRegistry priorityStrategies;
    private final AssignmentStrategyRegistry assignmentStrategies;
    private final SmartAssignmentStrategy smartAssignment;
    private final SlaService slaService;
    private final DuplicateDetector duplicateDetector;
    private final IncidentCategorizer categorizer;
    private final ResolutionSuggester resolutionSuggester;
    private final IncidentEventPublisher events;
    private final Clock clock;
    private final Duration duplicateWindow;

    public IncidentService(IncidentRepository incidents, ItServiceRepository services,
                           CategoryRepository categories, TechnicianRepository technicians,
                           PriorityStrategyRegistry priorityStrategies,
                           AssignmentStrategyRegistry assignmentStrategies,
                           SmartAssignmentStrategy smartAssignment, SlaService slaService,
                           DuplicateDetector duplicateDetector, IncidentCategorizer categorizer,
                           ResolutionSuggester resolutionSuggester, IncidentEventPublisher events, Clock clock,
                           @Value("${itsm.duplicates.window-hours:72}") long duplicateWindowHours) {
        this.incidents = incidents;
        this.services = services;
        this.categories = categories;
        this.technicians = technicians;
        this.priorityStrategies = priorityStrategies;
        this.assignmentStrategies = assignmentStrategies;
        this.smartAssignment = smartAssignment;
        this.slaService = slaService;
        this.duplicateDetector = duplicateDetector;
        this.categorizer = categorizer;
        this.resolutionSuggester = resolutionSuggester;
        this.events = events;
        this.clock = clock;
        this.duplicateWindow = Duration.ofHours(duplicateWindowHours);
    }

    // Reporting a new incident (classify, prioritise, start the SLA, assign, notify)

    public Incident create(User reporter, CreateIncidentRequest request) {
        ItService service = services.findById(request.serviceId())
                .filter(ItService::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("IT service " + request.serviceId() + " not found"));
        rejectRepeatedReport(reporter, service, request.title());

        // 1. Create
        Incident incident = incidents.save(new Incident(request.title(), request.description(), reporter, service,
                request.impact(), request.urgency(), request.affectedUsers(), now()));
        publish(IncidentEventType.CREATED, incident, reporter.getUsername(), null,
                "Reported by " + reporter.getFullName() + ": " + incident.getTitle());

        // 2-3. Classify (chosen category, or automatic suggestion from the text)
        classify(incident, request.categoryId());

        // 4-5. Prioritize using the active priority strategy
        PriorityAssessment assessment = priorityStrategies.getActive().assess(incident);
        incident.applyPriority(assessment.priority(), assessment.score(), assessment.explanation());
        publish(IncidentEventType.PRIORITY_CALCULATED, incident, IncidentEvent.SYSTEM, incident.getStatus(),
                "Priority " + assessment.priority() + ": " + assessment.explanation());

        // 6. Determine the applicable SLA
        slaService.applyDeadlines(incident);

        // 7-9. Pick a technician and assign (notifications follow automatically from the event)
        tryAutoAssign(incident, IncidentEvent.SYSTEM, true);

        // Intelligent feature: is this the same problem as an open incident? (after assignment, so the
        // technician who now owns it is told too)
        detectDuplicates(incident);
        return incident;
    }

    /** The same person reporting the same title on the same service while it is still open is a double submit. */
    private void rejectRepeatedReport(User reporter, ItService service, String title) {
        String key = normalizeTitle(title);
        incidents.findByReporterOrderByCreatedAtDesc(reporter).stream()
                .filter(Incident::isUnresolved)
                .filter(existing -> existing.getService().getId().equals(service.getId()))
                .filter(existing -> normalizeTitle(existing.getTitle()).equals(key))
                .findFirst()
                .ifPresent(existing -> {
                    throw new DuplicateIncidentException(existing.getReference());
                });
    }

    private static String normalizeTitle(String title) {
        return title == null ? "" : title.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private void classify(Incident incident, Long categoryId) {
        Category category;
        String how;
        if (categoryId != null) {
            category = categories.findById(categoryId).filter(Category::isActive)
                    .orElseThrow(() -> new ResourceNotFoundException("Category " + categoryId + " not found"));
            how = "chosen by the reporter";
        } else {
            Optional<CategorySuggestion> suggestion = categorizer.categorize(
                    incident.getTitle() + " " + incident.getDescription(), categories.findByActiveTrueOrderByNameAsc());
            if (suggestion.isPresent()) {
                category = categories.getReferenceById(suggestion.get().categoryId());
                how = suggestion.get().fromAi() ? "chosen by " + suggestion.get().source()
                        : "found the words " + String.join(", ", suggestion.get().matchedKeywords());
            } else {
                category = categories.findByNameIgnoreCase("GENERAL")
                        .orElseThrow(() -> new InvalidInputException("Please choose a category for this incident"));
                how = "no keywords matched";
            }
        }
        IncidentStatus before = incident.getStatus();
        incident.classify(category);
        publish(IncidentEventType.CLASSIFIED, incident, IncidentEvent.SYSTEM, before,
                "Category " + category.getName() + " (" + how + ")");
    }

    private void detectDuplicates(Incident incident) {
        List<Incident> recentOpen = incidents.findByStatusInAndCreatedAtAfter(
                IncidentStatus.UNRESOLVED, now().minus(duplicateWindow));
        List<SimilarIncident> similar = duplicateDetector.findSimilar(incident, recentOpen);
        if (!similar.isEmpty()) {
            SimilarIncident best = similar.get(0);
            incident.markPotentialDuplicateOf(incidents.getReferenceById(best.incidentId()));
            publish(IncidentEventType.DUPLICATE_DETECTED, incident, IncidentEvent.SYSTEM, incident.getStatus(),
                    "Looks like " + best.reference() + " \"" + best.title() + "\" ("
                            + Math.round(best.score() * 100) + "% similar)");
        }
    }

    /**
     * Uses the active assignment strategy. Leaves the incident CLASSIFIED if nobody fits; with reportFailure the
     * audit trail and the administrators are told why. Waiting incidents are tried again every minute.
     */
    private boolean tryAutoAssign(Incident incident, String actor, boolean reportFailure) {
        AssignmentStrategy strategy = assignmentStrategies.getActive();
        List<TechnicianCandidate> candidates = candidatesFor(incident);
        Optional<Technician> chosen = strategy.selectTechnician(incident, candidates);
        if (chosen.isEmpty()) {
            if (reportFailure) {
                String reason = candidates.isEmpty() ? "every technician is busy, away or at their limit"
                        : strategy.noMatchReason(incident);
                publish(IncidentEventType.ASSIGNMENT_FAILED, incident, IncidentEvent.SYSTEM, incident.getStatus(),
                        "No technician assigned: " + reason + ". It is tried again every minute, "
                                + "or an administrator can assign it.");
            }
            return false;
        }
        IncidentStatus before = incident.getStatus();
        incident.assignTo(chosen.get(), now());
        publish(IncidentEventType.ASSIGNED, incident, actor, before, "Assigned to " + chosen.get().getFullName()
                + " by the " + strategy.name().toLowerCase(Locale.ROOT).replace('_', ' ') + " strategy");
        return true;
    }

    /** Incidents still waiting for a technician get another try (someone may have become free). Run every minute. */
    public int assignWaitingIncidents() {
        int assigned = 0;
        for (Incident incident : incidents.findByStatusIn(List.of(IncidentStatus.CLASSIFIED))) {
            if (tryAutoAssign(incident, IncidentEvent.SYSTEM, false)) {
                assigned++;
            }
        }
        return assigned;
    }

    /** Technicians who can take more work right now, with the numbers the strategies need. */
    List<TechnicianCandidate> candidatesFor(Incident incident) {
        return technicians.findByActiveTrueAndAvailableTrue().stream()
                .map(t -> new TechnicianCandidate(t,
                        incidents.countByAssignedTechnicianAndStatusIn(t, IncidentStatus.ACTIVE_WORK),
                        incidents.countResolvedByTechnicianForService(t, incident.getService().getId())))
                .filter(c -> c.activeIncidents() < c.technician().getMaxActiveIncidents())
                .toList();
    }

    // Reading incidents

    @Transactional(readOnly = true)
    public Incident getVisible(Long id, User user) {
        Incident incident = find(id);
        if (!user.canView(incident)) {   // polymorphic: each role has its own rule
            throw new UnauthorizedOperationException("You are not allowed to view " + incident.getReference());
        }
        return incident;
    }

    /** "My incidents": what each role normally works with. */
    @Transactional(readOnly = true)
    public List<Incident> listFor(User user) {
        return switch (user.getRole()) {
            case EMPLOYEE -> incidents.findByReporterOrderByCreatedAtDesc(user);
            case TECHNICIAN -> incidents.findByAssignedTechnicianOrderByCreatedAtDesc((Technician) user);
            case ADMIN -> incidents.findAll().stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt())).toList();
        };
    }

    // Assignment

    public Incident assign(Long id, Long technicianId, User admin) {
        Incident incident = find(id);
        Technician technician = technicians.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("Technician " + technicianId + " not found"));
        if (technician.isAssignedTo(incident) && IncidentStatus.ACTIVE_WORK.contains(incident.getStatus())) {
            throw new InvalidInputException(incident.getReference() + " is already assigned to "
                    + technician.getFullName());
        }
        if (!technician.isActive() || !technician.isAvailable()) {
            throw new TechnicianUnavailableException(technician.getFullName() + " is not available right now");
        }
        long active = incidents.countByAssignedTechnicianAndStatusIn(technician, IncidentStatus.ACTIVE_WORK);
        if (active >= technician.getMaxActiveIncidents()) {
            throw new WorkloadExceededException(technician.getFullName() + " already has " + active
                    + " active incidents (limit " + technician.getMaxActiveIncidents() + ")");
        }
        IncidentStatus before = incident.getStatus();
        incident.assignTo(technician, now());
        publish(IncidentEventType.ASSIGNED, incident, admin.getUsername(), before,
                "Assigned to " + technician.getFullName() + " by " + admin.getFullName());
        return incident;
    }

    public Incident autoAssign(Long id, User admin) {
        Incident incident = find(id);
        if (!tryAutoAssign(incident, admin.getUsername(), false)) {
            throw new TechnicianUnavailableException("No technician is currently available for "
                    + incident.getReference());
        }
        return incident;
    }

    // Technician actions

    public Incident acknowledge(Long id, User user) {
        Incident incident = find(id);
        requireAssignedTechnicianOrAdmin(incident, user);
        IncidentStatus before = incident.getStatus();
        incident.acknowledge(now());
        publish(IncidentEventType.ACKNOWLEDGED, incident, user.getUsername(), before,
                "Acknowledged by " + user.getFullName());
        if (!incident.isResponseBreached() && incident.getAcknowledgedAt().isAfter(incident.getResponseDeadline())) {
            incident.markResponseBreached();
            publish(IncidentEventType.SLA_VIOLATED, incident, IncidentEvent.SYSTEM, incident.getStatus(),
                    "Acknowledged after the deadline (" + TimeText.of(incident.getResponseDeadline(), clock)
                            + "), so the response SLA was missed");
        }
        return incident;
    }

    public Incident startInvestigation(Long id, User user) {
        Incident incident = find(id);
        requireAssignedTechnicianOrAdmin(incident, user);
        IncidentStatus before = incident.getStatus();
        incident.startInvestigation();
        publish(IncidentEventType.INVESTIGATION_STARTED, incident, user.getUsername(), before,
                "Investigation started by " + user.getFullName());
        return incident;
    }

    public Incident addInvestigationNote(Long id, User user, String text) {
        Incident incident = find(id);
        requireAssignedTechnicianOrAdmin(incident, user);
        return addNote(incident, user, NoteType.INVESTIGATION, text, IncidentEventType.NOTE_ADDED);
    }

    public Incident requestInformation(Long id, User user, String question) {
        Incident incident = find(id);
        requireAssignedTechnicianOrAdmin(incident, user);
        return addNote(incident, user, NoteType.INFO_REQUEST, question, IncidentEventType.INFO_REQUESTED);
    }

    public Incident resolve(Long id, User user, String resolution) {
        Incident incident = find(id);
        requireAssignedTechnicianOrAdmin(incident, user);
        IncidentStatus before = incident.getStatus();
        incident.resolve(resolution, now());
        publish(IncidentEventType.RESOLVED, incident, user.getUsername(), before,
                "Resolved by " + user.getFullName() + ": " + incident.getResolution());
        if (!incident.isResolutionBreached() && incident.getResolvedAt().isAfter(incident.getResolutionDeadline())) {
            incident.markResolutionBreached();
            publish(IncidentEventType.SLA_VIOLATED, incident, IncidentEvent.SYSTEM, incident.getStatus(),
                    "Resolved after the deadline (" + TimeText.of(incident.getResolutionDeadline(), clock)
                            + "), so the resolution SLA was missed");
        }
        return incident;
    }

    /** Admin or assigned technician changes impact/urgency; priority and SLA are recalculated. */
    public Incident reassess(Long id, User user, Impact impact, Urgency urgency,
                             int affectedUsers) {
        Incident incident = find(id);
        requireAssignedTechnicianOrAdmin(incident, user);
        String before = describeAssessment(incident.getImpact(), incident.getUrgency(), incident.getAffectedUsers());
        incident.reassess(impact, urgency, affectedUsers);
        String after = describeAssessment(impact, urgency, affectedUsers);
        recalculatePriority(incident, user, "Re-assessed by " + user.getFullName() + " (" + before + " to " + after + ")",
                false);
        return incident;
    }

    /**
     * Corrects an incident. The reporter may change the title and description until a technician acknowledges it
     * (the State object decides, see IncidentState.isEditable). The assigned technician or an administrator may
     * change everything, including the category (re-classification) and the service, until it is resolved.
     */
    public Incident update(Long id, User user, UpdateIncidentRequest request) {
        Incident incident = find(id);
        boolean staff = user.getRole() == Role.ADMIN
                || (user instanceof Technician technician && technician.isAssignedTo(incident));
        if (!staff) {
            requireReporterOrAdmin(incident, user);
            if (!incident.currentState().isEditable()) {
                throw new InvalidInputException("A technician is already working on " + incident.getReference()
                        + ", so add a comment instead of editing it");
            }
            if (request.categoryId() != null || request.serviceId() != null) {
                throw new UnauthorizedOperationException("Only the technician or an administrator can change the "
                        + "category or service of " + incident.getReference());
            }
        }

        List<String> changes = new ArrayList<>();
        if (request.title() != null && !request.title().trim().equals(incident.getTitle())) {
            changes.add("title");
        }
        if (request.description() != null && !request.description().trim().equals(incident.getDescription())) {
            changes.add("description");
        }
        incident.updateDetails(request.title(), request.description());

        if (request.categoryId() != null && !request.categoryId().equals(idOf(incident.getCategory()))) {
            Category category = categories.findById(request.categoryId()).filter(Category::isActive)
                    .orElseThrow(() -> new ResourceNotFoundException("Category " + request.categoryId() + " not found"));
            changes.add("category " + nameOf(incident.getCategory()) + " to " + category.getName());
            incident.changeCategory(category);
        }
        boolean serviceChanged = false;
        if (request.serviceId() != null && !request.serviceId().equals(incident.getService().getId())) {
            ItService service = services.findById(request.serviceId()).filter(ItService::isActive)
                    .orElseThrow(() -> new ResourceNotFoundException("IT service " + request.serviceId() + " not found"));
            changes.add("service " + incident.getService().getName() + " to " + service.getName());
            incident.changeService(service);
            serviceChanged = true;
        }
        if (changes.isEmpty()) {
            return incident;
        }
        publish(IncidentEventType.DETAILS_CHANGED, incident, user.getUsername(), incident.getStatus(),
                "Changed by " + user.getFullName() + ": " + String.join(", ", changes));
        if (serviceChanged) {
            // the business criticality and the service's own SLA targets may differ
            recalculatePriority(incident, user, "Service changed", true);
        }
        return incident;
    }

    /** Runs the active priority strategy again; a new priority (or service) restarts the SLA targets from now. */
    private void recalculatePriority(Incident incident, User user, String reason, boolean serviceChanged) {
        Priority oldPriority = incident.getPriority();
        PriorityAssessment assessment = priorityStrategies.getActive().assess(incident);
        incident.applyPriority(assessment.priority(), assessment.score(), assessment.explanation());
        if (assessment.priority() != oldPriority || serviceChanged) {
            slaService.restartDeadlines(incident, now());
        }
        if (assessment.priority() != oldPriority) {
            publish(IncidentEventType.PRIORITY_CHANGED, incident, user.getUsername(), incident.getStatus(),
                    reason + ": priority changed from " + oldPriority + " to " + assessment.priority() + ". "
                            + assessment.explanation() + ". New targets: respond by "
                            + TimeText.of(incident.getResponseDeadline(), clock) + ", fix by "
                            + TimeText.of(incident.getResolutionDeadline(), clock));
        } else {
            publish(IncidentEventType.REASSESSED, incident, user.getUsername(), incident.getStatus(),
                    reason + ": priority stays " + assessment.priority() + ". " + assessment.explanation());
        }
    }

    private static String describeAssessment(Impact impact, Urgency urgency, int affectedUsers) {
        return "impact " + impact + ", urgency " + urgency + ", " + affectedUsers
                + (affectedUsers == 1 ? " user" : " users");
    }

    private static Long idOf(Category category) {
        return category == null ? null : category.getId();
    }

    private static String nameOf(Category category) {
        return category == null ? "none" : category.getName();
    }

    /** What the active priority strategy would say, for the live preview on the report form. Nothing is saved. */
    @Transactional(readOnly = true)
    public PriorityAssessment previewPriority(Long serviceId, Impact impact, Urgency urgency, int affectedUsers) {
        ItService service = services.findById(serviceId).filter(ItService::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("IT service " + serviceId + " not found"));
        Incident draft = new Incident("Preview", "Preview", null, service, impact, urgency, affectedUsers, now());
        return priorityStrategies.getActive().assess(draft);
    }

    // Reporter actions

    public Incident provideInformation(Long id, User user, String text) {
        Incident incident = find(id);
        requireReporterOrAdmin(incident, user);
        return addNote(incident, user, NoteType.INFO_RESPONSE, text, IncidentEventType.INFO_PROVIDED);
    }

    public Incident comment(Long id, User user, String text) {
        Incident incident = getVisible(id, user);
        return addNote(incident, user, NoteType.COMMENT, text, IncidentEventType.NOTE_ADDED);
    }

    public Incident reopen(Long id, User user, String reason) {
        Incident incident = find(id);
        requireReporterOrAdmin(incident, user);
        IncidentStatus before = incident.getStatus();
        incident.reopen(now());
        incident.addNote(user, NoteType.COMMENT, "Reopened: " + reason, now());
        publish(IncidentEventType.REOPENED, incident, user.getUsername(), before,
                "Reopened by " + user.getFullName() + ": " + reason);
        return incident;
    }

    public Incident verify(Long id, User user) {
        Incident incident = find(id);
        requireReporterOrAdmin(incident, user);
        IncidentStatus before = incident.getStatus();
        incident.verify(now());
        publish(IncidentEventType.VERIFIED, incident, user.getUsername(), before,
                "Fix confirmed by " + user.getFullName());
        return incident;
    }

    public Incident close(Long id, User user) {
        Incident incident = find(id);
        requireReporterOrAdmin(incident, user);
        IncidentStatus before = incident.getStatus();
        incident.close(now());
        publish(IncidentEventType.CLOSED, incident, user.getUsername(), before,
                "Closed by " + user.getFullName());
        return incident;
    }

    public Incident giveFeedback(Long id, User user, int rating, String comment) {
        Incident incident = find(id);
        if (!incident.isReportedBy(user)) {
            throw new UnauthorizedOperationException("Only the reporter can give feedback");
        }
        incident.giveFeedback(rating, comment);
        publish(IncidentEventType.FEEDBACK_GIVEN, incident, user.getUsername(), incident.getStatus(),
                "Feedback " + rating + "/5" + (comment == null || comment.isBlank() ? "" : ": " + comment));
        return incident;
    }

    // Similar incidents, suggestions and recommendations

    @Transactional(readOnly = true)
    public Optional<CategorySuggestion> suggestCategory(String text) {
        return categorizer.suggest(text, categories.findByActiveTrueOrderByNameAsc());
    }

    @Transactional(readOnly = true)
    public List<SimilarIncident> similarIncidents(Long id, User user) {
        Incident incident = getVisible(id, user);
        // only incidents this user may open, so an employee never sees other people's reports
        return duplicateDetector.findSimilar(incident, incidents.findByStatusIn(IncidentStatus.UNRESOLVED).stream()
                .filter(user::canView).toList());
    }

    @Transactional(readOnly = true)
    public List<SuggestedResolution> suggestedResolutions(Long id, User user) {
        Incident incident = getVisible(id, user);
        // only fixes the reporter confirmed (a reopened incident's rejected fix is not offered)
        List<Incident> confirmed = incidents.findByStatusInAndIdNot(
                List.of(IncidentStatus.VERIFIED, IncidentStatus.CLOSED), incident.getId());
        return resolutionSuggester.suggest(incident, confirmed.stream().filter(user::canView).toList());
    }

    @Transactional(readOnly = true)
    public List<ScoredTechnician> recommendTechnicians(Long id) {
        Incident incident = find(id);
        return smartAssignment.rank(incident, candidatesFor(incident));
    }

    // Helpers

    @Transactional(readOnly = true)
    public Incident find(Long id) {
        return incidents.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident " + id + " not found"));
    }

    private Incident addNote(Incident incident, User user, NoteType type, String text, IncidentEventType eventType) {
        IncidentNote note = incident.addNote(user, type, text, now());
        publish(eventType, incident, user.getUsername(), incident.getStatus(),
                type.label() + " from " + user.getFullName() + ": " + note.getText());
        return incident;
    }

    private void requireAssignedTechnicianOrAdmin(Incident incident, User user) {
        boolean allowed = user.getRole() == Role.ADMIN
                || (user instanceof Technician technician && technician.isAssignedTo(incident));
        if (!allowed) {
            throw new UnauthorizedOperationException("Only the assigned technician or an administrator can do this on "
                    + incident.getReference());
        }
    }

    private void requireReporterOrAdmin(Incident incident, User user) {
        if (user.getRole() != Role.ADMIN && !incident.isReportedBy(user)) {
            throw new UnauthorizedOperationException("Only the reporter or an administrator can do this on "
                    + incident.getReference());
        }
    }

    private void publish(IncidentEventType type, Incident incident, String actor, IncidentStatus previous,
                         String description) {
        events.publish(new IncidentEvent(type, incident, actor, previous, incident.getStatus(), description, now()));
    }

    private Instant now() {
        return Instant.now(clock);
    }
}
