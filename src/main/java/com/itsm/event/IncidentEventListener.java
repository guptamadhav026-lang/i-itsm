package com.itsm.event;

/**
 * OBSERVER PATTERN: anything that wants to react to incident events implements this.
 * The publisher does not know what its listeners do (audit, notifications, ...),
 * so a new reaction can be added later by writing one new class.
 */
public interface IncidentEventListener {

    void onIncidentEvent(IncidentEvent event);
}
