package com.itsm.live;

import com.itsm.TestData;
import com.itsm.event.IncidentEvent;
import com.itsm.event.IncidentEventType;
import com.itsm.model.Incident;
import com.itsm.model.IncidentStatus;
import com.itsm.model.Role;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;

/** Tests of the third Observer listener: who receives a live update. */
class LiveUpdateTest {

    /** A hub that records what would be sent instead of writing to real browser connections. */
    static class RecordingHub extends LiveUpdateHub {
        final List<LiveUpdate> updates = new ArrayList<>();
        Predicate<Subscriber> filter;

        @Override
        public void broadcast(LiveUpdate update, Predicate<Subscriber> mayReceive) {
            updates.add(update);
            filter = mayReceive;
        }
    }

    private static LiveUpdateHub.Subscriber subscriber(String username, Role role) {
        return new LiveUpdateHub.Subscriber(username, role, new SseEmitter());
    }

    @Test
    @DisplayName("TC32 A live update reaches staff and the reporter, but not other employees")
    void onlyAllowedViewersReceiveUpdates() {
        RecordingHub hub = new RecordingHub();
        LiveUpdateListener listener = new LiveUpdateListener(hub);
        Incident incident = TestData.incident(1, "VPN down");   // reported by employee "emp101"

        listener.onIncidentEvent(new IncidentEvent(IncidentEventType.ACKNOWLEDGED, incident, "tech10",
                IncidentStatus.ASSIGNED, IncidentStatus.ACKNOWLEDGED, "Acknowledged", TestData.NOW));

        assertThat(hub.updates).singleElement().satisfies(update -> {
            assertThat(update.type()).isEqualTo(IncidentEventType.ACKNOWLEDGED);
            assertThat(update.status()).isEqualTo(IncidentStatus.ACKNOWLEDGED);
            assertThat(update.actor()).isEqualTo("tech10");
        });
        assertThat(hub.filter.test(subscriber("emp101", Role.EMPLOYEE))).isTrue();
        assertThat(hub.filter.test(subscriber("emp999", Role.EMPLOYEE))).isFalse();
        assertThat(hub.filter.test(subscriber("tech10", Role.TECHNICIAN))).isTrue();
        assertThat(hub.filter.test(subscriber("kavita", Role.ADMIN))).isTrue();
    }
}
