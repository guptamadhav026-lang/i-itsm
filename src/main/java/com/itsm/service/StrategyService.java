package com.itsm.service;

import com.itsm.event.IncidentEventType;
import com.itsm.model.AppSetting;
import com.itsm.model.User;
import com.itsm.repository.AppSettingRepository;
import com.itsm.strategy.NamedStrategy;
import com.itsm.strategy.StrategyRegistry;
import com.itsm.strategy.assignment.AssignmentStrategyRegistry;
import com.itsm.strategy.priority.PriorityStrategyRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Switching the active priority and assignment strategy. The choice is saved, so it survives a restart,
 * and every switch is written to the audit trail.
 */
@Service
@Transactional
public class StrategyService {

    private static final Logger log = LoggerFactory.getLogger(StrategyService.class);
    static final String ASSIGNMENT = "assignment-strategy";
    static final String PRIORITY = "priority-strategy";

    private final AssignmentStrategyRegistry assignment;
    private final PriorityStrategyRegistry priority;
    private final AppSettingRepository settings;
    private final AdminAuditTrail audit;

    public StrategyService(AssignmentStrategyRegistry assignment, PriorityStrategyRegistry priority,
                           AppSettingRepository settings, AdminAuditTrail audit) {
        this.assignment = assignment;
        this.priority = priority;
        this.settings = settings;
        this.audit = audit;
    }

    /** At start-up the saved choices replace the defaults from application.properties. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional(readOnly = true)
    public void restoreSavedChoices() {
        restore(ASSIGNMENT, assignment);
        restore(PRIORITY, priority);
    }

    public void selectAssignment(String name, User admin) {
        select(ASSIGNMENT, "Assignment", assignment, name, admin);
    }

    public void selectPriority(String name, User admin) {
        select(PRIORITY, "Priority", priority, name, admin);
    }

    private void select(String key, String label, StrategyRegistry<? extends NamedStrategy> registry, String name,
                        User admin) {
        String before = registry.getActiveName();
        registry.setActive(name);   // throws for an unknown name
        String after = registry.getActiveName();
        if (after.equals(before)) {
            return;
        }
        settings.findById(key).ifPresentOrElse(s -> s.setValue(after), () -> settings.save(new AppSetting(key, after)));
        audit.record(admin, IncidentEventType.STRATEGY_CHANGED, label + " strategy changed from " + before + " to " + after);
    }

    private void restore(String key, StrategyRegistry<? extends NamedStrategy> registry) {
        settings.findById(key).ifPresent(saved -> {
            try {
                registry.setActive(saved.getValue());
            } catch (RuntimeException e) {
                log.warn("Saved {} '{}' no longer exists, keeping {}", key, saved.getValue(), registry.getActiveName());
            }
        });
    }
}
