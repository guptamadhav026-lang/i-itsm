package com.itsm.model;

import com.itsm.TestData;
import com.itsm.exception.InvalidInputException;
import com.itsm.exception.InvalidStateTransitionException;
import com.itsm.model.state.IncidentStateFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Tests of the State pattern: the incident lifecycle rules. */
class IncidentLifecycleTest {

    private final Category network = TestData.category(1, "NETWORK", "vpn");
    private final Technician tech = TestData.technician(10, 5, "NETWORK");

    @Test
    @DisplayName("TC01 An incident goes through the whole lifecycle NEW → CLOSED")
    void fullLifecycle() {
        Incident incident = TestData.incident(1, "VPN down");
        assertThat(incident.getStatus()).isEqualTo(IncidentStatus.NEW);

        incident.classify(network);
        incident.assignTo(tech, TestData.NOW);
        incident.acknowledge(TestData.NOW);
        incident.startInvestigation();
        incident.resolve("Restarted the VPN server", TestData.NOW);
        incident.verify(TestData.NOW);
        incident.close(TestData.NOW);

        assertThat(incident.getStatus()).isEqualTo(IncidentStatus.CLOSED);
        assertThat(incident.getClosedAt()).isEqualTo(TestData.NOW);
        assertThat(incident.getResolution()).isEqualTo("Restarted the VPN server");
    }

    @Test
    @DisplayName("TC02 Skipping a step (NEW → RESOLVED) is rejected")
    void cannotSkipStates() {
        Incident incident = TestData.incident(1, "VPN down");
        assertThatThrownBy(() -> incident.resolve("fixed", TestData.NOW))
                .isInstanceOf(InvalidStateTransitionException.class)
                .hasMessageContaining("NEW")
                .hasMessageContaining("RESOLVED");
        assertThat(incident.getStatus()).isEqualTo(IncidentStatus.NEW);
    }

    @Test
    @DisplayName("TC03 A resolved incident can be reopened back to IN_PROGRESS")
    void reopen() {
        Incident incident = TestData.incident(1, "VPN down");
        incident.classify(network);
        incident.assignTo(tech, TestData.NOW);
        incident.acknowledge(TestData.NOW);
        incident.startInvestigation();
        incident.resolve("Restarted", TestData.NOW);

        incident.reopen();

        assertThat(incident.getStatus()).isEqualTo(IncidentStatus.IN_PROGRESS);
        assertThat(incident.getResolvedAt()).isNull();
    }

    @Test
    @DisplayName("TC04 A closed incident accepts no transitions and no notes")
    void closedIsFinal() {
        assertThat(IncidentStateFactory.forStatus(IncidentStatus.CLOSED).allowedTransitions()).isEmpty();
        assertThat(IncidentStateFactory.forStatus(IncidentStatus.CLOSED).acceptsNotes()).isFalse();
    }

    @Test
    @DisplayName("TC05 Resolving requires resolution details; feedback only after resolution")
    void validationRules() {
        Incident incident = TestData.incident(1, "VPN down");
        incident.classify(network);
        incident.assignTo(tech, TestData.NOW);
        incident.acknowledge(TestData.NOW);
        incident.startInvestigation();

        assertThatThrownBy(() -> incident.resolve("  ", TestData.NOW)).isInstanceOf(InvalidInputException.class);
        assertThatThrownBy(() -> incident.giveFeedback(5, "great")).isInstanceOf(InvalidInputException.class);
        assertThatThrownBy(() -> new Incident(" ", "d", null, null, Impact.LOW, Urgency.LOW, 1, TestData.NOW))
                .isInstanceOf(InvalidInputException.class);
    }

    @Test
    @DisplayName("TC06 An info request sets 'awaiting reporter', the answer clears it")
    void infoRequestFlag() {
        Incident incident = TestData.incident(1, "VPN down");
        Employee reporter = TestData.employee(5);
        incident.addNote(tech, NoteType.INFO_REQUEST, "Which OS?", TestData.NOW);
        assertThat(incident.isAwaitingReporterInfo()).isTrue();
        incident.addNote(reporter, NoteType.INFO_RESPONSE, "Windows 11", TestData.NOW);
        assertThat(incident.isAwaitingReporterInfo()).isFalse();
        assertThat(incident.getNotes()).hasSize(2);
    }

    @Test
    @DisplayName("TC07 Each role decides who can view an incident (polymorphism)")
    void roleBasedVisibility() {
        Incident incident = TestData.incident(1, "VPN down");
        Employee reporter = (Employee) incident.getReporter();
        Employee someoneElse = TestData.employee(999);
        Administrator admin = TestData.withId(new Administrator("adm", "h", "Admin", "a@test", false), 50);

        assertThat(reporter.canView(incident)).isTrue();
        assertThat(someoneElse.canView(incident)).isFalse();
        assertThat(tech.canView(incident)).isTrue();
        assertThat(admin.canView(incident)).isTrue();
    }
}
