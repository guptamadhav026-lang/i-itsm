package com.itsm.strategy;

import com.itsm.TestData;
import com.itsm.model.Incident;
import com.itsm.model.Technician;
import com.itsm.strategy.assignment.LoadBasedAssignmentStrategy;
import com.itsm.strategy.assignment.RoundRobinAssignmentStrategy;
import com.itsm.strategy.assignment.ScoredTechnician;
import com.itsm.strategy.assignment.SkillBasedAssignmentStrategy;
import com.itsm.strategy.assignment.SmartAssignmentStrategy;
import com.itsm.strategy.assignment.TechnicianCandidate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Tests of the Strategy pattern for technician assignment. */
class AssignmentStrategyTest {

    private final Technician networkExpert = TestData.technician(1, 8, "NETWORK");
    private final Technician dbExpert = TestData.technician(2, 4, "DATABASE");
    private final Technician junior = TestData.technician(3, 1, "NETWORK");
    private Incident networkIncident;

    @BeforeEach
    void setUp() {
        networkIncident = TestData.incident(1, "VPN down");
        networkIncident.classify(TestData.category(1, "NETWORK", "vpn"));
    }

    @Test
    @DisplayName("TC12 Skill-based picks the least busy technician with the right skill")
    void skillBased() {
        List<TechnicianCandidate> candidates = List.of(
                new TechnicianCandidate(networkExpert, 4, 0),
                new TechnicianCandidate(dbExpert, 0, 0),
                new TechnicianCandidate(junior, 1, 0));
        assertThat(new SkillBasedAssignmentStrategy().selectTechnician(networkIncident, candidates))
                .contains(junior);
    }

    @Test
    @DisplayName("TC13 Load-based picks whoever has the fewest active incidents")
    void loadBased() {
        List<TechnicianCandidate> candidates = List.of(
                new TechnicianCandidate(networkExpert, 3, 0),
                new TechnicianCandidate(dbExpert, 0, 0));
        assertThat(new LoadBasedAssignmentStrategy().selectTechnician(networkIncident, candidates))
                .contains(dbExpert);
    }

    @Test
    @DisplayName("TC14 Round-robin takes turns")
    void roundRobin() {
        RoundRobinAssignmentStrategy strategy = new RoundRobinAssignmentStrategy();
        List<TechnicianCandidate> candidates = List.of(
                new TechnicianCandidate(networkExpert, 0, 0),
                new TechnicianCandidate(dbExpert, 0, 0));
        assertThat(strategy.selectTechnician(networkIncident, candidates)).contains(networkExpert);
        assertThat(strategy.selectTechnician(networkIncident, candidates)).contains(dbExpert);
        assertThat(strategy.selectTechnician(networkIncident, candidates)).contains(networkExpert);
    }

    @Test
    @DisplayName("TC15 Smart strategy ranks by skill, experience, history and workload, with reasons")
    void smart() {
        List<TechnicianCandidate> candidates = List.of(
                new TechnicianCandidate(networkExpert, 1, 3),
                new TechnicianCandidate(dbExpert, 0, 0),
                new TechnicianCandidate(junior, 0, 0));
        List<ScoredTechnician> ranking = new SmartAssignmentStrategy().rank(networkIncident, candidates);
        assertThat(ranking.get(0).technicianId()).isEqualTo(networkExpert.getId());
        assertThat(ranking.get(0).reasons()).contains("skill 40");
        assertThat(ranking.get(ranking.size() - 1).technicianId()).isEqualTo(dbExpert.getId());
    }

    @Test
    @DisplayName("TC16 No candidates means no assignment")
    void empty() {
        assertThat(new SmartAssignmentStrategy().selectTechnician(networkIncident, List.of())).isEmpty();
        assertThat(new SkillBasedAssignmentStrategy().selectTechnician(networkIncident, List.of())).isEmpty();
    }
}
