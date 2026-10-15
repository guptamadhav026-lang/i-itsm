package com.itsm.strategy;

import com.itsm.TestData;
import com.itsm.model.Impact;
import com.itsm.model.Incident;
import com.itsm.model.ItService;
import com.itsm.model.Priority;
import com.itsm.model.Urgency;
import com.itsm.strategy.priority.ItilMatrixPriorityStrategy;
import com.itsm.strategy.priority.PriorityAssessment;
import com.itsm.strategy.priority.WeightedPriorityStrategy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Tests of the Strategy pattern for priority calculation. */
class PriorityStrategyTest {

    private final WeightedPriorityStrategy weighted = new WeightedPriorityStrategy();
    private final ItilMatrixPriorityStrategy itil = new ItilMatrixPriorityStrategy();

    private final ItService payment = TestData.service(1, "Payment Gateway", 5);
    private final ItService laptops = TestData.service(2, "Employee Laptops", 2);

    @Test
    @DisplayName("TC08 Critical impact on a critical service with many users is P1")
    void criticalIsP1() {
        Incident incident = TestData.incident(1, "Payments down", "all payments fail", payment,
                Impact.CRITICAL, Urgency.CRITICAL, 500);
        PriorityAssessment result = weighted.assess(incident);
        assertThat(result.priority()).isEqualTo(Priority.P1);
        assertThat(result.score()).isEqualTo(4 * 4 * 5 * 1.5);
        assertThat(result.explanation()).contains("Payment Gateway");
    }

    @Test
    @DisplayName("TC09 A single user's minor laptop issue is P4")
    void minorIsP4() {
        Incident incident = TestData.incident(1, "Battery", "battery drains", laptops, Impact.LOW, Urgency.LOW, 1);
        assertThat(weighted.assess(incident).priority()).isEqualTo(Priority.P4);
    }

    @Test
    @DisplayName("TC10 Business criticality changes the priority of the same problem")
    void criticalityMatters() {
        Incident onPayment = TestData.incident(1, "Slow", "slow", payment, Impact.MEDIUM, Urgency.HIGH, 10);
        Incident onLaptops = TestData.incident(2, "Slow", "slow", laptops, Impact.MEDIUM, Urgency.HIGH, 10);
        assertThat(weighted.assess(onPayment).priority()).isEqualTo(Priority.P2);   // 2*3*5*1.1 = 33
        assertThat(weighted.assess(onLaptops).priority()).isEqualTo(Priority.P3);   // 2*3*2*1.1 = 13.2
    }

    @Test
    @DisplayName("TC11 ITIL matrix strategy uses impact + urgency only")
    void itilMatrix() {
        Incident high = TestData.incident(1, "x", "x", laptops, Impact.CRITICAL, Urgency.HIGH, 1);
        Incident low = TestData.incident(2, "x", "x", payment, Impact.LOW, Urgency.MEDIUM, 1);
        assertThat(itil.assess(high).priority()).isEqualTo(Priority.P1);   // 4+3 = 7
        assertThat(itil.assess(low).priority()).isEqualTo(Priority.P4);    // 1+2 = 3
    }
}
