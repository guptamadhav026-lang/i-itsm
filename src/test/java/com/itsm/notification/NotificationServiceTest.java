package com.itsm.notification;

import com.itsm.exception.NetworkFailureException;
import com.itsm.model.Employee;
import com.itsm.model.NotificationChannelType;
import com.itsm.model.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class NotificationServiceTest {

    /** In-app channel that just remembers who it was asked to notify. */
    private static class RecordingInApp implements NotificationChannel {
        final List<String> delivered = new ArrayList<>();

        @Override
        public NotificationChannelType type() {
            return NotificationChannelType.IN_APP;
        }

        @Override
        public void deliver(User recipient, String subject, String message, Long incidentId) {
            delivered.add(recipient.getUsername() + ": " + subject);
        }
    }

    /** E-mail channel whose mail server is always down. */
    private static class BrokenEmail implements NotificationChannel {
        @Override
        public NotificationChannelType type() {
            return NotificationChannelType.EMAIL;
        }

        @Override
        public void deliver(User recipient, String subject, String message, Long incidentId) {
            throw new NetworkFailureException("Mail server not reachable");
        }
    }

    @Test
    @DisplayName("TC35 Mail server down: the NetworkFailureException is caught and the in-app message still arrives")
    void mailServerDown() {
        RecordingInApp inApp = new RecordingInApp();
        NotificationChannelFactory factory = new NotificationChannelFactory(List.of(inApp, new BrokenEmail()));
        NotificationService service = new NotificationService(factory, null);
        Employee rohan = new Employee("rohan", "hash", "Rohan Mehta", "rohan@itsm.local", "Finance");

        assertThatCode(() -> service.notify(List.of(rohan), "SLA breached", "INC-0003 is late", 3L, true))
                .doesNotThrowAnyException();
        assertThat(inApp.delivered).containsExactly("rohan: SLA breached");
    }
}
