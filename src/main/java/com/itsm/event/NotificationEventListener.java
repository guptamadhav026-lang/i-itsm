package com.itsm.event;

import com.itsm.model.EscalationLevel;
import com.itsm.model.Incident;
import com.itsm.model.User;
import com.itsm.notification.NotificationService;
import com.itsm.repository.AdministratorRepository;
import com.itsm.repository.TechnicianRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Observer that decides WHO should hear about an event and WHAT the message says,
 * then hands it to the NotificationService (which decides HOW: in-app, e-mail...).
 */
@Component
public class NotificationEventListener implements IncidentEventListener {

    private final NotificationService notificationService;
    private final AdministratorRepository administrators;
    private final TechnicianRepository technicians;

    public NotificationEventListener(NotificationService notificationService,
                                     AdministratorRepository administrators,
                                     TechnicianRepository technicians) {
        this.notificationService = notificationService;
        this.administrators = administrators;
        this.technicians = technicians;
    }

    @Override
    public void onIncidentEvent(IncidentEvent event) {
        Incident incident = event.incident();
        String ref = incident.getReference();
        List<User> recipients = new ArrayList<>();
        String subject;
        boolean important = incident.getPriority() != null && incident.getPriority().isHighPriority();

        switch (event.type()) {
            case PRIORITY_CALCULATED -> {
                // Sent once the priority is known (straight after the report), so P1/P2 reports reach the
                // administrators too, by e-mail as well.
                recipients.add(incident.getReporter());
                if (important) {
                    recipients.addAll(administrators.findByActiveTrue());
                }
                subject = ref + " reported: " + incident.getTitle() + " (" + incident.getPriority() + ")";
            }
            case ASSIGNMENT_FAILED -> {
                recipients.addAll(administrators.findByActiveTrue());
                subject = ref + " has no technician yet";
            }
            case DETAILS_CHANGED -> {
                recipients.add(incident.getReporter());
                recipients.add(incident.getAssignedTechnician());
                subject = ref + " was updated";
            }
            case ASSIGNED -> {
                recipients.add(incident.getAssignedTechnician());
                recipients.add(incident.getReporter());
                subject = ref + " assigned to " + incident.getAssignedTechnician().getFullName();
            }
            case PRIORITY_CHANGED -> {
                recipients.add(incident.getReporter());
                recipients.add(incident.getAssignedTechnician());
                subject = ref + " priority changed to " + incident.getPriority();
            }
            case ACKNOWLEDGED, INVESTIGATION_STARTED, INFO_REQUESTED, RESOLVED -> {
                recipients.add(incident.getReporter());
                subject = ref + subjectFor(event.type());
            }
            case INFO_PROVIDED, REOPENED, FEEDBACK_GIVEN -> {
                recipients.add(incident.getAssignedTechnician());
                subject = ref + subjectFor(event.type());
            }
            case VERIFIED, CLOSED -> {
                recipients.add(incident.getReporter());
                recipients.add(incident.getAssignedTechnician());
                subject = ref + subjectFor(event.type());
            }
            case DUPLICATE_DETECTED -> {
                recipients.addAll(administrators.findByActiveTrue());
                recipients.add(incident.getAssignedTechnician());
                subject = ref + " may be a duplicate";
            }
            case SLA_WARNING, SLA_VIOLATED -> {
                recipients.add(incident.getAssignedTechnician());
                recipients.addAll(administrators.findByActiveTrue());
                subject = ref + (event.type() == IncidentEventType.SLA_WARNING
                        ? " is close to its SLA deadline" : " missed its SLA");
                important = true;
            }
            case ESCALATED -> {
                recipients.addAll(escalationTargets(incident.getEscalationLevel()));
                subject = ref + " escalated to " + incident.getEscalationLevel().getLabel();
                important = true;
            }
            default -> {
                return;   // e.g. CREATED, NOTE_ADDED, REASSESSED: recorded in the audit trail only
            }
        }

        // Nobody needs a notification about something they just did themselves (except their own report).
        if (event.type() != IncidentEventType.PRIORITY_CALCULATED) {
            recipients.removeIf(u -> u != null && u.getUsername().equals(event.actor()));
        }
        notificationService.notify(recipients, subject, event.description(), incident.getId(), important);
    }

    private List<? extends User> escalationTargets(EscalationLevel level) {
        List<? extends User> targets = switch (level) {
            case TEAM_LEAD -> technicians.findByActiveTrueAndTeamLeadTrue();
            case SYSTEM_ADMINISTRATOR -> administrators.findByActiveTrueAndItManager(false);
            case IT_MANAGER -> administrators.findByActiveTrueAndItManager(true);
            case NONE -> List.of();
        };
        return targets.isEmpty() ? administrators.findByActiveTrue() : targets;
    }

    private static String subjectFor(IncidentEventType type) {
        return switch (type) {
            case ACKNOWLEDGED -> " has been picked up by a technician";
            case INVESTIGATION_STARTED -> ": investigation started";
            case INFO_REQUESTED -> ": the technician has a question for you";
            case RESOLVED -> " is resolved, please check the fix";
            case INFO_PROVIDED -> ": the reporter answered your question";
            case REOPENED -> " was reopened by the reporter";
            case FEEDBACK_GIVEN -> ": the reporter left feedback";
            case VERIFIED -> ": the reporter confirmed the fix";
            case CLOSED -> " is closed";
            default -> " " + type.name().toLowerCase().replace('_', ' ');
        };
    }
}
